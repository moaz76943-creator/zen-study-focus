#!/usr/bin/env python3
"""Quarantined Wikimedia field-audio intake. NEVER installs/enables app media."""
import hashlib
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

def source_info(filename, declared_license):
    """Read independent file metadata. Unpinned discovery bytes can NEVER be shipped."""
    params = urllib.parse.urlencode({
        "action": "query", "format": "json", "formatversion": 2,
        "prop": "imageinfo", "iiprop": "sha1|size|extmetadata",
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
    raw_license = metadata.get("LicenseShortName", {}).get("value", "")
    if declared_license == "CC0-1.0" and not re.search(r"CC0|CC-Zero", raw_license, re.I):
        raise ValueError("Original CC0 rights not confirmed by Commons API: " + raw_license)
    if declared_license == "PD-author" and not re.search(r"public domain|PD-author", raw_license, re.I):
        raise ValueError("Original public-domain rights not confirmed by Commons API: " + raw_license)
    return {"sha1": sha1, "bytes": int(info.get("size", 0)), "api_license": raw_license}

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
    reports, names, ids = [], set(), set()
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
            "stream=codec_name,sample_rate,channels:format=duration",
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
        reports.append({
            "id": item["id"], "source_page": source_url, "author": item["author"],
            "license": item["license"], "api_license": info["api_license"],
            "original_sha1": sha1, "original_sha256": hashlib.sha256(sound).hexdigest(),
            "pinned_sha1": pinned, "bytes": size,
            "duration_seconds": duration, "codec": "vorbis",
            "status": "QUARANTINED_NOT_APPROVED",
            "android_decode": "NOT_TESTED", "human_listening": "NOT_TESTED",
            "rights_page_manually_reviewed": "PENDING_RELEASE_AUDIT"
        })
        print("MEDIA_SOURCE_OK:", item["id"], sha1, "pinned" if pinned else "unpinned", flush=True)
    (OUT / "qa_report.json").write_text(json.dumps(reports, indent=2), encoding="utf-8")
    print(json.dumps([{k: row[k] for k in ("id","original_sha1","original_sha256","status")}
                      for row in reports], indent=2))

if __name__ == "__main__":
    try:
        run()
    except Exception as err:
        print("MEDIA_INTAKE_BLOCKED:", err, file=sys.stderr)
        sys.exit(1)
