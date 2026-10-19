'use strict';
// Read-only inventory. Reports risk; does not treat the presence of onclick as a passing interaction test.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../android/app/src/main/assets/web');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const scripts=[...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)].map(m=>m[1]);
const source=new Map();
const issues=[];
for(const s of scripts){
  const file=path.join(root,s);
  if(!fs.existsSync(file)){issues.push({severity:'BLOCKED',type:'missing-script',file:s});continue;}
  source.set(s,fs.readFileSync(file,'utf8'));
}
const handlers=[];
const tags=/<(button|input|select|textarea|a|div|span|article|label)\b[^>]*>/gims;
for(const hit of html.matchAll(tags)){
  const tag=hit[0];
  for(const evt of tag.matchAll(/\bon(click|change|input|keydown|submit|touchstart|pointerdown)\s*=\s*(["'])([\s\S]*?)\2/gi)){
    const id=(tag.match(/\bid=["']([^"']+)/i)||[])[1]||null;
    const line=html.slice(0,hit.index).split('\n').length;
    handlers.push({line,tag:hit[1].toLowerCase(),id,event:evt[1],handler:evt[3],classification:'NEEDS_EVENT_QA'});
  }
}
const symbols=new Map();
for(const [file,js] of source){
  const regex=/(?:^|\n)\s*function\s+([A-Za-z_$][\w$]*)\s*\(/g;
  for(const m of js.matchAll(regex)){
    const entries=symbols.get(m[1])||[];entries.push(file);symbols.set(m[1],entries);
  }
}
for(const h of handlers){
  const m=h.handler.match(/(?:^|\s|;)\s*(?:if\s*\([^)]*\)\s*)?([A-Za-z_$][\w$]*)\s*\(/);
  const fn=m&&m[1];
  if(fn && !symbols.has(fn) && ![...source.values()].some(s=>s.includes('window.'+fn+' =')||s.includes('window.'+fn+'=')||s.includes('const '+fn+' ='))) {
    issues.push({severity:'REVIEW',type:'unresolved-handler',line:h.line,handler:fn});
  }
  if(h.handler.includes('addQuickSessionRecord')&&h.tag==='div'){
    h.classification='MISLEADING_DISPLAY';
    issues.push({severity:'CONFIRMED',type:'fake-kpi-click',line:h.line});
  }
}
for(const [symbol,files] of symbols){if(new Set(files).size>1)issues.push({severity:'REVIEW',type:'global-collision',symbol,files});}
for(const [mustPrecede,mustFollow] of [
  ['locale_rows.js','app.js'],['preflight_v22.js','app.js'],['notes_core_v21.js','notes_editor_ui.js'],
  ['analytics_core_v21.js','analytics_studio.js'],['tasks_core_v21.js','tasks_studio.js']
]) {
  if(scripts.indexOf(mustPrecede)<0 || scripts.indexOf(mustFollow)<0 || scripts.indexOf(mustPrecede)>=scripts.indexOf(mustFollow))
    issues.push({severity:'BLOCKED',type:'script-order',mustPrecede,mustFollow});
}
const report={scriptCount:scripts.length,inlineEventCount:handlers.length,clickCount:handlers.filter(x=>x.event==='click').length,
  coverage:{staticInventoried:handlers.length,eventDispatchedInActualWebView:0,claim:'NOT_VERIFIED'},
  handlers,issues};
if(require.main===module){process.stdout.write(JSON.stringify(report,null,2)+'\n');if(process.argv.includes('--strict')&&issues.some(x=>x.severity==='BLOCKED'))process.exitCode=1;}
module.exports={report};
