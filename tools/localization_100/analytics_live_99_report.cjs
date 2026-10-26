#!/usr/bin/env node
'use strict';
// Source-level Analytics localization inventory, not Android/linguistic certification.
// Compare actual registered strings with a missing-value sentinel; never count
// an English fallback, an unreviewed draft, or a locale-menu entry as translated.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const web=path.resolve(__dirname,'../../android/app/src/main/assets/web');
const read=name=>fs.readFileSync(path.join(web,name),'utf8');
function report(){
  const app=read('app.js'),cut=app.indexOf('let todayISO =');
  if(cut<0)throw Error('LANGUAGE_CATALOG_BOUNDARY_CHANGED');
  const c={console,document:{addEventListener(){}}};c.window=c;
  vm.createContext(c);
  vm.runInContext(read('locale_rows.js'),c,{filename:'locale_rows.js'});
  vm.runInContext(read('locale_extras.js'),c,{filename:'locale_extras.js'});
  vm.runInContext(app.slice(0,cut)+'\nthis.codes=LANG_CATALOG.map(x=>x.code);',c);
  for(const name of ['js/df99_multiscreen_i18n.js','js/df99_reviewed_packs.js',
    'localization_20_recovery.js','js/legacy20_analytics_bridge.js'])
    vm.runInContext(read(name),c,{filename:name});
  const ui=read('analytics_studio.js');
  const en=/const EN=Object\.freeze\(\{([\s\S]*?)\n  \}\);/.exec(ui);
  const ar=/const AR=Object\.freeze\(\{([\s\S]*?)\n  \}\);/.exec(ui);
  if(!en||!ar)throw Error('ANALYTICS_UI_KEYS_NOT_FOUND');
  const english=vm.runInNewContext('({'+en[1]+'})');
  const arabic=vm.runInNewContext('({'+ar[1]+'})');
  const keys=Object.keys(english);
  if(keys.length<35||keys.some(k=>typeof arabic[k]!=='string'))throw Error('ANALYTICS_KEYSET_CHANGED');
  const codes=Array.from(c.codes);
  if(codes.length!==99||new Set(codes).size!==99||codes.some(v=>v==='he'||v==='iw'))
    throw Error('EXPECTED_99_LOCALES_WITHOUT_HEBREW');
  const MISSING='__DF09_SOURCE_MISSING_REPORT__';
  const languages=codes.map(code=>{
    const translated=code==='en'||code==='ar'?[]:keys.filter(key=>{
      const value=c.DF99Locale.t(code,'analytics',key,MISSING);
      return typeof value==='string'&&value!==MISSING&&value.trim();
    });
    return {code,explicitSourceKeys:translated.length,totalKeys:keys.length,
      englishFallbackKeys:code==='en'||code==='ar'?0:keys.length-translated.length,
      uiInlineSource:code==='en'?'EN':code==='ar'?'AR':null,
      sourcePresentNotDeviceVerified:translated.length>0,
      androidVerified:false,translationFullyReviewed:false};
  });
  return {scope:'source-only-analytics',registered:codes.length,keys:keys.length,
    englishUiKeys:keys.length,arabicUiKeys:Object.keys(arabic).length,
    excluded:['he','iw'],certifiedLanguages:0,androidVerified:false,releaseApproved:false,
    languages};
}
if(require.main===module){
  try{console.log(JSON.stringify(report(),null,2));}
  catch(e){console.error('DF09_COVERAGE_FAILED',e.message);process.exitCode=1;}
}
module.exports={report};
