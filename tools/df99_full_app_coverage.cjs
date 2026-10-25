#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const base=path.resolve(__dirname,'../android/app/src/main/assets/web');
const read=x=>fs.readFileSync(path.join(base,x),'utf8');
const app=read('app.js'),quick=read('quick_training.js');
const cx={window:{},document:{addEventListener(){}},console};
vm.createContext(cx);
vm.runInContext(read('locale_rows.js'),cx);
vm.runInContext(read('locale_extras.js'),cx);
const appEnd=app.indexOf('let todayISO =');
if(appEnd<0)throw Error('App dictionary boundary changed');
vm.runInContext(app.slice(0,appEnd)+'\nthis.catalog=LANG_CATALOG;this.core=DICT;',cx);
const quickEnd=quick.indexOf('let quickTraining = null;');
if(quickEnd<0)throw Error('Quick dictionary boundary changed');
vm.runInContext(quick.slice(0,quickEnd)+'\nthis.quick=QUICK_TRANSLATIONS;',cx);
vm.runInContext(read('locale_premium_v22.js'),cx);
vm.runInContext(read('js/df99_multiscreen_i18n.js'),cx);
vm.runInContext(read('js/df99_reviewed_packs.js'),cx);
const codes=cx.catalog.map(x=>x.code);
if(codes.length!==99||new Set(codes).size!==99||codes.some(x=>x==='he'||x==='iw'))throw Error('99-language catalog invalid');
const keyCount={
  timer:11,goals:15,tasks:64,notes:36,analytics:17,analyticsDomain:4
};
const expected=Object.fromEntries(Object.entries(keyCount).map(([family,n])=>{
  if(family==='timer'||family==='notes')return [family,Array.from({length:n},(_,i)=>String(i))];
  if(family==='goals')return [family,['kicker','heading','desc','edit','modal','hint','save','invalid','noGoal','minute','done','today','week','weekTarget','weekInvalid']];
  if(family==='analyticsDomain')return [family,['study','read','work','sport']];
  if(family==='analytics')return [family,['title','activity','period','start','end','minutes','sessions','average','streak','noData','goal','noGoals','tasks','chart','year','export','details']];
  return [family,['title','subtitle','add','project','today','search','all','board','matrix','trash','calendar','undo','redo','empty','task','desc','due','time','cat','priority','estimate','repeat','group','notes','proj','none','save','cancel','focus','edit','done','resume','archive','remove','restore','addCheck','check','sub','study','sport','review','exam','todo','doing','completed','archived','low','medium','high','urgent','daily','weekly','monthly','never','allCategories','estimated','actual','overdue','do','schedule','delegate','eliminate','invalid','notConnected']];
}));
// Count actual available localized strings; do not pass fallback English off as translation.
const summary=codes.map(code=>{
  const area=Object.fromEntries(Object.entries(expected).map(([family,keys])=>{
    const local=cx.window.DF99Locale.coverage([code],family,keys)[0];
    return [family,`${local.translated}/${local.total}`];
  }));
  return {code,core:!!cx.core[code],quick:!!cx.quick[code],areas:area};
});
const out={target:99,core:Object.keys(cx.core).length,quick:Object.keys(cx.quick).length,
  premium:Object.keys(cx.window.DF22Locale.translations).length,
  missingCore:codes.filter(code=>!cx.core[code]),missingQuick:codes.filter(code=>!cx.quick[code]),
  sections:expected,summary,
  note:'Counts are only verified dictionary availability. Full translation requires reviewed native strings and real Android screen verification.'};
if(process.argv.includes('--json'))console.log(JSON.stringify(out,null,2));
else{
 console.log(`CATALOG=${out.target} CORE=${out.core} QUICK=${out.quick} PREMIUM=${out.premium}`);
 console.log(`CORE_MISSING=${out.missingCore.length} QUICK_MISSING=${out.missingQuick.length}`);
 for(const row of summary.slice(0,8))console.log(row.code+' '+Object.entries(row.areas).map(([a,n])=>`${a}=${n}`).join(' '));
 console.log('All 99 per-language results: node tools/df99_full_app_coverage.cjs --json');
}
