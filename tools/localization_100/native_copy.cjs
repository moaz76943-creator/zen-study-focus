#!/usr/bin/env node
'use strict';
// Native Android UI discovery only. Must NOT rewrite Java or stored content.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const JAVA_ROOT=path.resolve(__dirname,'../../android/app/src/main/java');
const LEGACY_PACKAGE='com/zenstudy/focus/';
// Enumerate new Java modules as well as the original native UI classes.
// Preserve their original review identifiers to avoid invalidating drafts for
// unrelated, non-UI changes.
function listJavaFiles(root=JAVA_ROOT){
 if(!fs.existsSync(root))throw Error('NATIVE_SOURCE_ROOT_MISSING');
 const result=[];
 function walk(folder,relative){
  for(const entry of fs.readdirSync(folder,{withFileTypes:true})){
   const name=relative?relative+'/'+entry.name:entry.name;
   if(entry.isDirectory())walk(path.join(folder,entry.name),name);
   else if(entry.isFile()&&entry.name.endsWith('.java'))result.push(name);
  }
 }
 walk(root,'');
 return result.sort();
}
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
// Native messages supplied by JavaScript/runtime values are not literal translations.
// Record them separately so review worksheets cannot mistake absence for coverage.
function scanDynamicJava(source,relativePath){
 if(typeof source!=='string'||typeof relativePath!=='string'||relativePath.includes('..'))
  throw Error('INVALID_NATIVE_SOURCE');
 const kinds={setMessage:'dynamicDialogMessage',setContentText:'dynamicNotificationBody',
  setContentTitle:'dynamicNotificationTitle'};
 const rows=[],seen=new Set(),calls=/\.(setMessage|setContentText|setContentTitle)\s*\(/g;
 let match;
 while((match=calls.exec(source))!==null){
  let i=calls.lastIndex,depth=1,quote=null,escaped=false;
  for(;i<source.length&&depth;i++){
   const ch=source[i];
   if(quote){
    if(escaped)escaped=false;
    else if(ch==='\\')escaped=true;
    else if(ch===quote)quote=null;
   }else if(ch==='"'||ch==="'")quote=ch;
   else if(ch==='(')depth++;
   else if(ch===')')depth--;
  }
  if(depth)throw Error('UNBALANCED_NATIVE_UI_CALL:'+relativePath+':'+match[1]);
  const expression=source.slice(calls.lastIndex,i-1).trim();
  if(!expression||expression.length>500)throw Error('UNREVIEWABLE_DYNAMIC_SOURCE:'+relativePath);
  if(/^"(?:\\.|[^"\\])*"$/s.test(expression)||/^android\.R\.string\.\w+$/.test(expression))continue;
  const line=source.slice(0,match.index).split('\n').length,kind=kinds[match[1]];
  const key=[relativePath,kind,expression].join('|');
  if(seen.has(key))continue;
  seen.add(key);
  rows.push({path:relativePath,line,kind,expression,status:'DYNAMIC_RUNTIME_CROSS_REFERENCE_REQUIRED'});
 }
 return rows.sort((a,b)=>a.path.localeCompare(b.path)||a.line-b.line||a.kind.localeCompare(b.kind));
}

// Stable across file-line movement, not across changed literal, callsite type or source path.
function inventoryHash(rows){
 const items=[...new Set(rows.map(r=>[r.path,r.kind,r.text].join('\\u0000')))].sort();
 return crypto.createHash('sha256').update(JSON.stringify(items)).digest('hex');
}
function report(){
 const uiStrings=[],dynamicUiCallsites=[],files=listJavaFiles();
 if(!files.length)throw Error('NATIVE_JAVA_DISCOVERY_EMPTY');
 for(const p of files){
  const reviewPath=p.startsWith(LEGACY_PACKAGE)?p.slice(LEGACY_PACKAGE.length):p;
  const source=fs.readFileSync(path.join(JAVA_ROOT,p),'utf8');
  uiStrings.push(...scanJava(source,reviewPath));
  dynamicUiCallsites.push(...scanDynamicJava(source,reviewPath));
 }
 if(uiStrings.length<8)throw Error('NATIVE_UI_DISCOVERY_SUSPICIOUSLY_EMPTY');
 return {schema_version:1,source:'Exact checked-out Java source, heuristic UI callsite scanner',
  files:files.length,candidates:uiStrings.length,inventorySha256:inventoryHash(uiStrings),uiStrings,
  dynamicCandidateCount:dynamicUiCallsites.length,dynamicUiCallsites,
  dynamicInventorySha256:inventoryHash(dynamicUiCallsites.map(r=>({...r,text:r.expression}))),
  localizedIn100:false,reviewed:false,limitations:[
   'JavaScript-supplied dialog and notification strings are inventoried as unresolved dynamic callsites, not translations',
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
module.exports={scanJava,scanDynamicJava,inventoryHash,listJavaFiles,report};
