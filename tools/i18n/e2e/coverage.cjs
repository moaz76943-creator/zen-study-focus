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
    const counts=Object.values(sections).reduce((n,v)=>({translated:n.translated+v.translated,total:n.total+v.total,missing:n.missing+v.missing}),{translated:0,total:0,missing:0});
    const observed=source[entry.code]||{core:null,quick:null};
    const reasons=[];
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
  vm.runInContext(app.slice(0,a)+'\nthis.__core=DICT;',ctx,{filename:'app:catalog',timeout:5000});
  vm.runInContext(quick.slice(0,b)+'\nthis.__quick=QUICK_TRANSLATIONS;',ctx,{filename:'quick:catalog',timeout:5000});
  const source={};
  for(const {code} of ctx.LANG_CATALOG||[])source[code]={
    core:Object.hasOwn(ctx.__core,code)?countBlankStrings(ctx.__core[code]):null,
    quick:Object.hasOwn(ctx.__quick,code)?countBlankStrings(ctx.__quick[code]):null
  };
  return source;
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
  const result=summarize(JSON.parse(p.stdout),sourceEmptyCounts(),sourceSha());
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
module.exports={fraction,summarize,countBlankStrings,staticSections,run};
