#!/usr/bin/env node
'use strict';
// Structured translation CANDIDATES only. This module cannot approve or activate a language.
const fs=require('node:fs'),path=require('node:path');
const guard=require('./guard.cjs');
const DRAFT_STATUS='DRAFT_TRANSLATION_NEEDS_NATIVE_REVIEW';
const INVALID=/(?:\u0000|[\u0001-\u0008\u000B\u000E-\u001F]|\u202A|\u202B|\u202C|\u202D|\u202E|\u2066|\u2067|\u2068|\u2069)/u;
const BAD_DIGIT=/(?![0-9])\p{Decimal_Number}/u;
const TODO=/^(?:todo|tbd|translate|translation missing|untranslated|lorem ipsum|n\/a|待翻译|à traduire)$/iu;
function tokens(v){
  return [...String(v).matchAll(/\{\{\s*[-\w.]+\s*\}\}|\{[-\w.]+\}|\$\{[-\w.]+\}|%(?:\d+\$)?[sdif]/g)]
    .map(x=>x[0].replace(/\s+/g,'')).sort();
}
function protectedIcons(text){
 return [...String(text).matchAll(/\p{Extended_Pictographic}\uFE0F?/gu)].map(m=>m[0].replace(/\uFE0F/g,'')).sort();
}
function formatMarkers(text){
 return [...String(text).matchAll(/\b(?:CSV|PDF|JSON|APK|SAF|URL)\b/gu)].map(m=>m[0]).sort();
}
function validateDraft(pack,source){
 const errors=[],warnings=[],byCatalog={};
 const origin=source&&typeof source==='object'&&!Array.isArray(source)?source:{};
 const sourceCount=Object.values(origin).reduce((n,row)=>n+Object.keys(row||{}).length,0);
 const entry=guard.resolve(pack?.locale);
 if(!entry||entry.phase!=='planned'||pack?.locale!==entry.code)errors.push('NOT_A_CANONICAL_PLANNED_LOCALE');
 if(pack?.schema_version!==1)errors.push('UNKNOWN_SCHEMA');
 if(pack?.status!==DRAFT_STATUS)errors.push('MUST_REMAIN_DRAFT');
 if(pack?.inventorySha256!==guard.inventoryHash(origin))errors.push('STALE_SOURCE_INVENTORY');
 const strings=pack?.strings;
 if(!strings||typeof strings!=='object'||Array.isArray(strings))errors.push('INVALID_STRINGS');
 let translated=0;
 for(const [cid,row] of Object.entries(origin)){
   let n=0;
   const values=(strings&&typeof strings[cid]==='object'&&!Array.isArray(strings[cid])&&strings[cid])||{};
   for(const [key,english] of Object.entries(row)){
     if(!Object.hasOwn(values,key))continue;
     const target=values[key],label=cid+'.'+key;
     if(typeof target!=='string'||!target.trim()){errors.push('EMPTY_TRANSLATION:'+label);continue;}
     if(target!==target.normalize('NFC'))errors.push('NOT_NFC:'+label);
     if(INVALID.test(target))errors.push('CONTROL_CHAR:'+label);
     if(BAD_DIGIT.test(target))errors.push('NON_WESTERN_DIGITS:'+label);
     if(/[<>]/u.test(target))errors.push('UNREVIEWED_HTML:'+label);
     if(TODO.test(target.trim()))errors.push('PLACEHOLDER_TEXT:'+label);
     if(JSON.stringify(tokens(english))!==JSON.stringify(tokens(target)))errors.push('PLACEHOLDER_MISMATCH:'+label);
     if(target.trim()===String(english).trim())errors.push('IDENTICAL_TO_SOURCE:'+label);
     if(JSON.stringify(protectedIcons(english))!==JSON.stringify(protectedIcons(target)))
       errors.push('ICON_MISMATCH:'+label);
     if(JSON.stringify(formatMarkers(english))!==JSON.stringify(formatMarkers(target)))
       errors.push('FORMAT_MARKER_MISMATCH:'+label);
     n++;translated++;
   }
   byCatalog[cid]={total:Object.keys(row).length,translated:n,missing:Object.keys(row).length-n};
 }
 for(const [cid,values] of Object.entries(strings&&typeof strings==='object'&&!Array.isArray(strings)?strings:{})){
   if(!Object.hasOwn(origin,cid)){errors.push('EXTRA_CATALOG:'+cid);continue;}
   if(!values||typeof values!=='object'||Array.isArray(values)){errors.push('INVALID_CATALOG:'+cid);continue;}
   for(const key of Object.keys(values))if(!Object.hasOwn(origin[cid],key))errors.push('EXTRA_KEY:'+cid+'.'+key);
 }
 if(translated===0)warnings.push('NO_TRANSLATION_CONTENT');
 // These flags can NEVER be granted by a draft file or by passing unit tests.
 return Object.freeze({valid:errors.length===0,errors,warnings,
   locale:pack?.locale??null,status:DRAFT_STATUS,
   translated,total:sourceCount,missing:sourceCount-translated,byCatalog,
   humanReview:'NOT_TESTED',nativeAndroid:'NOT_TESTED',renderedUI:'NOT_TESTED',
   readyForRuntime:false,approvedForMerge:false});
}
function reportDrafts(source=guard.sourceInventory(),draftDir=path.join(__dirname,'drafts')){
 const errors=[],results=[];
 for(const name of fs.existsSync(draftDir)?fs.readdirSync(draftDir).sort():[]){
   if(!/^[a-z]{2,3}\.json$/u.test(name)){errors.push('INVALID_DRAFT_FILENAME:'+name);continue;}
   try{
     const p=JSON.parse(fs.readFileSync(path.join(draftDir,name),'utf8'));
     if(p.locale+'.json'!==name)errors.push('WRONG_DRAFT_LOCALE:'+name);
     const r=validateDraft(p,source);results.push(r);
     for(const e of r.errors)errors.push(name+':'+e);
   }catch(e){errors.push('FAILED_TO_READ_DRAFT:'+name+':'+e.message);}
 }
 return {valid:errors.length===0,errors,candidateCount:results.length,
   translatedCandidates:results.reduce((v,r)=>v+r.translated,0),
   languages:results,activationAllowed:false};
}
if(require.main===module){
 try{
   if(process.argv.length!==3||process.argv[2]!=='--report')throw Error('Usage: drafts.cjs --report');
   const result=reportDrafts();console.log(JSON.stringify(result,null,2));process.exitCode=result.valid?0:1;
 }catch(e){console.error('DRAFT_VALIDATION_FAILED:',e.message);process.exitCode=1;}
}
module.exports={DRAFT_STATUS,validateDraft,reportDrafts};
