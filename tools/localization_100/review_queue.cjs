#!/usr/bin/env node
'use strict';
// Human work orders, never code/data that the Android application loads.
const fs=require('node:fs'),path=require('node:path');
const guard=require('./guard.cjs');
const native=require('./native_copy.cjs');
const draftTools=require('./drafts.cjs');
const nativeDraftTools=require('./native_drafts.cjs');
const root=__dirname;
const PLACEHOLDERS=/\{\{\s*[-\w.]+\s*\}\}|\{[-\w.]+\}|\$\{[-\w.]+\}|%(?:\d+\$)?[sdif]/g;
function readCandidates(dir){
 const base=path.join(root,dir),packs={};
 for(const filename of fs.existsSync(base)?fs.readdirSync(base):[]){
  if(!/^[a-z]{2,3}\.json$/.test(filename))throw Error('BAD_CANDIDATE_FILE:'+filename);
  const pack=JSON.parse(fs.readFileSync(path.join(base,filename),'utf8'));
  if(pack.locale+'.json'!==filename)throw Error('CANDIDATE_FILE_LOCALE_MISMATCH:'+filename);
  packs[pack.locale]=pack;
 }
 return packs;
}
function important(english){
 return /\b(?:backup|export|restore|delete|reset|cancel|permission|private|security|error|failed|unable|unsaved|warning|stop|revert|overwrite|discard|privacy|confirm|save)\b/i.test(english);
}
function buildQueue({source=guard.sourceInventory(),nativeRows=native.report().uiStrings,
 webDrafts=readCandidates('drafts'),nativeDrafts=readCandidates('native_drafts')}={}){
 const catalogSet=new Set(guard.REGISTRY.filter(r=>r.phase==='planned').map(r=>r.code));
 const sourcePaths=new Set(Object.entries(source).flatMap(([cid,values])=>Object.keys(values).map(k=>cid+'.'+k)));
 const nativeKeys=new Set(nativeRows.map(r=>r.text));
 for(const [code,pack] of Object.entries(webDrafts)){
  if(!catalogSet.has(code)||pack.locale!==code)throw Error('INVALID_CANDIDATE_LOCALE:'+code);
  for(const [cid,row] of Object.entries(pack.strings||{}))
   for(const key of Object.keys(row))if(!sourcePaths.has(cid+'.'+key))throw Error('UNRECOGNIZED_CANDIDATE:'+cid+'.'+key);
 }
 for(const [code,pack] of Object.entries(nativeDrafts)){
  if(!catalogSet.has(code)||pack.locale!==code)throw Error('INVALID_NATIVE_CANDIDATE_LOCALE:'+code);
  for(const key of Object.keys(pack.strings||{}))if(!nativeKeys.has(key))throw Error('UNRECOGNIZED_NATIVE_CANDIDATE:'+key);
 }
 const englishSha=guard.inventoryHash(source),nativeSha=native.inventoryHash(nativeRows);
 return guard.REGISTRY.filter(r=>r.phase==='planned').map(locale=>{
  const web=webDrafts[locale.code],nat=nativeDrafts[locale.code],items=[];
  for(const [catalog,values] of Object.entries(source)){
   for(const [key,english] of Object.entries(values)){
    const candidate=web?.strings?.[catalog]?.[key]??null;
    items.push({surface:'web',catalog,key,english,candidate,
      status:candidate===null?'NOT_TRANSLATED':'CANDIDATE_NEEDS_HUMAN_REVIEW',
      placeholders:[...english.matchAll(PLACEHOLDERS)].map(x=>x[0]),
      critical:important(english)||/\b(?:save|cancel|delete|restore|export|backup|warning|error)\b/i.test(key),
      humanReview:'NOT_TESTED',contextScreenshots:[],reviewNotes:null});
   }
  }
  for(const entry of nativeRows){
   const candidate=nat?.strings?.[entry.text]??null;
   items.push({surface:'android',catalog:entry.kind,key:entry.text,english:entry.text,candidate,
    sourceFile:entry.path,sourceLine:entry.line,
    status:candidate===null?'NOT_TRANSLATED':'CANDIDATE_NEEDS_HUMAN_REVIEW',
    placeholders:[...entry.text.matchAll(PLACEHOLDERS)].map(x=>x[0]),
    critical:important(entry.text),humanReview:'NOT_TESTED',contextScreenshots:[],reviewNotes:null});
  }
  const candidateCount=items.filter(r=>r.candidate!==null).length;
  return {schema_version:1,locale:locale.code,englishName:locale.name,
    script:locale.script,direction:locale.direction,englishSourceSha256:englishSha,
    nativeSourceSha256:nativeSha,total:items.length,candidateCount,untranslatedCount:items.length-candidateCount,
    approvedForRuntime:false,humanReview:'NOT_TESTED',androidTests:'NOT_TESTED',
    sourceScope:'Explicit 25 dictionaries plus detected Java copy; dynamic and OS UI may not be included',
    items};
 });
}
function writeQueue(directory){
 const queue=buildQueue(),out=path.resolve(directory);
 fs.mkdirSync(out,{recursive:true});
 const list=queue.map(q=>{
  fs.writeFileSync(path.join(out,q.locale+'.json'),JSON.stringify(q,null,2)+'\n');
  return {code:q.locale,rtl:q.direction==='rtl',total:q.total,candidates:q.candidateCount,
    untranslated:q.untranslatedCount,status:'BLOCKED_LINGUISTIC_AND_ANDROID_REVIEW'};
 });
 const overview={schema_version:1,totalLanguages:100,plannedLanguages:list.length,
  existingUntouched:20,excludedHebrew:true,certifiedNewLanguages:0,
  candidateStrings:list.reduce((sum,q)=>sum+q.candidates,0),approved:false,files:list};
 fs.writeFileSync(path.join(out,'INDEX.json'),JSON.stringify(overview,null,2)+'\n');
 return overview;
}
if(require.main===module){
 try{
  if(process.argv.length!==4||process.argv[2]!=='--out')throw Error('Usage: review_queue.cjs --out DIRECTORY');
  console.log(JSON.stringify(writeQueue(process.argv[3]),null,2));
 }catch(e){console.error('LOCALE_REVIEW_QUEUE_FAILED:',e.message);process.exitCode=1;}
}
module.exports={readCandidates,buildQueue,writeQueue};
