#!/usr/bin/env python3
"""Quarantined Wikimedia field-audio intake. NEVER installs/enables app media."""
import hashlib
import array
import math
from datetime import datetime, timezone
import json
import pathlib
import re
import subprocess
import sys
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "tools/nature_audio/commons_intake.json"
OUT = ROOT / "audio_candidates/commons_intake"  # CI artifact only, never APK assets
SAFE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9 _()\'-]*\.ogg$")
SHA1 = re.compile(r"^[a-f0-9]{40}$")

class RestrictedRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        parsed = urllib.parse.urlparse(newurl)
        if parsed.scheme != "https" or parsed.hostname not in {
            "upload.wikimedia.org", "commons.wikimedia.org"
        }:
            raise ValueError("Untrusted media redirect")
        return super().redirect_request(req, fp, code, msg, headers, newurl)

OPENER = urllib.request.build_opener(RestrictedRedirect)
HEADERS = {"User-Agent": "DeepFocus-nature-audio-review/1.1 (https://github.com/moaz76943-creator/zen-study-focus)"}

def validate_license(declared_license, metadata):
    """Allow only explicit unrestricted declarations; a substring is not evidence."""
    raw = metadata.get("LicenseShortName", {}).get("value", "")
    accepted = {
        "CC0-1.0": {"cc0", "cc0 1.0", "cc0 1.0 universal", "cc-zero"},
        "PD-author": {"public domain", "pd-author"},
    }
    if not isinstance(raw, str) or raw.strip().casefold() not in accepted.get(declared_license, set()):
        raise ValueError("Unsupported or conflicting original license declaration: " + str(raw))
    return raw


def required_coverage(manifest):
    """Requested app slots and intake files are distinct; never infer readiness."""
    sources = {item["id"] for item in manifest["items"]}
    result, used, slots = [], set(), set()
    for slot in manifest.get("required_slots", []):
        key, candidate = slot["slot_id"], slot.get("candidate_id")
        if key in slots or (candidate is not None and (candidate not in sources or candidate in used)):
            raise ValueError("Duplicate slot or reused/unknown original recording")
        slots.add(key)
        if candidate is not None:
            used.add(candidate)
        result.append(dict(slot, ready=False, status="CANDIDATE" if candidate else "MISSING"))
    return result


def pcm_metrics(chunks, channels, sample_rate):
    """Bounded full decoded PCM metrics. No listening/loop approval is inferred."""
    if channels not in (1, 2) or sample_rate <= 0:
        raise ValueError("Unsupported PCM layout")
    digest = hashlib.sha256()
    peak = total_sq = 0.0
    totals = [0.0] * channels
    first = last = None
    frames = clipped = silent = 0
    frame_bytes = channels * 4
    pending = b""
    for chunk in chunks:
        digest.update(chunk)
        pending += chunk
        count = len(pending) // frame_bytes * frame_bytes
        samples = array.array("f")
        samples.frombytes(pending[:count])
        if sys.byteorder != "little":
            samples.byteswap()
        pending = pending[count:]
        for start in range(0, len(samples), channels):
            frame = samples[start:start+channels]
            if not all(math.isfinite(value) for value in frame):
                raise ValueError("Non-finite decoded audio")
            if first is None:
                first = list(frame)
            last = list(frame)
            frames += 1
            silent += all(abs(value) < 0.00001 for value in frame)
            for channel, value in enumerate(frame):
                totals[channel] += value
                peak = max(peak, abs(value))
                total_sq += value * value
                clipped += abs(value) >= 0.999
    if pending or not frames:
        raise ValueError("Partial or empty PCM frames")
    rms = math.sqrt(total_sq / (frames * channels))
    return {"pcm_sha256": digest.hexdigest(), "frames": frames,
            "duration_seconds": frames / sample_rate, "sample_rate": sample_rate,
            "channels": channels, "peak_linear": peak,
            "rms_dbfs": 20 * math.log10(rms) if rms else None,
            "dc_offset": [value / frames for value in totals],
            "clipped_samples": clipped, "silent_frames": silent,
            "boundary_jump_peak": max(abs(a-b) for a,b in zip(first,last)),
            "perceptual_loop_review": "NOT_TESTED"}


def analyze_audio(file_path, channels, sample_rate):
    # Fixed PCM output makes exact re-encodes with identical decoded samples
    # detectable too; it is not a perceptual fingerprint for all near-duplicates.
    import tempfile
    with tempfile.TemporaryFile() as output:
        subprocess.run(["ffmpeg", "-v", "error", "-xerror", "-i", str(file_path),
                        "-map", "0:a:0", "-f", "f32le", "-acodec", "pcm_f32le", "-"],
                       stdout=output, stderr=subprocess.PIPE, check=True, timeout=90)
        output.seek(0)
        return pcm_metrics(iter(lambda: output.read(256 * 1024), b""), channels, sample_rate)


def loop_filter(duration, fade, gain):
    if not all(math.isfinite(v) for v in (duration, fade, gain)) or not (0 < fade <= 2 and duration > fade * 3 and 0 < gain <= 1):
        raise ValueError("Unsafe loop processing parameters")
    # Body then a linear crossfade of tail into head: the endpoint joins the
    # original body at fade seconds. No silence insertion or generated source.
    return (f"[0:a]asplit=3[body][tail][head];"
            f"[body]atrim=start={fade:g}:end={duration-fade:g},asetpts=PTS-STARTPTS[b];"
            f"[tail]atrim=start={duration-fade:g},asetpts=PTS-STARTPTS[t];"
            f"[head]atrim=end={fade:g},asetpts=PTS-STARTPTS[h];"
            f"[t][h]acrossfade=d={fade:g}:c1=tri:c2=tri[j];"
            f"[b][j]concat=n=2:v=0:a=1,volume={gain:g}[out]")


def prepare_loop(file_path, ident, duration, quality):
    if not re.fullmatch(r"[a-z][a-z0-9_]*", ident):
        raise ValueError("Unsafe loop identifier")
    directory = file_path.parent / "loops"
    directory.mkdir(exist_ok=True)
    output = directory / (ident + ".ogg")
    gain = min(1, 0.7 / quality["peak_linear"]) if quality["peak_linear"] else 1
    graph = loop_filter(duration, 1, gain)
    command = ["ffmpeg", "-v", "error", "-xerror", "-y", "-i", str(file_path),
               "-filter_complex", graph, "-map", "[out]", "-map_metadata", "-1",
               "-c:a", "libvorbis", "-q:a", "5", str(output)]
    subprocess.run(command, capture_output=True, check=True, timeout=120)
    measured = analyze_audio(output, quality["channels"], quality["sample_rate"])
    return {"path": "loops/" + ident + ".ogg", "input_sha256": hashlib.sha256(file_path.read_bytes()).hexdigest(),
            "output_sha256": hashlib.sha256(output.read_bytes()).hexdigest(),
            "filter_complex": graph, "codec": "vorbis", "quality": measured,
            "encoder_version": subprocess.check_output(["ffmpeg", "-version"], text=True).splitlines()[0],
            "purpose": "QA_A_B_LISTENING_ONLY", "human_loop_review": "NOT_TESTED", "ready": False}


def source_info(filename, declared_license):
    """Read independent file metadata. Unpinned discovery bytes can NEVER be shipped."""
    params = urllib.parse.urlencode({
        "action": "query", "format": "json", "formatversion": 2,
        "prop": "imageinfo", "iiprop": "sha1|size|extmetadata|timestamp|url",
        "titles": "File:" + filename
    })
    req = urllib.request.Request("https://commons.wikimedia.org/w/api.php?" + params, headers=HEADERS)
    with OPENER.open(req, timeout=40) as response:
        doc = json.load(response)
    pages = doc.get("query", {}).get("pages", [])
    if len(pages) != 1 or "imageinfo" not in pages[0]:
        raise ValueError("No original Wikimedia imageinfo for " + filename)
    info = pages[0]["imageinfo"][0]
    sha1 = info.get("sha1", "").lower()
    if not SHA1.fullmatch(sha1):
        raise ValueError("Missing Wikimedia original SHA1")
    metadata = info.get("extmetadata", {})
    raw_license = validate_license(declared_license, metadata)
    return {"sha1": sha1, "bytes": int(info.get("size", 0)), "api_license": raw_license,
            "metadata": metadata, "source_timestamp": info.get("timestamp"),
            "original_url": info.get("url"),
            "checked_at": datetime.now(timezone.utc).isoformat()}


def verify_original_bytes(blob, original_sha1, original_sha256):
    if not SHA1.fullmatch(original_sha1 or "") or not re.fullmatch(r"[a-f0-9]{64}", original_sha256 or ""):
        raise ValueError("Original SHA1 and SHA256 must both be pinned")
    if hashlib.sha1(blob).hexdigest() != original_sha1:
        raise ValueError("Original SHA1 mismatch")
    if hashlib.sha256(blob).hexdigest() != original_sha256:
        raise ValueError("Original SHA256 mismatch")
    return True


def run():
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    if data.get("status") != "RESEARCH_AND_QUARANTINE_ONLY":
        raise ValueError("Release approval is forbidden in intake")
    OUT.mkdir(parents=True, exist_ok=True)
    reports, names, ids, pcm_hashes = [], set(), set(), set()
    coverage = required_coverage(data)
    for item in data["items"]:
        name, pinned = item["file"], item.get("source_sha1")
        if not SAFE.fullmatch(name) or name in names or item["id"] in ids:
            raise ValueError("Invalid or duplicate original source")
        names.add(name)
        ids.add(item["id"])
        if item.get("approved_for_runtime") is not False or item.get("status") != "QUARANTINED_NOT_APPROVED":
            raise ValueError("Intake must never enable playback")
        source_url = "https://commons.wikimedia.org/wiki/File:" + name
        if item.get("license_evidence") != source_url or not item.get("author"):
            raise ValueError("Missing per-file author / rights evidence")
        if pinned is not None and not SHA1.fullmatch(pinned):
            raise ValueError("Malformed pinned SHA1")
        info = source_info(name, item["license"])
        if pinned is None or not SHA1.fullmatch(pinned) or pinned != info["sha1"]:
            raise ValueError("Missing or changed pinned original SHA1 for " + name)
        expected_sha256 = item.get("source_sha256")
        if not re.fullmatch(r"[a-f0-9]{64}", expected_sha256 or ""):
            raise ValueError("Missing pinned original SHA256 for " + name)
        url = "https://commons.wikimedia.org/wiki/Special:Redirect/file/" + urllib.parse.quote(name)
        with OPENER.open(urllib.request.Request(url, headers=HEADERS), timeout=60) as response:
            data_chunks, size = [], 0
            while True:
                chunk = response.read(256 * 1024)
                if not chunk:
                    break
                size += len(chunk)
                if size > 22 * 1024 * 1024:
                    raise ValueError("Original exceeds 22 MiB candidate limit: " + name)
                data_chunks.append(chunk)
        sound = b"".join(data_chunks)
        if size != info["bytes"] or not sound.startswith(b"OggS") or size < 10000:
            raise ValueError("Download is not original Ogg or size mismatch for " + name)
        verify_original_bytes(sound, pinned, expected_sha256)
        sha1 = pinned
        file_path = OUT / name
        file_path.write_bytes(sound)
        probe = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
            "stream=codec_name,sample_rate,channels:format=duration:format_tags:stream_tags",
            "-of", "json", str(file_path)], capture_output=True, text=True, timeout=25, check=True)
        parsed = json.loads(probe.stdout)
        if not any(s.get("codec_name") == "vorbis" for s in parsed.get("streams", [])):
            raise ValueError("WebView-compatible Vorbis candidate required " + name)
        duration = float(parsed.get("format", {}).get("duration", 0))
        minimum_duration = 12 if item["id"]=="forest_wrens" else 15
        if not (minimum_duration <= duration <= 900):
            raise ValueError("Candidate must be 15-900 seconds " + name)
        subprocess.run(["ffmpeg", "-v", "error", "-xerror", "-i",
            str(file_path), "-f", "null", "-"], capture_output=True,
            check=True, timeout=90)
        stream = next(s for s in parsed["streams"] if s.get("codec_name") == "vorbis")
        metrics = analyze_audio(file_path, int(stream["channels"]), int(stream["sample_rate"]))
        if metrics["pcm_sha256"] in pcm_hashes:
            raise ValueError("Duplicate decoded recording: " + name)
        pcm_hashes.add(metrics["pcm_sha256"])
        loop = prepare_loop(file_path, item["id"], duration, metrics)
        reports.append({
            "id": item["id"], "source_page": source_url, "author": item["author"],
            "license": item["license"], "api_license": info["api_license"],
            "original_sha1": sha1, "original_sha256": hashlib.sha256(sound).hexdigest(),
            "pinned_sha1": pinned, "bytes": size,
            "duration_seconds": duration, "codec": "vorbis",
            "status": "QUARANTINED_NOT_APPROVED",
            "android_decode": "NOT_TESTED", "human_listening": "NOT_TESTED",
            "rights_page_manually_reviewed": "NOT_TESTED",
            "source_checked_at": info["checked_at"], "source_upload_timestamp": info["source_timestamp"],
            "original_url": info["original_url"], "source_metadata": info["metadata"],
            "embedded_metadata": {"format": parsed.get("format", {}).get("tags", {}),
                                  "streams": [s.get("tags", {}) for s in parsed["streams"]]},
            "license_url": info["metadata"].get("LicenseUrl", {}).get("value", ""),
            "commercial_and_redistribution": "ALLOWED_BY_DECLARED_CC0_OR_PD_NOT_RIGHTS_SIGNOFF",
            "attribution": "Original recording by " + item["author"] + "; " + source_url,
            "quality": metrics, "output_sha256": hashlib.sha256(sound).hexdigest(),
            "conversion": "NONE_ORIGINAL_BYTES", "ready": False,
            "content_warnings": item.get("review_warnings", []), "loop_derivative": loop
        })
        print("MEDIA_SOURCE_OK:", item["id"], sha1, "pinned" if pinned else "unpinned", flush=True)
    (OUT / "qa_report.json").write_text(json.dumps(reports, indent=2), encoding="utf-8")
    (OUT / "required_coverage.json").write_text(json.dumps(coverage, ensure_ascii=False, indent=2), encoding="utf-8")
    print("REQUIRED_SLOT_COVERAGE", json.dumps({status: sum(r["status"] == status for r in coverage)
                                              for status in ("AVAILABLE", "CANDIDATE", "MISSING")}))
    print(json.dumps([{k: row[k] for k in ("id","original_sha1","original_sha256","status")}
                      for row in reports], indent=2))

if __name__ == "__main__":
    try:
        run()
    except Exception as err:
        print("MEDIA_INTAKE_BLOCKED:", err, file=sys.stderr)
        sys.exit(1)
