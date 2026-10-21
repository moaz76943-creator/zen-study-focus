#!/usr/bin/env node
'use strict';
// Native Android UI discovery only. Must NOT rewrite Java or stored content.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'../../android/app/src/main/java/com/zenstudy/focus');
const FILES=['MainActivity.java','FocusTimerService.java','FocusAppWebChromeClient.java'];
const PATTERNS=[
 ['toast',/Toast\.makeText\s*\(\s*[^,()\n]+\s*,\s*"((?:\\.|[^"\\])+)"/g],
 ['notificationTitle',/\.setContentTitle\s*\(\s*"((?:\\.|[^"\\])+)"/g],
 ['notificationBody',/\.setContentText\s*\(\s*"((?:\\.|[^"\\])+)"/g],
 ['notificationChannelName',/new NotificationChannel\s*\(\s*[A-Za-z_]\w*\s*,\s*"((?:\\.|[^"\\])+)"/g],
 ['notificationChannelDescription',/\.setDescription\s*\(\s*"((?:\\.|[^"\\])+)"/g],
 ['dialogTitle',/\.setTitle\s*\(\s*"((?:\\.|[^"\\])+)"/g],
];
function scanJava(source,relativePath){
 if(typeof source!=='string'||typeof relativePath!=='string'||relativePath.includes('..'))throw Error('INVALID_NATIVE_SOURCE');
 const items=[],seen=new Set();
 for(const [kind,pattern] of PATTERNS){
  const re=new RegExp(pattern.source,pattern.flags);let m;
  while((m=re.exec(source))!==null){
   const text=m[1].trim(),line=source.slice(0,m.index).split('\n').length;
   if(!text||text.length>200)continue;
   const key=relativePath+'|'+line+'|'+text;
   if(seen.has(key))continue;seen.add(key);
   items.push({path:relativePath,line,kind,text,status:'UNTRANSLATED_REQUIRES_REVIEW'});
  }
 }
 return items.sort((a,b)=>a.line-b.line||a.text.localeCompare(b.text));
}
// Stable across file-line movement, not across changed literal, callsite type or source path.
function inventoryHash(rows){
 const items=[...new Set(rows.map(r=>[r.path,r.kind,r.text].join('\\u0000')))].sort();
 return crypto.createHash('sha256').update(JSON.stringify(items)).digest('hex');
}
function report(){
 const uiStrings=[];
 for(const p of FILES){
  const file=path.join(ROOT,p);
  if(!fs.existsSync(file))throw Error('NATIVE_FILE_MISSING:'+p);
  uiStrings.push(...scanJava(fs.readFileSync(file,'utf8'),p));
 }
 if(uiStrings.length<8)throw Error('NATIVE_UI_DISCOVERY_SUSPICIOUSLY_EMPTY');
 return {schema_version:1,source:'Exact checked-out Java source, heuristic UI callsite scanner',
  files:FILES.length,candidates:uiStrings.length,inventorySha256:inventoryHash(uiStrings),uiStrings,
  localizedIn100:false,reviewed:false,limitations:[
   'This inventory is source-level and excludes JS-supplied dynamic messages',
   'OS-managed android.R.string dialogs already localize separately',
   'No native UI strings were changed, translated or activated',
   'Human review and exact-head Android device tests required'
  ]};
}
if(require.main===module){
 try{
  if(process.argv.length!==3||process.argv[2]!=='--report')throw Error('Usage: native_copy.cjs --report');
  console.log(JSON.stringify(report(),null,2));
 }catch(e){console.error('NATIVE_COPY_DISCOVERY_FAILED:',e.message);process.exitCode=1;}
}
module.exports={scanJava,inventoryHash,report};
