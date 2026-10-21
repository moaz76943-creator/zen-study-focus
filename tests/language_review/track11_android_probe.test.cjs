'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {LANGS,validateSwitch,validateReopen,expression}=require('../../tools/language_review/track11_android_probe.cjs');
function sampleRows(){
 return LANGS.map(code=>({code,dir:['ar','fa','ur'].includes(code)?'rtl':'ltr',
  actualLang:code,actualDir:['ar','fa','ur'].includes(code)?'rtl':'ltr',
  generatedDigits:'00:25',navProblems:[],layoutOverflow:false,
  userTextPreserved:true,chart:'PASS'}));
}
const base={origin:'file:///android_asset/web/index.html',nativeBridge:true,
  rows:sampleRows(),finalLocale:'ur',storedConfig:true,appReady:true};
test('native switch verdict requires all 20 originally shipped locales, 3 RTL and no silent fallbacks',()=>{
 assert.equal(validateSwitch(base).status,'PASS');
 assert.deepEqual(LANGS.filter(x=>['ar','fa','ur'].includes(x)),['ar','ur','fa']);
 assert.throws(()=>validateSwitch({...base,rows:base.rows.slice(1)}),/TWENTY_LOCALES_REQUIRED/);
 assert.throws(()=>validateSwitch({...base,rows:base.rows.map((r,i)=>i===0?{...r,code:'sw'}:r)}),/TWENTY_LOCALES_REQUIRED/);
 assert.throws(()=>validateSwitch({...base,rows:base.rows.map((r,i)=>i===1?{...r,actualDir:'ltr'}:r)}),/LANGUAGE_RENDER_MISMATCH/);
 assert.throws(()=>validateSwitch({...base,rows:base.rows.map((r,i)=>i===3?{...r,navProblems:['NO_KEY']}:r)}),/LANGUAGE_RENDER_MISMATCH/);
});
test('generated digits and chart accessibility fail closed without rewriting user-authored text',()=>{
 assert.throws(()=>validateSwitch({...base,rows:base.rows.map((r,i)=>i===0?{...r,generatedDigits:'٠٠:٢٥'}:r)}),/NON_LATIN_GENERATED_DIGITS/);
 assert.throws(()=>validateSwitch({...base,rows:base.rows.map((r,i)=>i===1?{...r,userTextPreserved:false}:r)}),/USER_TEXT_CHANGED/);
 assert.throws(()=>validateSwitch({...base,rows:base.rows.map((r,i)=>i===2?{...r,chart:'FAIL'}:r)}),/CHART_A11Y_FAILURE/);
});
test('Android force-stop/reopen must persist selected locale and real native bridge',()=>{
 const o={origin:base.origin,appReady:true,nativeBridge:true,language:'ur',dir:'rtl',storedConfig:true};
 assert.equal(validateReopen(o).status,'PASS');
 assert.throws(()=>validateReopen({...o,language:'en'}),/LOCALE_NOT_PERSISTED/);
 assert.throws(()=>validateReopen({...o,nativeBridge:false}),/NATIVE_BRIDGE_MISSING/);
});
test('device script is bound to installed bundled WebView only and has no network/restore/export calls',()=>{
 for(const stage of ['switch','reopen']){
  const s=expression(stage);
  assert.match(s,/file:\/\/\/android_asset\/web\/index\.html/);
  assert.doesNotMatch(s,/fetch\s*\(|XMLHttpRequest|delete\s+localStorage|verifyAndRestoreBackupCode|exportBackupToFile/);
 }
 assert.throws(()=>expression('promote-language'),/INVALID_STAGE/);
});
