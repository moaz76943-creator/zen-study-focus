#!/usr/bin/env python3
"""Offline original-recording listening sheet: NO runtime distribution or approval."""
import hashlib
import html
import json
import pathlib
import re
import urllib.parse

ROOT = pathlib.Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "tools/nature_audio/commons_intake.json"
OUT = ROOT / "audio_candidates/commons_intake"
SAFE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9 _()\'-]*\.ogg$")

GROUPS = {
    "rain_weather": ("Rain & weather", "المطر والطقس"),
    "rivers_streams": ("Rivers & streams", "الأنهار والجداول"),
    "sea_coast": ("Sea & coast", "البحر والسواحل"),
    "forest_birds": ("Forests & birds", "الغابات والطيور"),
    "insects_night": ("Night & insects", "الحشرات والليل"),
    "fire": ("Natural fires", "النار الطبيعية"),
    "other": ("Nature", "الطبيعة"),
}

def render_html(records):
    if not records:
        raise ValueError("No verified recordings to review")
    groups = {}
    for row in records:
        filename = row["file"]
        if not SAFE.fullmatch(filename):
            raise ValueError("Unsafe candidate filename")
        source = row["license_evidence"]
        expected_url = "https://commons.wikimedia.org/wiki/File:" + filename
        if source != expected_url:
            raise ValueError("Unexpected source origin")
        category = row.get("category", "other")
        if category not in GROUPS:
            raise ValueError("Unknown source category")
        name_en = html.escape(row.get("name_en") or row["id"].replace("_", " ").title())
        name_ar = html.escape(row.get("name_ar") or row["id"].replace("_", " ").title())
        author = html.escape(row["author"])
        licence = html.escape(row["license"])
        filename_url = urllib.parse.quote(filename, safe="_-")
        if any(str(w).startswith("BLOCKED_RIGHTS:") for w in row.get("review_warnings", [])):
            warnings = html.escape(" · ".join(row["review_warnings"]))
            groups.setdefault(category, []).append('<article class="clip" data-blocked="rights"><h3>'+name_ar+' · '+name_en+'</h3><p class="flag">'+warnings+'</p><p>Not packaged / غير مضمّن</p></article>')
            continue
        loop = row.get("loop_derivative")
        loop_attr = ""
        if loop:
            if not re.fullmatch(r"loops/[a-z][a-z0-9_]*\.ogg", loop.get("path", "")):
                raise ValueError("Unsafe loop derivative path")
            loop_attr = ' data-loop-src="' + loop["path"] + '"'
        warnings = " · ".join(row.get("review_warnings", []))
        warning_html = '<p class="flag" role="note">'+html.escape(warnings)+'</p>' if warnings else ''
        groups.setdefault(category, []).append(
            '<article class="clip" data-playable><div class="info"><h3 dir="auto">'
            + name_ar + ' <span lang="en" dir="ltr">· ' + name_en + '</span></h3>'
            '<p>Original recording by '+author+' · '+licence+'</p>'
            '<a rel="noopener noreferrer" target="_blank" href="'+html.escape(source,quote=True)+'">Original and license</a>'
            + warning_html + '</div><audio controls loop preload="none" src="'+html.escape(filename_url,quote=True)+'" '
            'data-id="'+html.escape(row['id'],quote=True)+'"'+loop_attr+' aria-label="Original '+name_en+'"></audio>'
            '<div class="track-tools"><button type="button" data-play>Play / تشغيل</button><button type="button" data-stop>Stop / إيقاف</button><output data-track-status aria-live="polite">Stopped</output></div>'
            '<label>Mix level <input type="range" value="45" min="0" max="100" step="5" data-mix></label>'
            '</article>'
        )
    parts = "\n".join(
        '<section class="nature-group" data-sound-group="' + category + '">'
        '<h2 dir="auto">' + html.escape(GROUPS[category][1]) + ' · '
        + html.escape(GROUPS[category][0]) + '</h2>'
        '<div class="cards">' + "\n".join(rows) + '</div></section>'
        for category, rows in groups.items()
    )
    return """<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Deep Focus – original field-recording listening review</title>
<style>
:root{color-scheme:light;font-family:system-ui,sans-serif;background:#f4f6f9;color:#122033}
*{box-sizing:border-box}body{margin:0;padding:20px;max-width:940px;margin-inline:auto}
header{margin-bottom:24px}.flag{color:#9a3412;font-weight:800}
h1{font-size:clamp(1.35rem,4vw,2rem);margin:12px 0}p{line-height:1.6}
.tools{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin:16px 0}
button{background:#213b66;color:white;border:0;border-radius:12px;padding:12px 18px;font-weight:700;min-height:44px}
.nature-group{display:grid;gap:10px;margin-bottom:24px}.nature-group h2{font-size:1.12rem;margin:0}.cards{display:grid;gap:12px}.clip{border:1px solid #cad3e1;border-radius:14px;background:white;padding:16px;display:grid;gap:9px}
.clip h3{font-size:1.04rem;margin:0}.clip p{font-size:.85rem;margin:6px 0}.clip a{font-size:.8rem;overflow-wrap:anywhere}.track-tools{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.tools label{display:flex;gap:8px;flex-wrap:wrap;align-items:center;max-width:100%}input[type=range],select{max-width:100%;min-width:0}
audio{width:100%;max-width:100%;min-height:50px}.clip label{font-size:.85rem;display:flex;align-items:center;gap:10px}.clip input{flex:1;min-width:50px}
footer{font-size:.78rem;color:#576779;padding:16px 0}
</style></head>
<body><header><div class="flag">QA ONLY / غير معتمد للإصدار</div>
<h1>Deep Focus — offline nature audio listening review</h1>
<p>Actual original-source audio, SHA-1 and SHA-256 verified against the intake ledger, decoded on desktop.
Listen to loops on your Android device with headphones and speaker. Mark harsh, synthetic, vocal, clipping,
abrupt loop edge, and distracting material as <strong>FAIL</strong>. No recording is approved for the app by this page.</p>
<div class="tools"><button type="button" onclick="stopAllAudio()">Stop all / إيقاف الكل</button>
<label>Master / المستوى العام <input id="master-volume" type="range" min="0" max="100" value="60"></label>
<label>Original / Loop <select id="source-mode"><option value="original">Original / الأصل</option><option value="loop">Prepared loop (unreviewed) / حلقة للمراجعة</option></select></label>
<span id="status" aria-live="polite">0 active · Combined output ≤ 80%</span></div></header>
<main id="nature-groups">""" + parts + """</main>
<footer>Local/offline file review only. Links to original licenses are informative; recordings play locally.
This page never reads your notes, tasks or app data. Does not change Android media certification status.</footer>
<script>
'use strict';
const clips=[...document.querySelectorAll('audio')];
const sliders=[...document.querySelectorAll('[data-mix]')];
function rebalance(){
  const active=clips.filter(a=>!a.paused&&!a.ended);
  const levels=active.map(a=>Number(sliders[clips.indexOf(a)].value)/100);
  const total=levels.reduce((n,v)=>n+v,0);
  const master=Number(document.getElementById('master-volume').value)/100;
  const scale=(total>0.8?0.8/total:1)*master;
  for(let i=0;i<clips.length;i++){
    const target=Number(sliders[i].value)/100;
    clips[i].volume=active.includes(clips[i])?target*scale:0;
  }
  clips.forEach(a=>{
    const card=a.closest('.clip');
    card.querySelector('[data-play]').textContent=a.paused?'Play / تشغيل':'Pause / إيقاف مؤقت';
    card.querySelector('[data-play]').setAttribute('aria-pressed',String(!a.paused));
    if(!a.error)card.querySelector('[data-track-status]').textContent=a.paused?'Stopped / متوقف':'Playing / يعمل';
  });
  document.getElementById('status').textContent=active.length+' active · Combined output ≤ 80%';
}
function stopAllAudio(){clips.forEach(a=>{a.pause();a.currentTime=0});rebalance();}
for(let i=0;i<clips.length;i++){
  const a=clips[i],card=a.closest('.clip');
  a.dataset.originalSrc=a.getAttribute('src');
  a.volume=0;
  card.querySelector('[data-play]').addEventListener('click',async()=>{
    if(!a.paused){a.pause();return;}
    try{await a.play();}catch(error){card.querySelector('[data-track-status]').textContent='Playback failed / تعذر التشغيل';}
  });
  card.querySelector('[data-stop]').addEventListener('click',()=>{a.pause();a.currentTime=0;rebalance();});
  a.addEventListener('error',()=>{card.querySelector('[data-track-status]').textContent='Playback failed / تعذر التشغيل';});
  clips[i].addEventListener('play',rebalance);
  clips[i].addEventListener('pause',rebalance);
  clips[i].addEventListener('ended',rebalance);
  sliders[i].addEventListener('input',rebalance);
}
document.getElementById('master-volume').addEventListener('input',rebalance);
document.getElementById('source-mode').addEventListener('change',event=>{
  stopAllAudio();
  clips.forEach(a=>{a.src=event.target.value==='loop'?(a.dataset.loopSrc||a.dataset.originalSrc):a.dataset.originalSrc;a.load();});
});
window.addEventListener('pagehide',stopAllAudio);
rebalance();
</script></body></html>
"""

def build():
    candidates = json.loads(MANIFEST.read_text(encoding="utf-8"))["items"]
    reports = json.loads((OUT / "qa_report.json").read_text(encoding="utf-8"))
    checked = {row["id"]: row for row in reports}
    for item in candidates:
        file = OUT / item["file"]
        audited = checked.get(item["id"])
        if any(str(w).startswith("BLOCKED_RIGHTS:") for w in item.get("review_warnings", [])):
            if audited is None or audited.get("status") != "BLOCKED_RIGHTS" or file.exists():
                raise ValueError("Blocked rights file cannot be packaged for listening")
            continue
        if audited is None or not file.is_file() or not SAFE.fullmatch(item["file"]):
            raise ValueError("Candidate absent or unaudited: " + item["id"])
        blob = file.read_bytes()
        sha1 = hashlib.sha1(blob).hexdigest()
        sha256 = hashlib.sha256(blob).hexdigest()
        if (sha1 != item.get("source_sha1") or sha256 != item.get("source_sha256")
           or audited.get("original_sha1") != sha1 or audited.get("original_sha256") != sha256
           or audited.get("status") != "QUARANTINED_NOT_APPROVED"):
            raise ValueError("Review page cannot accept unpinned or altered audio: " + item["id"])
    for item in candidates:
        audited = checked[item["id"]]
        item["review_warnings"] = audited.get("content_warnings", item.get("review_warnings", []))
        loop = audited.get("loop_derivative")
        if loop:
            if not re.fullmatch(r"loops/[a-z][a-z0-9_]*\.ogg", loop.get("path", "")):
                raise ValueError("Unsafe loop output")
            if loop.get("input_sha256") != item["source_sha256"] or hashlib.sha256((OUT / loop["path"]).read_bytes()).hexdigest() != loop.get("output_sha256"):
                raise ValueError("Loop lineage or output hash mismatch")
            item["loop_derivative"] = loop
    (OUT / "index.html").write_text(render_html(candidates), encoding="utf-8")
    print("Audio review index generated from", len(candidates), "pinned originals; no app assets touched")

if __name__ == "__main__":
    build()
