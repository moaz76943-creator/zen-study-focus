#!/usr/bin/env python3
"""Offline app media NEVER downloads at runtime. CI quarantines pinned Commons sound originals."""
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
OUT = ROOT / "audio_candidates/commons_intake"  # CI artifact only, not Android assets
SAFE = re.compile(r"^[A-Za-z0-9_-]+\.ogg$")
SHA1 = re.compile(r"^[a-f0-9]{40}$")

class RestrictedRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        parsed = urllib.parse.urlparse(newurl)
        if parsed.scheme != "https" or parsed.hostname not in {"upload.wikimedia.org", "commons.wikimedia.org"}:
            raise ValueError("Untrusted audio redirect")
        return super().redirect_request(req, fp, code, msg, headers, newurl)

def run():
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    if data.get("status") != "RESEARCH_AND_QUARANTINE_ONLY":
        raise ValueError("Intake can never implicitly approve assets")
    OUT.mkdir(parents=True, exist_ok=True)
    opener = urllib.request.build_opener(RestrictedRedirect)
    reports = []
    for item in data["items"]:
        name, expected = item["file"], item["source_sha1"]
        if not SAFE.fullmatch(name) or not SHA1.fullmatch(expected):
            raise ValueError("Invalid pinned source")
        url = "https://commons.wikimedia.org/wiki/Special:Redirect/file/" + urllib.parse.quote(name)
        req = urllib.request.Request(url, headers={"User-Agent": "DeepFocus-audio-provenance-review/1.0 (open-source QA)"})
        with opener.open(req, timeout=45) as response:
            chunks, total = [], 0
            while True:
                chunk = response.read(1024 * 256)
                if not chunk:
                    break
                total += len(chunk)
                if total > 20 * 1024 * 1024:
                    raise ValueError("Oversized audio: " + name)
                chunks.append(chunk)
        sound = b"".join(chunks)
        if not sound.startswith(b"OggS") or len(sound) < 10000:
            raise ValueError("Bad or HTML masquerading as Ogg: " + name)
        sha1 = hashlib.sha1(sound).hexdigest()
        if sha1 != expected:
            raise ValueError("Source hash mismatch for " + name)
        dst = OUT / name
        dst.write_bytes(sound)
        probe = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
            "stream=codec_name,sample_rate,channels:format=duration", "-of", "json", str(dst)],
            capture_output=True, text=True, timeout=20, check=True)
        info = json.loads(probe.stdout)
        if not any(s.get("codec_name") == "vorbis" for s in info.get("streams", [])):
            raise ValueError("Android Vorbis review candidate required")
        subprocess.run(["ffmpeg", "-v", "error", "-xerror", "-i", str(dst),
            "-f", "null", "-"], capture_output=True, check=True, timeout=45)
        reports.append({"id": item["id"], "source_page": item["license_evidence"],
            "author": item["author"], "license": item["license"],
            "original_sha1": sha1, "download_sha256": hashlib.sha256(sound).hexdigest(),
            "bytes": len(sound), "probe": info, "status": "QUARANTINED_NOT_APPROVED"})
    (OUT / "qa_report.json").write_text(json.dumps(reports, indent=2), encoding="utf-8")
    print(json.dumps([{"id": r["id"], "sha256": r["download_sha256"],
                       "status": r["status"]} for r in reports], indent=2))

if __name__ == "__main__":
    try:
        run()
    except Exception as err:
        print("MEDIA_INTAKE_BLOCKED:", err, file=sys.stderr)
        sys.exit(1)
