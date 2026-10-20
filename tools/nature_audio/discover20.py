#!/usr/bin/env python3
"""Source-identification ONLY for 10 new genuine Commons files. Never approve runtime."""
import hashlib
import json
import pathlib
import re
import subprocess
import sys
import urllib.parse
import urllib.request
from collect_commons_audio import MANIFEST, ROOT, SAFE, HEADERS, OPENER, source_info

OUT=ROOT/"audio_candidates"/"new20_discovery"
LIMIT=22*1024*1024
def check_candidate(item):
    if item.get("approved_for_runtime") is not False or item.get("status")!="QUARANTINED_NOT_APPROVED":
        raise ValueError("Source discovery must never make files eligible for app playback")
    name=item["file"]
    if not SAFE.fullmatch(name) or item.get("source_sha1") is not None or item.get("source_sha256") is not None:
        raise ValueError("Expected valid, unpinned new original")
    if item.get("synthetic") is not False or item.get("contains_music") is not False:
        raise ValueError("Not an accepted field recording candidate")
    if item["license_evidence"]!="https://commons.wikimedia.org/wiki/File:"+name:
        raise ValueError("Untrusted source page")
    if item["license"] not in ("PD-author","CC0-1.0"):
        raise ValueError("Unsupported license for source discovery")
    return name
def validate_media(filepath,original_size,min_duration=15):
    data=filepath.read_bytes()
    if len(data)!=original_size or not data.startswith(b"OggS") or len(data)<10000:
        raise ValueError("Original byte count/Ogg format mismatch")
    p=subprocess.run(["ffprobe","-v","error","-show_entries","stream=codec_name,sample_rate,channels:format=duration","-of","json",str(filepath)],capture_output=True,text=True,timeout=25,check=True)
    j=json.loads(p.stdout)
    assert any(s.get("codec_name")=="vorbis" for s in j.get("streams",[])), "No Vorbis"
    sec=float(j.get("format",{}).get("duration",0))
    if not (min_duration<=sec<=900):
        raise ValueError("Duration unsupported: "+str(sec))
    subprocess.run(["ffmpeg","-v","error","-xerror","-i",str(filepath),"-f","null","-"],capture_output=True,check=True,timeout=90)
    return sec
def run():
    manifest=json.loads(MANIFEST.read_text())
    if len(manifest.get("items",[]))!=20 or manifest.get("status")!="RESEARCH_AND_QUARANTINE_ONLY":
        raise ValueError("Discovery intended only for exact 20-item quarantine manifest")
    new=[r for r in manifest["items"] if r.get("source_sha1") is None]
    if len(new)==0:
        print("DISCOVERY_ALREADY_PINNED: no new source discovery permitted; verify in strict twenty-original run")
        return
    if len(new)!=10:
        raise ValueError("Expected either ten new candidates or the fully pinned manifest")
    OUT.mkdir(parents=True,exist_ok=True)
    report=[]
    for item in new:
        name=check_candidate(item)
        info=source_info(name,item["license"]) # live Commons SHA1/license
        if info["bytes"]>LIMIT:
            raise ValueError("Source larger than bounded intake: "+name)
        url="https://commons.wikimedia.org/wiki/Special:Redirect/file/"+urllib.parse.quote(name)
        dest=OUT/name
        h1=hashlib.sha1();h256=hashlib.sha256();size=0
        with OPENER.open(urllib.request.Request(url,headers=HEADERS),timeout=60) as response,dest.open("wb") as file:
            while True:
                chunk=response.read(262144)
                if not chunk:break
                size+=len(chunk)
                if size>LIMIT: raise ValueError("Source exceeds limit")
                h1.update(chunk);h256.update(chunk);file.write(chunk)
        if h1.hexdigest()!=info["sha1"] or size!=info["bytes"]:
            raise ValueError("Upstream changed bytes or incomplete download: "+name)
        duration=validate_media(dest,size,12 if item["id"]=="forest_wrens" else 15)
        row={ "id":item["id"],"file":name,"source_sha1":h1.hexdigest(),
             "source_sha256":h256.hexdigest(),"original_bytes":size,
             "duration_seconds":duration,"original_codec":"vorbis",
             "source_url":item["license_evidence"],"author":item["author"],
             "license":item["license"],"api_license":info["api_license"],
             "status":"DISCOVERY_ONLY_NOT_APPROVED","human_listening":"NOT_TESTED",
             "android_playback":"NOT_TESTED" }
        report.append(row)
        print("DISCOVERY_SOURCE_CHECKED",item["id"],round(duration,2),"seconds",flush=True)
    (OUT/"pin_report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2))
    # These are PUBLIC FILE DIGESTS, not credentials: emit for explicit human pinning.
    # No user data or secret values are present in this quarantine receipt.
    print("DISCOVERY_PIN_RECEIPT_JSON",json.dumps([{k:row[k] for k in ("id","file","source_sha1","source_sha256","original_bytes","duration_seconds")} for row in report],separators=(",",":")),flush=True)
    print("DISCOVERY_COUNT",len(report),"- source audit only, not eligible for production")
if __name__=="__main__":
    try:run()
    except Exception as exc:
        print("DISCOVERY_REJECTED",repr(exc),file=sys.stderr)
        sys.exit(1)
