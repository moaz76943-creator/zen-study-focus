#!/usr/bin/env node
'use strict';
// TRACK11: review-only native Java copy inventory. Does not touch android source.
const fs=require('node:fs'),path=require('node:path');
const L=require('./audit.cjs');
const native=require('../localization_100/native_copy.cjs');
const RTL=new Set(['ar','fa','ur']);
function buildNativeReview(inventory,sourceSha){
 if(!/^[a-f0-9]{40}$/.test(sourceSha||''))throw Error('EXACT_SOURCE_SHA_REQUIRED');
 if(!/^[a-f0-9]{64}$/.test(inventory?.inventorySha256||''))
  throw Error('INVENTORY_SHA_REQUIRED');
 if(!Array.isArray(inventory.uiStrings)||inventory.candidates!==inventory.uiStrings.length)
  throw Error('NATIVE_CANDIDATE_COUNT_MISMATCH');
 const keys=new Set();
 for(const v of inventory.uiStrings){
  if(!v.path||v.path.startsWith('/')||v.path.includes('..')||!v.path.endsWith('.java'))
   throw Error('UNSAFE_NATIVE_SOURCE_PATH');
  if(typeof v.text!=='string'||!v.text.trim()||!v.kind||!Number.isSafeInteger(v.line))
   throw Error('INVALID_NATIVE_CANDIDATE');
  const id=[v.path,v.kind,v.text].join('|');
  if(keys.has(id))throw Error('DUPLICATE_NATIVE_CANDIDATE');
  keys.add(id);
 }
 // Newer native source discovery also captures non-literal dialog/notification
 // arguments. Missing them from 20-language worksheets would falsely imply coverage.
 const dynamic=inventory.dynamicUiCallsites??[];
 const dynamicCount=inventory.dynamicCandidateCount??0;
 if(!Array.isArray(dynamic)||!Number.isSafeInteger(dynamicCount)||
    dynamicCount<0||dynamicCount!==dynamic.length)
   throw Error('DYNAMIC_CANDIDATE_COUNT_MISMATCH');
 if(dynamicCount&&!/^[a-f0-9]{64}$/.test(inventory.dynamicInventorySha256||''))
   throw Error('DYNAMIC_INVENTORY_SHA_REQUIRED');
 const seenDynamic=new Set();
 for(const v of dynamic){
  if(typeof v.path!=='string'||v.path.startsWith('/')||v.path.includes('..')||
     !v.path.endsWith('.java'))throw Error('UNSAFE_NATIVE_SOURCE_PATH');
  if(typeof v.expression!=='string'||!v.expression.trim()||
     !v.kind||!Number.isSafeInteger(v.line)||v.line<1)
   throw Error('INVALID_DYNAMIC_NATIVE_CANDIDATE');
  const id=[v.path,v.kind,v.expression].join('|');
  if(seenDynamic.has(id))throw Error('DUPLICATE_DYNAMIC_NATIVE_CANDIDATE');
  seenDynamic.add(id);
 }
 const rows=L.LANGS.flatMap(language=>[
  ...inventory.uiStrings.map(v=>({
   language,dir:RTL.has(language)?'rtl':'ltr',path:v.path,line:v.line,
   kind:v.kind,sourceText:v.text,sourceExpression:null,
   classification:'NATIVE_STATIC_SOURCE_CANDIDATE',rendered:'NOT_TESTED',
   actualAndroidLocaleApplied:'NOT_TESTED',candidate:null,
   reviewStatus:'PENDING_HUMAN',approvedForRuntime:false
  })),
  ...dynamic.map(v=>({
   language,dir:RTL.has(language)?'rtl':'ltr',path:v.path,line:v.line,
   kind:v.kind,sourceText:null,sourceExpression:v.expression,
   classification:'NATIVE_DYNAMIC_CALLEE_REQUIRES_CONTEXT',rendered:'NOT_TESTED',
   actualAndroidLocaleApplied:'NOT_TESTED',candidate:null,
   reviewStatus:'PENDING_HUMAN',approvedForRuntime:false
  }))
 ]);
 return {schema:1,sourceSha,nativeInventorySha256:inventory.inventorySha256,
  files:inventory.files,englishSourceCandidateCount:inventory.candidates,
  dynamicSourceCandidateCount:dynamicCount,
  dynamicInventorySha256:inventory.dynamicInventorySha256||null,
  languages:L.LANGS,rows,approvedForRuntime:false,
  measurement:'Static and dynamic native Java review candidates; neither proves displayed strings or Android OS locale mapping',
  limits:['No native Java or string resources modified',
   'Qualified human reviewer, context and screenshot are needed for every native translation',
   'Source inventory changes invalidate this worksheet',
   '80 future languages remain unactivated']};
}
function cell(value){
 let s=value==null?'':String(value);
 if(/^\s*[=+\-@]/.test(s))s="'"+s;
 return '"'+s.replace(/"/g,'""')+'"';
}
function writeNativeReview(r,dir){
 fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'track11-native.json'),JSON.stringify(r,null,2)+'\n');
 const keys=['language','dir','path','line','kind','sourceText','sourceExpression','classification','rendered',
  'actualAndroidLocaleApplied','candidate','reviewStatus','approvedForRuntime','reviewer','reviewDecision','sourceSha'];
 const csv=[keys.join(',')];
 for(const x of r.rows){
  const item={...x,reviewer:'',reviewDecision:'',sourceSha:r.sourceSha};
  csv.push(keys.map(k=>cell(item[k])).join(','));
 }
 fs.writeFileSync(path.join(dir,'track11-native-review.csv'),csv.join('\n')+'\n');
}
function main(args=process.argv.slice(2)){
 if(args.length!==2||args[0]!=='--out')throw Error('Usage: track11_native_review.cjs --out DIRECTORY');
 const original=L.audit();
 const r=buildNativeReview(native.report(),original.pinnedSha);
 writeNativeReview(r,args[1]);
 console.log(JSON.stringify({sourceSha:r.sourceSha,activeLocales:r.languages.length,
  nativeSourceCandidates:r.englishSourceCandidateCount,
  dynamicNativeCandidates:r.dynamicSourceCandidateCount,
  humanReviewRows:r.rows.length,approvedForRuntime:false},null,2));
 return r;
}
if(require.main===module)main();
module.exports={buildNativeReview,writeNativeReview,main};
