'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = path.resolve(__dirname,'../../../android/app/src/main/assets/web');
const numerals = require(path.join(base,'js/numeral_invariant_guard.js'));
const locales = require(path.join(base,'js/localization_fallback_guard.js'));
const vm = require('node:vm');
const appSource = fs.readFileSync(path.join(base,'app.js'),'utf8');
const catalogStart = appSource.indexOf('const LANG_CATALOG = [');
const catalogEnd = appSource.indexOf('const DICT = {',catalogStart);
assert.ok(catalogStart>=0&&catalogEnd>catalogStart);
const officialCatalog = Array.from(vm.runInNewContext(appSource.slice(catalogStart,catalogEnd)+';LANG_CATALOG'));
const css = name => fs.readFileSync(path.join(base,name),'utf8');

test('generated numeric checks are deterministic over repeated Eastern/Western digits', () => {
  for(let n=0;n<12;n++) {
    assert.equal(numerals.containsOnlyWesternDigits('١۲٣'),false);
    assert.equal(numerals.containsOnlyWesternDigits('0123'),true);
  }
  assert.equal(numerals.containsOnlyWesternDigits(null),false);
  assert.equal(numerals.sanitizeToWesternDigits('٠۱۲٣ - 789'),'0123 - 789');
});
test('timer, date, currency, percent keep Latin digits and stable LTR timing', () => {
  assert.equal(numerals.formatTimerDisplay(65),'\u200E01:05\u200E');
  assert.equal(numerals.formatTimerDisplay(3723),'\u200E01:02:03\u200E');
  assert.equal(numerals.formatTimerDisplay(Infinity),'\u200E00:00\u200E');
  assert.equal(numerals.formatPercentage(23.5),'\u200E24%\u200E');
  assert.equal(numerals.formatDateStamp(new Date(2026,9,25)),'2026-10-25');
  assert.equal(numerals.formatDateStamp('not-a-date'),'');
  assert.equal(numerals.formatSystemNumber(12345.5),'12,345.5');
  assert.equal(numerals.formatSystemNumber(NaN),'');
  assert.match(numerals.formatAmount(1234.5,'USD'),/1,234\.50/);
  assert.doesNotMatch(numerals.formatAmount(1234.5,'USD'),/[٠-٩۰-۹]/);
});
test('user-entered content is never mutated during locale state changes', () => {
  const cfg={lang:'ar',theme:'white',notes:[{title:'ملاحظة ١٢٣'}],tasks:[{title:'کار ۱۲۳'}],session:{elapsed:25}};
  const before=JSON.stringify(cfg),writes=[];
  const result=locales.setSystemLanguage('fa',cfg,{saveFortressData:(k,v)=>{writes.push([k,v]);return true;}});
  assert.equal(result.success,true);
  assert.equal(result.persisted,true);
  assert.equal(result.locale,'fa');
  assert.equal(result.isRtl,true);
  assert.equal(result.config.lang,'fa');
  assert.equal(result.config.notes[0].title,'ملاحظة ١٢٣');
  assert.equal(JSON.stringify(cfg),before);
  assert.deepEqual(writes.map(x=>x[0]),['zen_fortress_cfg_v21']);
  assert.equal(writes[0][1].tasks[0].title,'کار ۱۲۳');
});
test('failed persistence is never reported as a saved language', () => {
  const old={lang:'en',notes:['hello']};
  const r=locales.setSystemLanguage('ur',old,{saveFortressData:()=>{throw Error('quota')}});
  assert.equal(r.success,false);
  assert.equal(r.reason,'LANGUAGE_SAVE_FAILED');
  assert.equal(old.lang,'en');
});
test('locale guard matches official app runtime 99-code catalog, never legacy 100-code registry', () => {
  const expected=officialCatalog.map(item=>item.code);
  assert.equal(expected.length,99);
  assert.equal(new Set(expected).size,99);
  assert.deepEqual(locales.SUPPORTED_LOCALES,expected);
  for(const code of expected) assert.equal(locales.isLocaleAllowed(code),true,code);
  for(const code of ['he','iw','he-IL','iw_IL','xyz','ms','lb','ckb','sd','ug','tt','ba','cv','ceb','jv'])
    assert.equal(locales.isLocaleAllowed(code),false,code);
  assert.equal(locales.isLocaleAllowed('BN-BD'),true);
  assert.equal(locales.isLocaleAllowed('jw'),true);
});
test('direction matches every official runtime script; Latin Kurmanji is LTR', () => {
  for(const entry of officialCatalog) {
    assert.equal(locales.isRtlLocale(entry.code),entry.dir==='rtl',entry.code);
  }
  assert.equal(locales.isRtlLocale('UR-PK'),true);
  assert.equal(locales.isRtlLocale('ku'),false);
  assert.equal(locales.isRtlLocale('yi'),true);
  assert.equal(locales.isRtlLocale('bn'),false);
});
test('missing translations fall back only to English without changing stored notes', () => {
  const packs={en:{SAVE:'Save'},fa:{SAVE:'ذخیره'}};
  assert.equal(locales.resolveTranslation('SAVE','fa',packs),'ذخیره');
  assert.equal(locales.resolveTranslation('SAVE','bn',packs),'Save');
  assert.equal(locales.resolveTranslation('START_TIMER','bn',packs),'Start Timer');
});
test('RTL, wrapping, button focus and narrow devices have specific CSS guards',()=>{
  const white=css('white_2100.css'),ui=css('ui_components_v22.css');
  for(const source of [white,ui]) {
    assert.match(source,/overflow-wrap:\s*anywhere/);
    assert.match(source,/:focus-visible/);
    assert.match(source,/html\[dir="rtl"\]/);
    assert.match(source,/max-inline-size/);
    assert.match(source,/@media\s*\(max-width:\s*360px\)/);
    assert.match(source,/@media\s*\(max-width:\s*430px\)/);
  }
  assert.match(white,/\.seg-pill[\s\S]*?white-space:\s*normal\s*!important/);
  assert.match(ui,/min-block-size:\s*44px/);
  assert.match(ui,/html:lang\(zh\)/);
  assert.match(ui,/html:lang\(ja\)/);
  assert.match(ui,/html:lang\(ko\)/);
  assert.match(ui,/html:lang\(hi\)/);
  assert.match(ui,/html:lang\(bn\)/);
  assert.match(ui,/html:lang\(ru\)/);
  assert.match(ui,/html:lang\(ckb\)/);
  for(const [code,font] of [['zh','SC'],['ja','JP'],['ko','KR']]) {
    assert.ok(ui.includes('html:lang('+code+') .df-v22 { font-family: "Noto Sans CJK '+font+'"'),
      'incorrect '+code+' CJK glyph priority');
  }
  assert.match(ui,/html:lang\(ur\) \.df-v22 \{ font-family: "Noto Nastaliq Urdu"/);
});
test('offline font stacks and stable white premium colors',()=>{
  const tokens=css('design_tokens_v22.css');
  assert.match(tokens,/--df22-body-size:\s*1rem/);
  assert.match(tokens,/--df22-page:\s*#f8fafd/);
  assert.match(tokens,/--df22-surface:\s*#ffffff/);
  for(const sheet of ['white_2100.css','ui_components_v22.css','design_tokens_v22.css']) {
    assert.doesNotMatch(css(sheet),/@import\s+url\(https?:|@font-face[^}]*url\(https?:/i);
  }
});
test('v21 raw storage writes are rejected; no silent data corruption',()=>{
 const raw={setItem:()=>{throw Error('must never call')}};
 const result=locales.setSystemLanguage('ar',{lang:'en',theme:'white'},raw);
 assert.equal(result.success,false);
 assert.equal(result.reason,'ATOMIC_STORAGE_REQUIRED');
});
