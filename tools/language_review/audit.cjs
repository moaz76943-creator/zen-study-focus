#!/usr/bin/env node
'use strict';
// RECOVERY-13: read-only language audit; not loaded by Android or WebView.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../../android/app/src/main/assets/web');
const LANGS=['en','ar','es','zh','hi','fr','de','ru','pt','ja','id','tr','ko','vi','it','bn','ur','fa','pl','nl'];
const RTL=new Set(['ar','fa','ur']);
const FILES=['index.html','app.js','locale_rows.js','locale_extras.js','locale_premium_v22.js',
'localization_20_recovery.js','quick_training.js','notes_studio.js','notes_editor_ui.js',
'tasks_studio.js','analytics_studio.js','analytics_recovery_ui.js','goals_studio.js',
'timer_settings.js','completion_alert_settings.js','nature_audio_recovery_v1.js',
'sound_mix_controls.js','integration_v22.js','interaction_recovery_06.js'];
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const valid=x=>typeof x==='string'&&x.trim().length>0;
function flatten(x,p='',out={}){
 if(Array.isArray(x)){x.forEach((v,i)=>flatten(v,p+'.'+i,out));return out;}
 if(x&&typeof x==='object'){for(const k of Object.keys(x))flatten(x[k],p?p+'.'+k:k,out);return out;}
 if(typeof x==='string')out[p]=x;
 return out;
}
function block(source,startAt,needle){
 const pos=source.indexOf(needle,startAt);
 if(pos<0)return null;
 const open=source.slice(pos+needle.length).search(/[\[{]/);
 if(open<0)return null;
 const begin=pos+needle.length+open,stack=[source[begin]==='{'?'}':']'];
 let quote=null,escaped=false;
 for(let i=begin+1;i<source.length;i++){
  const c=source[i];
  if(quote){
   if(escaped){escaped=false;continue;}
   if(c==='\\'){escaped=true;continue;}
   if(c===quote)quote=null;
   continue;
  }
  if(c==='"'||c==="'"||c.charCodeAt(0)===96){quote=c;continue;}
  if(c==='{'||c==='['||c==='(')stack.push(c==='{'?'}':c==='['?']':')');
  if(c==='}'||c===']'||c===')'){
   if(stack.pop()!==c)return null;
   if(!stack.length){
    try{return vm.runInNewContext('('+source.slice(begin,i+1)+')',{}, {timeout:500});}
    catch(_){return null;}
   }
  }
 }
 return null;
}
function bilingual(filename,marker){
 const s=read(filename),at=s.indexOf(marker);
 if(at<0)return {};
 const slice=s.slice(at),out={};
 for(const l of ['en','ar']){
  const re=new RegExp('\\b'+l+'\\s*:\\s*(?=[\\[{])'),m=re.exec(slice);
  if(m){const value=block(slice,m.index,m[0]);if(value)out[l]=flatten(value);}
 }
 return out;
}
function actualLocales(){
 const c=vm.createContext({window:{},document:{addEventListener(){}},console});
 for(const f of ['locale_rows.js','locale_extras.js'])
  vm.runInContext(read(f),c,{filename:f,timeout:2000});
 const app=read('app.js'),boundary=app.indexOf('let todayISO =');
 if(boundary<0)throw Error('Changed v21 locale bootstrap boundary');
 vm.runInContext(app.slice(0,boundary)+'\nthis.auditDict=DICT;this.auditCatalog=LANG_CATALOG;',c,
  {filename:'app.js:locale bootstrap',timeout:3000});
 vm.runInContext(read('locale_premium_v22.js'),c,{filename:'locale_premium_v22.js',timeout:2000});
 vm.runInContext(read('localization_20_recovery.js'),c,
  {filename:'localization_20_recovery.js',timeout:2000});
 const qt=read('quick_training.js'),end=qt.indexOf('let quickTraining');
 if(end<0)throw Error('Changed quick-training dictionary boundary');
 vm.runInContext(qt.slice(0,end)+'\nthis.auditQuick={keys:QUICK_KEYS,rows:QUICK_TRANSLATIONS};',c,
  {filename:'quick_training.js:catalog',timeout:2000});
 return {dict:c.auditDict,languageCatalog:c.auditCatalog,premium:c.window.DF22Locale,
  recovery:c.DeepFocusLocale20Recovery||c.window.DeepFocusLocale20Recovery,quick:c.auditQuick};
}
function coreScreen(k){
 if(/^(mode|calc|startFocus|orbDesk)/.test(k))return 'timer';
 if(/^(navTasks|filter|phAddTask|sampleTasks)/.test(k))return 'tasks';
 if(/^(navNotes|phSearchNotes|tag|lblBlur|orbDump|sampleNotes)/.test(k))return 'notes';
 if(/^(navSounds|sounds\.|sndCat|mixer|btnMyMix|btnStopAll)/.test(k))return 'sounds';
 if(/^(navAnalytics|kpi|overview|badgeThis|waveFlow|peakPerf)/.test(k))return 'analytics';
 if(/^(dom|cat|sportSets|readTracker)/.test(k))return 'goals';
 if(/^(navCalendar|weekdays|months|btnAddCalNote)/.test(k))return 'calendar';
 if(/^(pill|orbCloud|btnSave|btnCancel)/.test(k))return 'settings';
 return 'navigation';
}
function premiumScreen(k){
 if(/^(start|pause|resume|reset|focus|shortBreak|longBreak|timerLabel)/.test(k))return 'timer';
 if(/^(tasks|emptyTasks|newTask)/.test(k))return 'tasks';
 if(/^(notes|emptyNotes|newNote)/.test(k))return 'notes';
 if(/^(analytics|emptyAnalytics|noData)/.test(k))return 'analytics';
 return k==='quickTraining'?'training':'dialogs';
}
function catalogs(){
 const runtime=actualLocales(),out=[];
 function add(id,screen,file,localeValues){
  const en=localeValues.en||{},keys=Object.keys(en);
  if(keys.length)out.push({id,screen,file,keys,localeValues});
 }
 const full={};for(const lang of LANGS)full[lang]=flatten(runtime.dict[lang]||{});
 for(const screen of new Set(Object.keys(full.en).map(coreScreen))){
  const values={};for(const lang of LANGS)values[lang]=Object.fromEntries(
   Object.entries(full[lang]).filter(([k])=>coreScreen(k)===screen));
  add('core.'+screen,screen,'app.js + locale_rows.js + locale_extras.js',values);
 }
 const premium={};for(const lang of LANGS)premium[lang]=runtime.premium.translations[lang]||{};
 for(const screen of new Set(Object.keys(premium.en).map(premiumScreen))){
  const values={};for(const lang of LANGS)values[lang]=Object.fromEntries(
   Object.entries(premium[lang]).filter(([k])=>premiumScreen(k)===screen));
  add('premium.'+screen,screen,'locale_premium_v22.js',values);
 }
 add('analytics.dictionary','analytics','localization_20_recovery.js',runtime.recovery.translations);
 const quick={};for(const lang of LANGS)quick[lang]=Object.fromEntries(runtime.quick.keys.map(
  (k,i)=>[k,(runtime.quick.rows[lang]||[])[i]]));
 add('quick.training','training','quick_training.js',quick);
 for(const [file,marker,screen,id] of [
  ['notes_studio.js','const NS_STRINGS','notes','notes.studio'],
  ['notes_editor_ui.js','const languages','notes','notes.editor'],
  ['tasks_studio.js','const labels','tasks','tasks.studio'],
  ['goals_studio.js','const GOAL_UI','goals','goals.studio'],
  ['timer_settings.js','const TSET_I18N','settings','timer.settings']])
  add(id,screen,file,bilingual(file,marker));
 // These two modules are NOT fully covered by the separate analytics translations.
 const ui=read('analytics_recovery_ui.js');
 const fallback=block(ui,0,'const fallback=Object.freeze(');
 if(fallback)add('analytics.recovery.ui','analytics','analytics_recovery_ui.js',{en:flatten(fallback)});
 const alerts=block(read('completion_alert_settings.js'),0,'const CHOICES=Object.freeze(');
 if(Array.isArray(alerts))add('sounds.alerts','sounds','completion_alert_settings.js',
  {en:Object.fromEntries(alerts.map(x=>[x.id,x.label]))});
 // Legacy analytics studio selects en/ar inline; count as one locale-sensitive unit.
 if(read('analytics_studio.js').includes("opts.locale==='ar'"))
  add('analytics.studio','analytics','analytics_studio.js',
   {en:{labels:'English-only / Arabic-only inline analytics labels'},
    ar:{labels:'تسميات التحليلات'}});
 return {out,runtime};
}
function unmarked(){
 const found=[],html=read('index.html');
 function add(file,s,idx,kind){
  s=String(s).replace(/\s+/g,' ').trim();
  if(!/[A-Za-z]{3}/.test(s)||s.length<4||s.length>170)return;
  found.push({file,line:read(file).slice(0,idx).split('\n').length,kind,text:s});
 }
 const visible=/<(button|span|label|h[1-6]|small|strong|p|option|title|div)\b([^>]*)>([^<>]{3,170})<\/\1>/gi;
 let m;while((m=visible.exec(html)))
  if(!/data-(?:i18n|qt|df22-i18n|df20-i18n)/i.test(m[2]))
   add('index.html',m[3],m.index,'unmarked_html_text');
 const attrs=/<(?:input|button|textarea|select|a)\b[^>]{0,360}?\b(placeholder|aria-label|title)="([^"]{3,150})"[^>]*>/gi;
 while((m=attrs.exec(html)))
  if(!/data-(?:i18n|qt-placeholder|df22-placeholder|df22-aria-label)/i.test(m[0]))
   add('index.html',m[2],m.index,'unmarked_html_attribute');
 for(const file of FILES.filter(f=>f.endsWith('.js')&&!/^locale_|^localization_/.test(f))){
  const s=read(file),re=/(?:showToast|alert|confirm)\s*\(\s*(['"])(.{4,150}?)\1/g;
  while((m=re.exec(s)))add(file,m[2],m.index,'static_js_message_candidate');
 }
 return found;
}
function audit(){
 const {out,runtime}=catalogs(),screens=[...new Set(out.map(c=>c.screen))].sort();
 const coverage={},missing=[],englishIdentical=[],eastern=[];
 for(const l of LANGS){
  coverage[l]={};
  for(const s of screens)coverage[l][s]={present:0,total:0,missing:0,englishIdentical:0,percent:0};
  for(const c of out){
   const bucket=coverage[l][c.screen],row=c.localeValues[l]||{},base=c.localeValues.en;
   for(const k of c.keys){
    const t=row[k],original=base[k];bucket.total++;
    if(valid(t)){
     bucket.present++;
     if(l!=='en'&&t===original&&/[A-Za-z]{3}/.test(t)&&t.length>=8){
      bucket.englishIdentical++;
      englishIdentical.push({language:l,catalog:c.id,key:k,value:t});
     }
     if(/[\u0660-\u0669\u06f0-\u06f9]/.test(t))
      eastern.push({language:l,catalog:c.id,key:k,value:t});
    }else{
     bucket.missing++;
     missing.push({language:l,catalog:c.id,key:k,english:original});
    }
   }
  }
  for(const b of Object.values(coverage[l]))b.percent=b.total?Math.round(10000*b.present/b.total)/100:0;
 }
 const warnings=[];
 for(const l of LANGS){
  const entry=runtime.languageCatalog.find(x=>x.code===l);
  if(!entry||entry.dir!==(RTL.has(l)?'rtl':'ltr'))
   warnings.push('Direction mismatch: '+l);
  if(Object.keys(runtime.dict[l]||{}).sort().join('|')!==
     Object.keys(runtime.dict.en||{}).sort().join('|'))
   warnings.push('Core key mismatch: '+l);
 }
 return {schema:1,pinnedSha:'0dd9239bc28978e11f41c1c0f618c9662b291fe2',
  measurement:'Explicit source string catalog entries, NOT full displayed UI coverage',
  languages:LANGS.map(code=>({code,dir:RTL.has(code)?'rtl':'ltr'})),
  catalogs:out.map(c=>({id:c.id,screen:c.screen,file:c.file,keys:c.keys.length,
   explicitLocales:LANGS.filter(l=>c.keys.every(k=>valid((c.localeValues[l]||{})[k])))})),
  screens,coverage,missing,englishIdentical,eastern,staticCandidates:unmarked(),warnings,
  limits:['Source-level static analysis; unmarked literals need human inspection',
  'Native-speaker naturalness unverified','Actual Android WebView RTL/rendering untested',
  'English-identical phrases are warnings and may be valid','User-entered records are not inspected']};
}
function proposals(r){
 // Reuse only an independently existing translated label with the same English
 // meaning. This is a suggestion with provenance, never production activation.
 const {out}=catalogs(),normal=s=>String(s||'').normalize('NFKC')
  .replace(/\s+/g,' ').trim().toLocaleLowerCase('en');
 const library={};for(const l of LANGS)library[l]=new Map();
 for(const c of out){
  for(const key of c.keys){
   const en=c.localeValues.en[key];
   if(!valid(en))continue;
   for(const l of LANGS.filter(x=>x!=='en')){
    const localized=(c.localeValues[l]||{})[key];
    if(!valid(localized)||localized===en)continue;
    const id=normal(en),list=library[l].get(id)||[];
    list.push({text:localized,source:c.id+'.'+key});
    library[l].set(id,list);
   }
  }
 }
 const byKey={};
 for(const item of r.missing){
  const id=item.catalog+'.'+item.key;
  if(!byKey[id])byKey[id]={catalog:item.catalog,key:item.key,english:item.english,
   translations:{},reviewRequired:true};
  const matches=(library[item.language].get(normal(item.english))||[])
   .filter(x=>x.source!==id);
  const unique=new Map();for(const m of matches)if(!unique.has(m.text))unique.set(m.text,m.source);
  if(unique.size===1){
   const [text,source]=unique.entries().next().value;
   byKey[id].translations[item.language]={
    suggestion:text,status:'REUSE_CANDIDATE_NEEDS_REVIEW',provenance:source};
  }else if(unique.size>1){
   byKey[id].translations[item.language]={
    suggestion:null,status:'AMBIGUOUS_REUSE_NEEDS_REVIEW',
    alternatives:[...unique.keys()].sort()};
  }else byKey[id].translations[item.language]={
   suggestion:null,status:'NEEDS_TRANSLATION'};
 }
 return {schema:1,policy:'Independent candidates, not applied; all suggestions require native review',
  entries:Object.values(byKey)};
}
function reportMarkdown(r){
 const lines=['# RECOVERY-13 — actual language catalog audit','',
  'Pinned PR #25 SHA: '+r.pinnedSha,'',
  '**Percentages measure explicit available text keys, NOT end-to-end rendered UI translation.**','',
  '| Lang | Dir | '+r.screens.join(' | ')+' |',
  '|---|---|'+r.screens.map(()=>'---:').join('|')+'|'];
 for(const l of r.languages)
  lines.push('| '+l.code+' | '+l.dir+' | '+
   r.screens.map(s=>r.coverage[l.code][s].percent.toFixed(1)+'%').join(' | ')+' |');
 lines.push('','## Incomplete source catalogs','','');
 for(const c of r.catalogs.filter(c=>c.explicitLocales.length!==20))
  lines.push('- '+c.id+': '+c.keys+' keys, languages with explicit entries: '+c.explicitLocales.join(', '));
 lines.push('','## Findings','',
  '- Missing explicit source translations: '+r.missing.length,
  '- Identical-to-English candidates for native review: '+r.englishIdentical.length,
  '- Literal candidates in HTML/JavaScript: '+r.staticCandidates.length,
  '- Catalog values containing Eastern digits: '+r.eastern.length,
  '- Direction / core-shape warnings: '+r.warnings.length,
  '', 'The JSON report records exact catalog keys, candidate text and source line numbers.',
  'The proposed translations file is structured for every known gap; null explicitly means not translated.',
  '', '## Required follow-up',
  'Native-language translation review, WebView screen tests for every locale, RTL/LTR layout,',
  'generated ASCII digits 0123456789 without modifying user-authored notes/tasks, and',
  'review of dialogs, export notifications, accessibility strings, and text from Android.','',
  'No shipped locale code or central dictionary is modified by this audit.','');
 return lines.join('\n');
}
function main(args=process.argv.slice(2)){
 const r=audit();
 if(args.length){
  if(args.length!==2||args[0]!=='--out')throw Error('Usage: audit.cjs [--out DIRECTORY]');
  fs.mkdirSync(args[1],{recursive:true});
  fs.writeFileSync(path.join(args[1],'coverage.json'),JSON.stringify(r,null,2)+'\n');
  fs.writeFileSync(path.join(args[1],'proposals.json'),JSON.stringify(proposals(r),null,2)+'\n');
  fs.writeFileSync(path.join(args[1],'REPORT.md'),reportMarkdown(r));
 }else console.log(JSON.stringify({languages:r.languages.length,screens:r.screens.length,
  catalogs:r.catalogs.length,missing:r.missing.length,candidates:r.staticCandidates.length},null,2));
 return r;
}
if(require.main===module)main();
module.exports={LANGS,RTL,block,bilingual,actualLocales,catalogs,unmarked,audit,proposals,reportMarkdown,main};
