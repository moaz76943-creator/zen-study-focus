#!/usr/bin/env node
'use strict';
/* Source-only i18n measurement. NEVER report this as Android E2E. */
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const cp=require('node:child_process');
const ROOT=path.resolve(__dirname,'../../..');
const WEB=path.join(ROOT,'android/app/src/main/assets/web');
const read=name=>fs.readFileSync(path.join(WEB,name),'utf8');
const SECTIONS=['sec-timer','sec-tasks','sec-calendar','sec-notes','sec-sounds','sec-analytics'];
const REQUIRED_AREAS=Object.freeze(['timer','goals','tasks','notes','analytics','analyticsDomain']);
function fraction(value) {
  const m=/^(\d+)\/(\d+)$/.exec(value||'');
  if(!m)throw Error('Malformed translated/total: '+value);
  const translated=Number(m[1]),total=Number(m[2]);
  if(translated>total || total<=0)throw Error('Invalid coverage: '+value);
  return {translated,total,missing:total-translated};
}
function summarize(raw,source,sha) {
  if(!raw || raw.target!==99 || !Array.isArray(raw.summary))throw Error('Not a 99-locale inventory');
  if(raw.summary.length!==99 || new Set(raw.summary.map(x=>x.code)).size!==99)throw Error('Duplicate/missing locale');
  if(raw.summary.some(x=>x.code==='he'||x.code==='iw'))throw Error('Excluded language detected');
  const langs=raw.summary.map(entry=>{
    const sections=Object.fromEntries(Object.entries(entry.areas||{}).map(([name,value])=>[name,fraction(value)]));
    const unmeasured=REQUIRED_AREAS.filter(area=>!Object.hasOwn(sections,area));
    const counts=Object.values(sections).reduce((n,v)=>({translated:n.translated+v.translated,total:n.total+v.total,missing:n.missing+v.missing}),{translated:0,total:0,missing:0});
    const observed=source[entry.code]||{core:null,quick:null};
    const reasons=[];
    for(const area of unmeasured)reasons.push('SECTION_NOT_MEASURED:'+area);
    if(!entry.core)reasons.push('CORE_DICTIONARY_MISSING');
    if(!entry.quick)reasons.push('QUICK_DICTIONARY_MISSING');
    if(counts.missing)reasons.push('SECTION_TRANSLATIONS_FALLBACK_OR_ABSENT');
    if(observed.core!==null && observed.core>0)reasons.push('CORE_EMPTY_STRINGS');
    if(observed.quick!==null && observed.quick>0)reasons.push('QUICK_EMPTY_STRINGS');
    return {
      code:entry.code,status:reasons.length?'FAIL':'PASS',core_present:entry.core,quick_present:entry.quick,
      source_empty_strings:observed,sections,translated:counts.translated,
      total:counts.total,missing_or_fallback:counts.missing,reasons,
      android_e2e:'NOT_TESTED'
    };
  });
  return {task_id:'DF-LANE-13-REAL-END-TO-END-QA',kind:'SOURCE_DICTIONARY_AUDIT_NOT_ANDROID',
    SOURCE_SHA:sha,catalog_count:99,summary:{PASS:langs.filter(x=>x.status==='PASS').length,FAIL:langs.filter(x=>x.status==='FAIL').length,NOT_TESTED:0},
    per_language_coverage:langs,device_matrix_status:'NOT_TESTED',
    measurement_note:'Translation strings are measured from registered dictionaries. Fallback/missing is NOT translated; Android E2E is independent.'};
}
function countBlankStrings(value) {
  if(typeof value==='string')return Number(value.trim().length===0);
  if(Array.isArray(value))return value.reduce((a,b)=>a+countBlankStrings(b),0);
  if(value && typeof value==='object')return Object.values(value).reduce((a,b)=>a+countBlankStrings(b),0);
  return 0;
}
function sourceEmptyCounts() {
  const app=read('app.js'),quick=read('quick_training.js');
  const a=app.indexOf('let todayISO ='),b=quick.indexOf('let quickTraining = null;');
  if(a<0||b<0)throw Error('Dictionary initialization boundary changed');
  const ctx={window:{},document:{addEventListener(){}},console};
  vm.createContext(ctx);
  for(const f of ['locale_rows.js','locale_extras.js'])vm.runInContext(read(f),ctx,{filename:f,timeout:2500});
  vm.runInContext(app.slice(0,a)+'\nthis.__core=DICT;this.__catalog=LANG_CATALOG;',ctx,{filename:'app:catalog',timeout:5000});
  vm.runInContext(quick.slice(0,b)+'\nthis.__quick=QUICK_TRANSLATIONS;',ctx,{filename:'quick:catalog',timeout:5000});
  const source={};
  for(const {code} of ctx.__catalog||[])source[code]={
    core:Object.hasOwn(ctx.__core,code)?countBlankStrings(ctx.__core[code]):null,
    quick:Object.hasOwn(ctx.__quick,code)?countBlankStrings(ctx.__quick[code]):null
  };
  return source;
}
// Independently enumerate absent section keys for translation lane handoff.
function missingKeysByLanguage(raw) {
  const ctx={window:{},document:{addEventListener(){}},console};
  vm.createContext(ctx);
  for(const file of ['locale_rows.js','locale_extras.js'])vm.runInContext(read(file),ctx,{filename:file,timeout:2500});
  const app=read('app.js'),quick=read('quick_training.js');
  const a=app.indexOf('let todayISO ='),b=quick.indexOf('let quickTraining = null;');
  if(a<0||b<0)throw Error('Dictionary initialization moved');
  vm.runInContext(app.slice(0,a),ctx,{filename:'app:catalog',timeout:5000});
  vm.runInContext(quick.slice(0,b),ctx,{filename:'quick:catalog',timeout:5000});
  for(const file of ['locale_premium_v22.js','js/df99_multiscreen_i18n.js','js/df99_reviewed_packs.js'])
    vm.runInContext(read(file),ctx,{filename:file,timeout:5000});
  if(!ctx.window.DF99Locale?.coverage)throw Error('Runtime i18n coverage registry not present');
  const keys=raw.sections;
  for(const area of REQUIRED_AREAS)
    if(!Array.isArray(keys?.[area])||keys[area].length===0)throw Error('Missing source key inventory: '+area);
  return Object.fromEntries(raw.summary.map(lang=>[lang.code,Object.fromEntries(
    REQUIRED_AREAS.map(area=>[area,keys[area].filter(key=>
      ctx.window.DF99Locale.coverage([lang.code],area,[key])[0].translated===0)])
  )]));
}

const DETAIL_FAMILIES=Object.freeze([
 ['timer','Timer','D'],['tasks','Tasks','E'],['notes','Notes','E'],
 ['goals','Goals','D'],['analytics','Analytics','F'],['analyticsDomain','Analytics Domain','F']
]);
const REVIEWED_FILE='android/app/src/main/assets/web/js/df99_reviewed_packs.js';
function auditSection({code,section,keys,read,english={},owner='UNASSIGNED',source_file=null}) {
 if(keys!==null&&(!Array.isArray(keys)||new Set(keys).size!==keys.length||
    keys.some(k=>typeof k!=='string'||!k)))throw Error('Invalid source keys: '+section);
 const baseUnverified=(code==='en'||code==='ar')&&DETAIL_FAMILIES.some(x=>x[1]===section||x[0]===section);
 const row={language_code:code,section,owner,source_file,expected_keys:keys===null?null:keys.length,
  present_keys:0,missing_keys:[],empty_values:[],fallback_count:0,
  english_identical_candidates:[],duplicate_value_candidates:[],
  unverified_keys:[],status:'NOT_TESTED',
  evidence:baseUnverified?'BASE_LANGUAGE_COVERAGE_REGISTRY_BYPASS':'SOURCE_DICTIONARY'};
 if(keys===null||typeof read!=='function') {
   row.missing_keys=null;row.unverified_keys=keys===null?null:keys.slice();
   row.evidence='NO_MEASURED_KEY_INVENTORY';return row;
 }
 if(baseUnverified) {
   row.unverified_keys=keys.slice();row.fallback_count=keys.length;return row;
 }
 const duplicates=new Map(),common=new Set(['Start','Pause','Resume','Reset','Save','Cancel','Done','Tasks','Notes','Home','Work','Reading']);
 for(const key of keys) {
   const probe=read(key);
   if(!probe||probe.proven!==true) {
     row.missing_keys.push(key);row.fallback_count++;continue;
   }
   if(typeof probe.value!=='string'||!probe.value.trim()) {
     row.empty_values.push(key);continue;
   }
   row.present_keys++;
   const value=probe.value.trim().normalize('NFC');
   const baseline=Object.prototype.hasOwnProperty.call(english,key)?english[key]:null;
   if(code!=='en'&&((typeof baseline==='string'&&value===baseline.trim().normalize('NFC'))||
      (baseline===null&&common.has(value))))row.english_identical_candidates.push(key);
   const ids=duplicates.get(value)||[];ids.push(key);duplicates.set(value,ids);
 }
 row.duplicate_value_candidates=[...duplicates.values()].filter(x=>x.length>1);
 row.status=(row.missing_keys.length||row.empty_values.length)?'FAIL':'PASS';
 return row;
}
function makeRepairQueue(audits) {
 const items=audits.filter(x=>(x.missing_keys?.length||0)>0||x.empty_values.length>0||
    (x.unverified_keys?.length||0)>0||x.english_identical_candidates.length>0||
    x.duplicate_value_candidates.length>0||x.status==='NOT_TESTED').map(x=>({
   owner:x.owner,source_file:x.source_file,language_code:x.language_code,section:x.section,
   status:x.status,missing_keys:x.missing_keys,empty_values:x.empty_values,
   unverified_keys:x.unverified_keys,fallback_count:x.fallback_count,
   english_identical_candidates:x.english_identical_candidates,
   duplicate_value_candidates:x.duplicate_value_candidates,
   action:x.status==='NOT_TESTED'?'VERIFY_SOURCE_INVENTORY':x.status==='FAIL'?'TRANSLATE_MISSING_OR_EMPTY':'REVIEW_CANDIDATES'
 })).sort((a,b)=>a.owner.localeCompare(b.owner,'en')||
    String(a.source_file).localeCompare(String(b.source_file),'en')||
    a.language_code.localeCompare(b.language_code,'en')||a.section.localeCompare(b.section,'en'));
 const assignments={};
 for(const x of items) {
   const group=assignments[x.owner]||={};
   const file=x.source_file||'NO_VERIFIED_NATIVE_TRANSLATION_SOURCE';
   (group[file]||=[]).push({language_code:x.language_code,section:x.section,
     action:x.action,missing_keys:x.missing_keys,empty_values:x.empty_values,
     unverified_keys:x.unverified_keys});
 }
 return {scope:'SOURCE_TRANSLATION_REPAIR_NOT_ANDROID',assignments,items};
}
function detailedSourceAudit(raw) {
 const ctx={window:{},document:{addEventListener(){}},console};
 vm.createContext(ctx);
 for(const file of ['locale_rows.js','locale_extras.js'])
   vm.runInContext(read(file),ctx,{filename:file,timeout:2500});
 const app=read('app.js'),quick=read('quick_training.js');
 const a=app.indexOf('let todayISO ='),b=quick.indexOf('let quickTraining = null;');
 if(a<0||b<0)throw Error('Dictionary initialization boundary changed');
 vm.runInContext(app.slice(0,a)+'\nthis.__core=DICT;this.__catalog=LANG_CATALOG;',ctx,
   {filename:'app:catalog',timeout:5000});
 vm.runInContext(quick.slice(0,b)+'\nthis.__quick=QUICK_TRANSLATIONS;this.__quickKeys=QUICK_KEYS;',ctx,
   {filename:'quick:catalog',timeout:5000});
 for(const file of ['locale_premium_v22.js','js/df99_multiscreen_i18n.js','js/df99_reviewed_packs.js'])
   vm.runInContext(read(file),ctx,{filename:file,timeout:5000});
 const codes=ctx.__catalog.map(x=>x.code);
 if(codes.length!==99||new Set(codes).size!==99||codes.some(x=>x==='he'||x==='iw')||
   codes.some(x=>!raw.summary.some(y=>y.code===x)))throw Error('Coverage source catalog mismatch');
 const coreKeys=Object.keys(ctx.__core.en||{}).sort(),quickKeys=Array.from(ctx.__quickKeys||[]);
 if(!coreKeys.length||!quickKeys.length||new Set(quickKeys).size!==quickKeys.length)
   throw Error('Cannot measure Core or Quick Training baseline');
 const englishCore=ctx.__core.en;
 const englishQuick=Object.fromEntries(quickKeys.map((k,i)=>[k,ctx.__quick.en?.[i]]));
 const result=[];
 for(const {code} of raw.summary) {
   for(const [family,label,owner] of DETAIL_FAMILIES) {
     const keys=raw.sections?.[family];
     if(!Array.isArray(keys)||!keys.length) {
       result.push(auditSection({code,section:label,keys:null,owner,source_file:REVIEWED_FILE}));continue;
     }
     result.push(auditSection({code,section:label,keys,owner,source_file:REVIEWED_FILE,
       read:key=>{
         const measured=ctx.window.DF99Locale.coverage([code],family,[key])[0].translated===1;
         const value=ctx.window.DF99Locale.t(code,family,key,'__DF13_UNTRANSLATED__');
         return {proven:measured&&value!=='__DF13_UNTRANSLATED__',value};
       }}));
   }
   const core=ctx.__core[code];
   result.push(auditSection({code,section:'Core',keys:coreKeys,owner:'F',
     source_file:'android/app/src/main/assets/web/app.js',english:englishCore,
     read:key=>({proven:!!core&&Object.prototype.hasOwnProperty.call(core,key),value:core?.[key]})}));
   const q=ctx.__quick[code];
   result.push(auditSection({code,section:'Quick Training',keys:quickKeys,owner:'F',
     source_file:'android/app/src/main/assets/web/quick_training.js',english:englishQuick,
     read:key=>{const i=quickKeys.indexOf(key);
       return {proven:Array.isArray(q)&&i<q.length,value:q?.[i]};}}));
   // No Android values/strings.xml or localized resource key baseline in this tree.
   result.push(auditSection({code,section:'Native',keys:null,owner:'F',source_file:null}));
 }
 return result;
}

function staticSections() {
  const html=read('index.html');
  const rows=Object.fromEntries(SECTIONS.map(id=>[id,{
    page_present:html.includes('id="'+id+'"'),
    navigation_present:id==='sec-calendar'?html.includes('id="navCalendar"'):
      id==='sec-timer'?html.includes('id="navTimer"'):html.includes('id="nav'+
       ({'sec-tasks':'Tasks','sec-notes':'Notes','sec-sounds':'Sounds','sec-analytics':'Analytics'}[id]||'')+'"')
  }]));
  return rows;
}
function sourceSha() {
  const p=cp.spawnSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'});
  return p.status===0?p.stdout.trim():'UNKNOWN_NO_GIT';
}
function run(outDir,strict) {
  fs.mkdirSync(outDir,{recursive:true});
  const p=cp.spawnSync(process.execPath,[path.join(ROOT,'tools/df99_full_app_coverage.cjs'),'--json'],{
    cwd:ROOT,encoding:'utf8',maxBuffer:16*1024*1024});
  if(p.status!==0)throw Error('Authoritative coverage probe failed: '+p.stderr);
  const raw=JSON.parse(p.stdout);
  const missingKeys=missingKeysByLanguage(raw);
  const result=summarize(raw,sourceEmptyCounts(),sourceSha());
  for(const row of result.per_language_coverage)for(const area of REQUIRED_AREAS) {
    if(!row.sections[area] || row.sections[area].missing!==missingKeys[row.code][area].length)
      throw Error('Coverage count vs missing-key audit mismatch for '+row.code+' '+area);
  }
  const byArea=Object.fromEntries(REQUIRED_AREAS.map(area=>[area,{
    translated:result.per_language_coverage.reduce((n,r)=>n+r.sections[area].translated,0),
    missing:result.per_language_coverage.reduce((n,r)=>n+r.sections[area].missing,0)
  }]));
  result.by_section=byArea;
  fs.writeFileSync(path.join(outDir,'MISSING_TRANSLATION_KEYS.json'),
    JSON.stringify({SOURCE_SHA:result.SOURCE_SHA,scope:'REGISTERED_SOURCE_KEYS_ONLY',by_area:byArea,
      missing_keys_by_language:missingKeys},null,2)+'\n');

  result.static_screen_presence=staticSections();
  result.static_sections_status=Object.values(result.static_screen_presence).every(x=>x.page_present&&x.navigation_present)?'PASS':'FAIL';
  const file=path.join(outDir,'PER_LANGUAGE_COVERAGE.json');
  fs.writeFileSync(file,JSON.stringify(result,null,2)+'\n');
  const head=['# DF-LANE-13 Source-only Coverage','','SOURCE_SHA: '+result.SOURCE_SHA,
    'Catalog: 99; PASS: '+result.summary.PASS+'; FAIL: '+result.summary.FAIL,
    'This is NOT Android verification. Missing or fallback strings are failures.','',
    '| Language | Coverage | Missing / fallback | Empty core / quick | Status |',
    '|---|---:|---:|---:|---|'];
  for(const x of result.per_language_coverage)head.push(
    '| '+x.code+' | '+x.translated+'/'+x.total+' | '+x.missing_or_fallback+
    ' | '+String(x.source_empty_strings.core)+' / '+String(x.source_empty_strings.quick)+
    ' | '+x.status+' |');
  fs.writeFileSync(path.join(outDir,'PER_LANGUAGE_COVERAGE.md'),head.join('\n')+'\n');
  process.stdout.write(JSON.stringify({SOURCE_SHA:result.SOURCE_SHA,summary:result.summary,
    static_sections_status:result.static_sections_status,report:file})+'\n');
  if(strict && (result.summary.FAIL>0 || result.static_sections_status!=='PASS'))process.exitCode=1;
  return result;
}
if(require.main===module) {
  const arg=process.argv.indexOf('--output');
  const out=arg>=0&&process.argv[arg+1]?path.resolve(process.argv[arg+1]):path.join(ROOT,'artifacts/i18n-e2e');
  try{run(out,process.argv.includes('--strict'))}catch(error){console.error(error.stack||String(error));process.exitCode=2;}
}
module.exports={fraction,summarize,countBlankStrings,staticSections,missingKeysByLanguage,run};
