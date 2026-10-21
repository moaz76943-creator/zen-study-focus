#!/usr/bin/env node
'use strict';
// A review-only admission guard; not production locale activation.
const fs=require('node:fs'), path=require('node:path'),crypto=require('node:crypto');
const catalog=require('./catalog.json');
const LEGACY_CODES=Object.freeze('en ar es zh hi fr de ru pt ja id tr ko vi it bn ur fa pl nl'.split(' '));
const REGISTRY=Object.freeze(catalog.locales.map(v=>Object.freeze({...v})));
const index=new Map(REGISTRY.map(row=>[row.code,row]));
const RTL=new Set(['ar','ur','fa','ps','sd','ug','ckb']);
const REVIEW_GATES=['contextReview','androidWebView','rtlLtr','accessibility','nativeUi','westernDigits','offline','dataSafety'];
function normalize(value){
  if(typeof value!=='string'||!/^[a-z]{2,3}(?:[-_][a-z0-9]{2,8})*$/i.test(value))return null;
  try{return Intl.getCanonicalLocales(value.replace(/_/g,'-'))[0]||null;}catch(_){return null;}
}
function resolve(value){
  const tag=normalize(value);if(!tag)return null;
  const segments=tag.split('-'),base=segments[0].toLowerCase();
  if(['he','iw'].includes(base))return null;
  const entry=index.get(base);if(!entry)return null;
  const script=segments.find(s=>/^[A-Z][a-z]{3}$/.test(s));
  if(script&&script!==entry.script)return null;
  return Object.freeze({...entry,selectable:entry.phase==='existing'});
}
function sourceShape(source){
  const out={};for(const id of Object.keys(source||{}).sort()){
    const row=source[id]||{}, values=Array.isArray(row)?Object.fromEntries(row.map(k=>[k,''])):row;
    out[id]=Object.fromEntries(Object.keys(values).sort().map(key=>[key,String(values[key]??'')]));
  }return out;
}
function inventoryHash(source){
  return crypto.createHash('sha256').update(JSON.stringify(sourceShape(source))).digest('hex');
}
function tokens(v){return [...String(v).matchAll(/\{\{\s*[-\w.]+\s*\}\}|\{[-\w.]+\}|\$\{[-\w.]+\}|%(?:\d+\$)?[sdif]/g)].map(x=>x[0]).sort();}
function validatePack(pack,source){
  const errors=[],entry=pack&&resolve(pack.locale),wanted=sourceShape(source),strings=pack?.strings||{};
  if(!entry||entry.phase!=='planned')errors.push('UNKNOWN_OR_NON_CANDIDATE');
  if(!pack||pack.inventorySha256!==inventoryHash(source))errors.push('STALE_INVENTORY');
  if(!pack||!pack.strings||typeof pack.strings!=='object'||Array.isArray(pack.strings))errors.push('INVALID_TRANSLATIONS');
  for(const [cid,values] of Object.entries(wanted)){
    if(!strings[cid]||typeof strings[cid]!=='object'||Array.isArray(strings[cid])){errors.push('MISSING_CATALOG:'+cid);continue;}
    for(const [key,english] of Object.entries(values)){
      const label=cid+'.'+key,translation=strings[cid][key];
      if(typeof translation!=='string'||!translation.trim()){errors.push('MISSING_KEY:'+label);continue;}
      if(translation!==translation.normalize('NFC'))errors.push('NOT_NFC:'+label);
      if(/[\u0000-\u0008\u000B\u000E-\u001F\u202A-\u202E\u2066-\u2069]/u.test(translation))errors.push('CONTROL_CHAR:'+label);
      if([...translation].some(ch=>/\p{Decimal_Number}/u.test(ch)&&!/[0-9]/.test(ch)))errors.push('NON_WESTERN_DIGITS:'+label);
      if(/[<>]/.test(translation))errors.push('UNREVIEWED_HTML:'+label);
      if(JSON.stringify(tokens(english))!==JSON.stringify(tokens(translation)))errors.push('PLACEHOLDER_MISMATCH:'+label);
      if(translation===english&&entry?.code!=='en'&&!pack.review?.identicalApproved?.includes(label))errors.push('IDENTICAL_WITHOUT_EXEMPTION:'+label);
    }
    for(const key of Object.keys(strings[cid]))if(!Object.hasOwn(values,key))errors.push('EXTRA_KEY:'+cid+'.'+key);
  }
  for(const id of Object.keys(strings))if(!Object.hasOwn(wanted,id))errors.push('EXTRA_CATALOG:'+id);
  const review=pack?.review;
  if(!review||typeof review!=='object')errors.push('MISSING_REVIEW');
  else{
    if(typeof review.reviewer!=='string'||review.reviewer.trim().length<4)errors.push('MISSING_HUMAN_REVIEWER');
    if(!/^20\d\d-\d\d-\d\d$/.test(review.reviewedAt||''))errors.push('MISSING_REVIEW_DATE');
    if(!Array.isArray(review.evidence)||review.evidence.length<2||!review.evidence.every(v=>typeof v==='string'&&v.trim()))errors.push('MISSING_EVIDENCE');
    for(const gate of REVIEW_GATES)if(review[gate]!=='PASS')errors.push('NOT_VERIFIED:'+gate);
    if(review.identicalApproved!==undefined&&(!Array.isArray(review.identicalApproved)||review.identicalApproved.some(x=>typeof x!=='string'||!x.includes('.'))))errors.push('INVALID_EXEMPTIONS');
  }
  return Object.freeze({ok:errors.length===0,errors});
}
function sourceInventory(){
  const {catalogs}=require('../language_review/audit.cjs');
  const {out}=catalogs(),inventory={};
  for(const table of out){
    if(Object.hasOwn(inventory,table.id))throw Error('DUPLICATE_CATALOG:'+table.id);
    const english=table.localeValues.en||{};
    inventory[table.id]=Object.fromEntries(table.keys.map(k=>{
      if(typeof english[k]!=='string')throw Error('INCOMPLETE_SOURCE:'+table.id+'.'+k);
      return [k,english[k]];
    }));
  }
  if(out.length<8)throw Error('SOURCE_SCAN_INCOMPLETE');
  return inventory;
}
function validateRoster(){
  const errors=[],existing=REGISTRY.filter(r=>r.phase==='existing').map(r=>r.code);
  if(catalog.schema_version!==1||catalog.target_count!==100||REGISTRY.length!==100||index.size!==100)errors.push('100_LOCALE_ROSTER_INVALID');
  if(JSON.stringify(existing)!==JSON.stringify(LEGACY_CODES))errors.push('ORIGINAL_20_CHANGED');
  if(REGISTRY.filter(r=>r.phase==='planned').length!==80)errors.push('PLANNED_80_INVALID');
  for(const row of REGISTRY){
    if(!row.name||!/^[a-z]{2,3}$/.test(row.code)||!['existing','planned'].includes(row.phase))errors.push('INVALID_LOCALE:'+row.code);
    if(!/^[A-Z][a-z]{3}$/.test(row.script)||row.direction!==(RTL.has(row.code)?'rtl':'ltr'))errors.push('INVALID_SCRIPT_OR_DIRECTION:'+row.code);
    if(!normalize(row.code)||['he','iw'].includes(row.code))errors.push('FORBIDDEN:'+row.code);
  }return errors;
}
function checkAdmission(){
  const errors=validateRoster(),source=sourceInventory();
  const {actualLocales}=require('../language_review/audit.cjs');
  const appLocales=actualLocales().languageCatalog.map(x=>x.code);
  if(JSON.stringify(appLocales)!==JSON.stringify(LEGACY_CODES))errors.push('UNREVIEWED_LOCALE_IN_RUNTIME_SELECTOR');
  const draftReport=require('./drafts.cjs').reportDrafts(source);
  for(const issue of draftReport.errors)errors.push('DRAFT:'+issue);
  const dir=path.join(__dirname,'approved');
  for(const f of fs.existsSync(dir)?fs.readdirSync(dir):[]){
    if(!f.endsWith('.json')){errors.push('INVALID_APPROVAL_FILE:'+f);continue;}
    try{
      const pack=JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'));
      if(f!==pack.locale+'.json')errors.push('WRONG_FILENAME:'+f);
      const v=validatePack(pack,source);if(!v.ok)errors.push(...v.errors.map(e=>f+':'+e));
    }catch(e){errors.push('FAILED_TO_READ:'+f+':'+e.message);}
  }
  // An approval claim inside a translation JSON file cannot authenticate its own evidence.
  // Runtime activation is deliberately outside this review-only contract.
  if(fs.existsSync(dir)&&fs.readdirSync(dir).length)errors.push('EXTERNAL_APPROVAL_REQUIRED_BEFORE_RUNTIME_ACTIVATION');
  return {ok:errors.length===0,errors,registered:100,existingUnchanged:20,plannedNotSelectable:80,
    catalogs:Object.keys(source).length,keys:Object.values(source).reduce((n,v)=>n+Object.keys(v).length,0),
    sourceHash:inventoryHash(source),draftCandidates:draftReport.candidateCount,
    candidateStrings:draftReport.translatedCandidates,missingDraftStrings:draftReport.languages.reduce((n,r)=>n+r.missing,0),
    linguisticReview:'NOT_TESTED',android100Languages:'NOT_TESTED',releaseApproved:false};
}
module.exports={REGISTRY,LEGACY_CODES,normalize,resolve,validatePack,inventoryHash,sourceInventory,validateRoster,checkAdmission};
if(require.main===module){
  try{
    const args=process.argv.slice(2);
    if(args.length===1&&args[0]==='--check'){
      const result=checkAdmission();console.log(JSON.stringify(result,null,2));process.exitCode=result.ok?0:1;
    }else if(args.length===2&&args[0]==='--template'){
      const lang=resolve(args[1]);if(!lang||lang.phase!=='planned')throw Error('UNKNOWN_CANDIDATE');
      const source=sourceInventory(),strings=Object.fromEntries(Object.entries(source).map(([id,keys])=>[id,Object.fromEntries(Object.keys(keys).map(k=>[k,null]))]));
      console.log(JSON.stringify({locale:lang.code,inventorySha256:inventoryHash(source),strings,review:{
        reviewer:null,reviewedAt:null,contextReview:'NOT_TESTED',androidWebView:'NOT_TESTED',rtlLtr:'NOT_TESTED',
        accessibility:'NOT_TESTED',nativeUi:'NOT_TESTED',westernDigits:'NOT_TESTED',offline:'NOT_TESTED',
        dataSafety:'NOT_TESTED',identicalApproved:[],evidence:[]}},null,2));
    }else throw Error('Usage: guard.cjs --check or guard.cjs --template <planned locale>');
  }catch(e){console.error('LOCALE_REVIEW_NOT_TESTED:',e.message);process.exitCode=1;}
}

