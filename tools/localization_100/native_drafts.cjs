#!/usr/bin/env node
'use strict';
// Candidate native UI copy is only a language-review artifact, never a Java/Android resource.
const fs=require('node:fs'),path=require('node:path');
const guard=require('./guard.cjs'),native=require('./native_copy.cjs');
const STATUS='DRAFT_NATIVE_NEEDS_REVIEW';
const forbidden=/[\u0000-\u0008\u000B\u000E-\u001F\u202A-\u202E\u2066-\u2069<>]/u;
const nonwestern=/(?![0-9])\p{Decimal_Number}/u;
const markers=s=>[...String(s).matchAll(/%(?:\d+\$)?[sdif]|\{[-\w.]+\}/g)].map(m=>m[0]).sort();
function validate(pack,source=native.report().uiStrings){
 const errors=[],warnings=[];
 const entry=guard.resolve(pack?.locale);
 if(!entry||entry.phase!=='planned'||entry.code!==pack?.locale)errors.push('INVALID_PLANNED_LOCALE');
 if(pack?.schema_version!==1||pack?.status!==STATUS)errors.push('NOT_A_NATIVE_DRAFT');
 const available=new Set(source.map(x=>x.text)),strings=pack?.strings;
 if(!strings||typeof strings!=='object'||Array.isArray(strings))errors.push('INVALID_STRINGS');
 const values=strings&&typeof strings==='object'&&!Array.isArray(strings)?strings:{};
 for(const [text,target] of Object.entries(values)){
   if(!available.has(text))errors.push('UNRECOGNIZED_NATIVE_SOURCE:'+text);
   if(typeof target!=='string'||!target.trim()){errors.push('EMPTY_NATIVE_COPY:'+text);continue;}
   if(forbidden.test(target))errors.push('UNSAFE_NATIVE_COPY:'+text);
   if(nonwestern.test(target))errors.push('NON_WESTERN_DIGITS:'+text);
   if(target!==target.normalize('NFC'))errors.push('NON_NFC:'+text);
   if(JSON.stringify(markers(text))!==JSON.stringify(markers(target)))errors.push('TOKEN_MISMATCH:'+text);
   if(target.trim()===text.trim())errors.push('ENGLISH_FALLBACK:'+text);
 }
 const translated=[...available].filter(x=>typeof values[x]==='string'&&values[x].trim()).length;
 return {valid:errors.length===0,errors,warnings,locale:pack?.locale,
   total:available.size,translated,missing:available.size-translated,
   nativeAndroid:'NOT_TESTED',linguisticReview:'NOT_TESTED',
   runtimeApproved:false};
}
function report(){
 const found=native.report().uiStrings,dir=path.join(__dirname,'native_drafts'),results=[],errors=[];
 for(const name of fs.existsSync(dir)?fs.readdirSync(dir).sort():[]){
  if(!/^[a-z]{2,3}\.json$/.test(name)){errors.push('BAD_DRAFT_NAME:'+name);continue;}
  try{
   const pack=JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));
   if(pack.locale+'.json'!==name)errors.push('FILENAME_MISMATCH:'+name);
   const r=validate(pack,found);results.push(r);
   for(const e of r.errors)errors.push(name+':'+e);
  }catch(e){errors.push('CANNOT_READ:'+name+':'+e.message);}
 }
 return {valid:errors.length===0,errors,candidates:results.length,
  candidateTexts:results.reduce((n,v)=>n+v.translated,0),javaUiCandidates:new Set(found.map(x=>x.text)).size,
  approved:false,results};
}
if(require.main===module){
 try{
  if(process.argv.length!==3||process.argv[2]!=='--report')throw Error('Usage: native_drafts.cjs --report');
  const r=report();console.log(JSON.stringify(r,null,2));if(!r.valid)process.exitCode=1;
 }catch(e){console.error('NATIVE_DRAFTS_FAILED:',e.message);process.exitCode=1;}
}
module.exports={STATUS,validate,report};
