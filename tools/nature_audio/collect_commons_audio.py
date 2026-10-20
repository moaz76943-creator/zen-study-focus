#!/usr/bin/env python3
"""Quarantined Wikimedia field-audio intake. NEVER installs/enables app media."""
import hashlib
import array
import math
from datetime import datetime, timezone
from html.parser import HTMLParser
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
            "upload.wikimedia.org", "commons.wikimedia.org", "bigsoundbank.com", "freesound.org", "cdn.freesound.org"
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


def rights_blocked(item):
    return any(str(warning).startswith("BLOCKED_RIGHTS:") for warning in item.get("review_warnings", []))


def required_coverage(manifest):
    """Requested app slots and intake files are distinct; never infer readiness."""
    sources = {item["id"]: item for item in manifest["items"] + manifest.get("replacement_candidates", [])}
    result, used, slots = [], set(), set()
    for slot in manifest.get("required_slots", []):
        key, candidate = slot["slot_id"], slot.get("replacement_candidate_id") or slot.get("candidate_id")
        if key in slots or (candidate is not None and (candidate not in sources or candidate in used)):
            raise ValueError("Duplicate slot or reused/unknown original recording")
        slots.add(key)
        if candidate is not None:
            used.add(candidate)
        result.append(dict(slot, selected_candidate_id=candidate, ready=False, status=("BLOCKED" if rights_blocked(sources[candidate]) else "CANDIDATE") if candidate else "MISSING"))
    return result


def requested_sources(manifest):
    coverage = required_coverage(manifest)
    missing = [r["slot_id"] for r in coverage if r["status"] != "CANDIDATE"]
    if len(coverage) != 20 or missing:
        raise ValueError("Requested twenty-recording cohort is incomplete: " + ", ".join(missing))
    sources = {r["id"]: r for r in manifest["items"] + manifest.get("replacement_candidates", [])}
    result = [sources[r["selected_candidate_id"]] for r in coverage]
    if len({r["source_sha256"] for r in result}) != 20:
        raise ValueError("Reused bytes in requested cohort")
    if any(r.get("approved_for_runtime") is not False for r in result):
        raise ValueError("Research selection cannot approve playback")
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
    return (f"[0:a]asetpts=N/SR/TB,asplit=3[body][tail][head];"
            f"[body]atrim=start={fade:g}:end={duration-fade:g},asetpts=PTS-STARTPTS[b];"
            f"[tail]atrim=start={duration-fade:g},asetpts=PTS-STARTPTS[t];"
            f"[head]atrim=end={fade:g},asetpts=PTS-STARTPTS[h];"
            f"[t][h]acrossfade=d={fade:g}:c1=tri:c2=tri[j];"
            f"[b][j]concat=n=2:v=0:a=1,asetpts=N/SR/TB,volume={gain:g}[out]")


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
    try:
        subprocess.run(command, capture_output=True, check=True, timeout=120)
    except subprocess.CalledProcessError as error:
        raise ValueError("Loop conversion failed: " + error.stderr.decode("utf-8", errors="replace")[-4000:]) from error
    measured = analyze_audio(output, quality["channels"], quality["sample_rate"])
    return {"path": "loops/" + ident + ".ogg", "input_sha256": hashlib.sha256(file_path.read_bytes()).hexdigest(),
            "output_sha256": hashlib.sha256(output.read_bytes()).hexdigest(),
            "filter_complex": graph, "codec": "vorbis", "quality": measured,
            "encoder_version": subprocess.check_output(["ffmpeg", "-version"], text=True).splitlines()[0],
            "purpose": "QA_A_B_LISTENING_ONLY", "human_loop_review": "NOT_TESTED", "ready": False}


class PublisherPage(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.canonical = self.description = None
        self.sources, self.license_text, self.technical = [], [], []
        self.meta, self.preview, self.rights_links, self.all_text = {}, [], [], []
        self.heading, self.section = None, None
        self.ignored = 0
    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if tag in ("script", "style"):
            self.ignored += 1
        if tag == "h2":
            self.heading = []
        if tag == "meta" and attrs.get("property"):
            self.meta[attrs["property"]] = attrs.get("content", "")
        if attrs.get("data-sound-id") and attrs.get("data-ogg"):
            self.preview.append((attrs["data-sound-id"], attrs["data-ogg"]))
        if tag == "a" and attrs.get("title") == "Go to the full license text":
            self.rights_links.append(attrs.get("href", ""))
        if tag == "link" and attrs.get("rel") == "canonical":
            self.canonical = attrs.get("href")
        if tag == "meta" and attrs.get("name") == "description":
            self.description = attrs.get("content")
        if tag == "source" and attrs.get("type") == "audio/ogg":
            self.sources.append(attrs.get("src", ""))
    def handle_endtag(self, tag):
        if tag in ("script", "style"):
            self.ignored = max(0, self.ignored - 1)
        if tag == "h2" and self.heading is not None:
            self.section = " ".join(self.heading).strip().casefold()
            self.heading = None
    def handle_data(self, data):
        if self.ignored:
            return
        self.all_text.append(data)
        if self.heading is not None:
            self.heading.append(data)
        elif self.section == "license":
            self.license_text.append(data)
        elif self.section == "technical details":
            self.technical.append(data)


def parse_bigsound_page(text, page_url, source_id):
    match = re.fullmatch(r"https://bigsoundbank\.com/[a-z0-9-]+-s([0-9]{4,})\.html", page_url)
    if not match or int(match.group(1)) != source_id:
        raise ValueError("Invalid first-party record page")
    page = PublisherPage()
    page.feed(text)
    rights = " ".join(" ".join(page.license_text).split())
    if page.canonical != page_url or "CC0 (public domain)" not in rights or re.search(r"CC BY|non.?commercial|all rights reserved", rights, re.I):
        raise ValueError("This exact recording's CC0 declaration is absent or conflicting")
    technical = " ".join(" ".join(page.technical).split())
    author = re.search(r"Author\s*:\s*(.+?)\s+Sound number\s*:\s*([0-9, ]+)", technical)
    if not author or int(author.group(2).replace(",", "").replace(" ", "")) != source_id:
        raise ValueError("Missing actual recording author/number")
    urls = []
    for source in page.sources:
        url = urllib.parse.urljoin(page_url, source)
        parsed = urllib.parse.urlparse(url)
        media = re.fullmatch(r"/UPLOAD/ogg/([0-9]+)\.ogg", parsed.path)
        if (parsed.scheme == "https" and parsed.netloc == "bigsoundbank.com" and media
            and int(media.group(1)) == source_id and parsed.query in ("", "v=d", "v=m") and not parsed.fragment):
            urls.append(url)
    if not urls or not page.description:
        raise ValueError("Publisher page does not bind this exact Ogg file")
    return {"author": author.group(1).strip(), "source_page": page_url,
            "description": page.description, "original_url": urls[0],
            "source_variant": "PUBLISHER_SERVED_OGG_NOT_RECORDER_MASTER",
            "license": "CC0-1.0", "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "publisher_license_url": "https://bigsoundbank.com/licenses.html",
            "declaration": rights, "technical_details": technical,
            "human_listening": "NOT_TESTED", "ready": False}


def parse_freesound_page(text, page_url, author, source_id, description_fragment):
    expected = f"https://freesound.org/people/{author}/sounds/{source_id}/"
    if page_url != expected or not re.fullmatch(r"[A-Za-z0-9_.-]+", author):
        raise ValueError("Untrusted Freesound origin or identity")
    page = PublisherPage()
    page.feed(text)
    allowed = {"http://creativecommons.org/publicdomain/zero/1.0/", "https://creativecommons.org/publicdomain/zero/1.0/"}
    if (page.meta.get("og:url") != expected or page.meta.get("og:audio:artist") != author
        or len(page.rights_links) != 1 or page.rights_links[0] not in allowed):
        raise ValueError("Current recording identity/CC0 licence not independently bound")
    pattern = rf"https://cdn\.freesound\.org/previews/{source_id//1000}/{source_id}_[0-9]+-lq\.ogg"
    previews = {url for ident,url in page.preview if ident == str(source_id) and re.fullmatch(pattern,url)}
    plain = " ".join(" ".join(page.all_text).split())
    if len(previews) != 1 or description_fragment not in plain:
        raise ValueError("Original page does not bind this public Ogg preview and description")
    return {"author":author,"source_page":expected,"original_url":previews.pop(),
            "description":description_fragment,"license":"CC0-1.0",
            "license_url":"https://creativecommons.org/publicdomain/zero/1.0/",
            "source_variant":"OFFICIAL_FULL_LENGTH_OGG_PREVIEW_NOT_RECORDER_MASTER",
            "human_listening":"NOT_TESTED","ready":False}


def bounded_source_bytes(url, maximum=22*1024*1024):
    with OPENER.open(urllib.request.Request(url, headers=HEADERS), timeout=60) as response:
        blob = response.read(maximum + 1)
    if len(blob) > maximum:
        raise ValueError("Source exceeds bounded intake size")
    return blob


def publisher_source_info(record):
    if record.get("license") != "CC0-1.0":
        raise ValueError("Only explicit CC0 publisher recordings are eligible for research")
    page_url = record["license_evidence"]
    # Validate the origin before opening the requested page.
    provider = record.get("source_provider")
    if provider == "bigsoundbank":
        if not re.fullmatch(r"https://bigsoundbank\.com/[a-z0-9-]+-s[0-9]{4,}\.html", page_url):
            raise ValueError("Untrusted publisher page")
        raw = bounded_source_bytes(page_url, 2*1024*1024)
        receipt = parse_bigsound_page(raw.decode("utf-8"), page_url, record["publisher_id"])
    elif provider == "freesound":
        expected = f"https://freesound.org/people/{record['author']}/sounds/{record['publisher_id']}/"
        if page_url != expected or not re.fullmatch(r"[A-Za-z0-9_.-]+",record['author']):
            raise ValueError("Untrusted recording page")
        raw = bounded_source_bytes(page_url, 2*1024*1024)
        receipt = parse_freesound_page(raw.decode("utf-8"),page_url,record["author"],record["publisher_id"],record["source_description"])
    else:
        raise ValueError("Unsupported first-party provider")
    if receipt["author"] != record["author"]:
        raise ValueError("Declared author does not match the actual recording author")
    blob = bounded_source_bytes(receipt["original_url"])
    if not blob.startswith(b"OggS"):
        raise ValueError("Publisher did not serve an Ogg original")
    return {"sha1": hashlib.sha1(blob).hexdigest(), "bytes": len(blob), "api_license": "CC0",
            "metadata": {"LicenseShortName":{"value":"CC0"}, "LicenseUrl":{"value":receipt["license_url"]},
                         "Artist":{"value":receipt["author"]},"ImageDescription":{"value":receipt["description"]},
                         "PublisherEvidence":receipt},
            "source_timestamp": None, "original_url": receipt["original_url"],
            "checked_at": datetime.now(timezone.utc).isoformat(),
            "digest_source":"COMPUTED_FROM_PUBLISHER_BYTES_NOT_PUBLISHED_MASTER_DIGEST",
            "source_page_sha256":hashlib.sha256(raw).hexdigest()}


def source_info(filename, declared_license, record=None):
    """Read independent file metadata. Unpinned discovery bytes can NEVER be shipped."""
    if record and record.get("source_provider") in ("bigsoundbank", "freesound"):
        return publisher_source_info(record)
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
    if sys.argv[1:] == ["--requested"]:
        data["items"] = requested_sources(data)
        output = ROOT / "audio_candidates/requested"
    elif not sys.argv[1:]:
        output = OUT
    else:
        raise ValueError("Unknown intake cohort")
    output.mkdir(parents=True, exist_ok=True)
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
        provider = item.get("source_provider", "commons")
        if provider not in ("commons", "bigsoundbank", "freesound"):
            raise ValueError("Unsupported intake provider")
        source_url = item.get("license_evidence") if provider in ("bigsoundbank", "freesound") else "https://commons.wikimedia.org/wiki/File:" + name
        if item.get("license_evidence") != source_url or not item.get("author"):
            raise ValueError("Missing per-file author / rights evidence")
        if pinned is not None and not SHA1.fullmatch(pinned):
            raise ValueError("Malformed pinned SHA1")
        info = source_info(name, item["license"], item)
        if pinned is None or not SHA1.fullmatch(pinned) or pinned != info["sha1"]:
            raise ValueError("Missing or changed pinned original SHA1 for " + name)
        if rights_blocked(item):
            if (output / name).exists():
                raise ValueError("Blocked rights file must not be present in distributable QA output: " + name)
            reports.append({"id": item["id"], "status": "BLOCKED_RIGHTS", "ready": False,
                            "source_page": source_url, "source_metadata": info["metadata"],
                            "source_checked_at": info["checked_at"], "author": item["author"], "license": item["license"],
                            "pinned_sha256": item["source_sha256"], "original_downloaded": False,
                            "content_warnings": item["review_warnings"], "human_listening": "NOT_TESTED"})
            print("MEDIA_SOURCE_BLOCKED_NOT_DOWNLOADED", item["id"], flush=True)
            continue
        expected_sha256 = item.get("source_sha256")
        if not re.fullmatch(r"[a-f0-9]{64}", expected_sha256 or ""):
            raise ValueError("Missing pinned original SHA256 for " + name)
        url = info["original_url"] if provider in ("bigsoundbank", "freesound") else "https://commons.wikimedia.org/wiki/Special:Redirect/file/" + urllib.parse.quote(name)
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
        file_path = output / name
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
            "digest_source": info.get("digest_source", "PUBLISHED_COMMONS_SHA1"),
            "source_provider": provider,
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
        print("MEDIA_QUALITY_RECEIPT", json.dumps({"id":item["id"],"source_sha256":expected_sha256,
            "output_sha256":loop["output_sha256"],"sample_rate":metrics["sample_rate"],"channels":metrics["channels"],
            "duration_seconds":duration,"original_quality":metrics,"loop_quality":loop["quality"],
            "ready":False,"human_loop_review":"NOT_TESTED"}),flush=True)
    (output / "qa_report.json").write_text(json.dumps(reports, indent=2), encoding="utf-8")
    (output / "required_coverage.json").write_text(json.dumps(coverage, ensure_ascii=False, indent=2), encoding="utf-8")
    print("REQUIRED_SLOT_COVERAGE", json.dumps({status: sum(r["status"] == status for r in coverage)
                                              for status in ("AVAILABLE", "CANDIDATE", "BLOCKED", "MISSING")}))
    print(json.dumps([{k: row[k] for k in ("id","original_sha1","original_sha256","status")}
                      for row in reports if row["status"] == "QUARANTINED_NOT_APPROVED"], indent=2))

if __name__ == "__main__":
    try:
        run()
    except Exception as err:
        print("MEDIA_INTAKE_BLOCKED:", err, file=sys.stderr)
        sys.exit(1)
