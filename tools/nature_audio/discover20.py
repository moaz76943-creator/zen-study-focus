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
def search_required():
    """Find bounded *proposals* for missing requested environments, never approve."""
    from collect_commons_audio import validate_license
    manifest=json.loads(MANIFEST.read_text())
    queries={"rain":"natural rain", "fire":"wood fire crackling", "leaves":"wind trees leaves",
             "waterfall":"waterfall", "wind":"wind nature", "rain_soft":"light rain",
             "waves_calm":"calm ocean waves", "fire_hearth":"fireplace wood",
             "night_crickets":"crickets night", "meadow":"meadow ambience", "coastal_wind":"coastal wind"}
    directory=ROOT/"audio_candidates"/"required_search"
    directory.mkdir(parents=True,exist_ok=True)
    used={r["source_sha1"] for r in manifest["items"]}
    reports=[];downloaded=0
    for slot in manifest.get("required_slots",[]):
        if slot.get("candidate_id") or slot["slot_id"] not in queries:
            continue
        result={"slot_id":slot["slot_id"],"query":queries[slot["slot_id"]],
                "status":"MISSING", "rejections":[], "ready":False}
        try:
            params=urllib.parse.urlencode({"action":"query","format":"json","formatversion":2,
                "generator":"search","gsrsearch":result["query"]+" filetype:audio -music -synthesizer -soundtrack",
                "gsrnamespace":6,"gsrlimit":12,"prop":"imageinfo","iiprop":"sha1|size|extmetadata|url"})
            request=urllib.request.Request("https://commons.wikimedia.org/w/api.php?"+params,headers=HEADERS)
            with OPENER.open(request,timeout=40) as response:
                pages=json.load(response).get("query",{}).get("pages",[])
            for page in sorted(pages,key=lambda p:p.get("index",999)):
                name=page.get("title","").removeprefix("File:").replace(" ","_")
                if not SAFE.fullmatch(name) or not page.get("imageinfo"):
                    continue
                info=page["imageinfo"][0];metadata=info.get("extmetadata",{})
                declared=None
                for license_name in ("CC0-1.0","PD-author"):
                    try:validate_license(license_name,metadata);declared=license_name;break
                    except ValueError:pass
                if not declared or info.get("sha1") in used:
                    continue
                size=int(info.get("size",0))
                if not 10000<size<=LIMIT or downloaded+size>80*1024*1024:
                    continue
                live=source_info(name,declared)
                url="https://commons.wikimedia.org/wiki/Special:Redirect/file/"+urllib.parse.quote(name)
                destination=directory/name
                with OPENER.open(urllib.request.Request(url,headers=HEADERS),timeout=60) as response:
                    blob=response.read(min(LIMIT,80*1024*1024-downloaded)+1)
                downloaded+=len(blob)
                if len(blob)!=live["bytes"] or hashlib.sha1(blob).hexdigest()!=live["sha1"]:
                    raise ValueError("Original hash/size mismatch")
                destination.write_bytes(blob)
                try:duration=validate_media(destination,len(blob))
                except Exception as error:
                    result["rejections"].append({"file":name,"reason":str(error)[:200]})
                    destination.unlink();continue
                used.add(live["sha1"])
                result.update({"status":"SOURCE_PROPOSAL_NOT_MATCH_OR_LISTENING_APPROVED", "file":name,
                    "source_page":"https://commons.wikimedia.org/wiki/File:"+name,
                    "license":declared,"author_source":metadata.get("Artist",{}).get("value",""),
                    "source_metadata":live["metadata"],"checked_at":live["checked_at"],
                    "sha1":live["sha1"],"sha256":hashlib.sha256(blob).hexdigest(),"bytes":len(blob),
                    "duration_seconds":duration,"human_listening":"NOT_TESTED", "slot_match":"NOT_REVIEWED"})
                break
        except Exception as error:
            result.update(status="LOOKUP_BLOCKED",error=str(error)[:500])
        reports.append(result)
        # Persist each slot so a later network failure never hides prior results.
        (directory/"proposals.json").write_text(json.dumps(reports,ensure_ascii=False,indent=2))
        print("REQUIRED_SOURCE_LOOKUP",result["slot_id"],result["status"],result.get("file",""),flush=True)
        if result.get("file"):
            print("REQUIRED_SOURCE_PIN_RECEIPT",json.dumps({key:result[key] for key in
                ("slot_id","file","source_page","license","author_source","sha1","sha256","bytes","duration_seconds","slot_match")},ensure_ascii=True),flush=True)
    print("SEARCH_DOWNLOAD_BYTES",downloaded,"NO_CANONICAL_INTAKE_OR_APP_CHANGE")

if __name__=="__main__":
    try:
        if sys.argv[1:]==["--search-required"]:search_required()
        elif not sys.argv[1:]:run()
        else:raise ValueError("Unknown discovery mode")
    except Exception as exc:
        print("DISCOVERY_REJECTED",repr(exc),file=sys.stderr)
        sys.exit(1)
