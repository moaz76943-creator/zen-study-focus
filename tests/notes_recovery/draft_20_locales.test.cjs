'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/assets/web/notes_drafts.js'),'utf8');
const langs=['en','ar','es','zh','hi','fr','de','ru','pt','ja','id','tr','ko','vi','it','bn','ur','fa','pl','nl'];
const keys=['saved','ready','restore','discard','tooLong','restored','cleared','other','conflict','failed','unsaved'];
function dictionary(){
 const start=source.indexOf('const NS_DRAFT_LANG='),end=source.indexOf('\n};',start);
 assert.ok(start>=0&&end>start,'draft locale registry present');
 return vm.runInNewContext('('+source.slice(start+'const NS_DRAFT_LANG='.length,end+2)+')');
}
test('DF-043/047: draft warnings and restore controls are explicitly translated in 20 locales',()=>{
 const tr=dictionary();
 assert.deepEqual(Object.keys(tr).sort(),langs.slice().sort());
 for(const code of langs){
  assert.deepEqual(Object.keys(tr[code]).sort(),keys.slice().sort(),code+' key parity');
  for(const key of keys){
   const value=tr[code][key];
   assert.ok(typeof value==='string'&&Array.from(value.trim()).length>=1,code+'.'+key);
   if(code!=='en')assert.notEqual(value,tr.en[key],code+'.'+key+' leaked English');
  }
 }
});
test('DF-045/055: selected locale drives live warning, not Arabic-or-English fallback',()=>{
 assert.match(source,/NS_DRAFT_LANG\[cfg\.lang\]\s*\|\|\s*NS_DRAFT_LANG\.en/);
 assert.doesNotMatch(source,/cfg\.lang\s*===\s*'ar'\s*\?\s*NS_DRAFT_LANG\.ar\s*:\s*NS_DRAFT_LANG\.en/);
 assert.match(source,/function nsRefreshDraftLocale\(\)/);
});
test('DF-090: locale lookup is limited to presentation and never mutates draft storage keys',()=>{
 assert.match(source,/const NS_DRAFT_KEY='deep_focus_unsaved_note_draft_v1'/);
 assert.match(source,/function nsDraftLabel\(k\)/);
 assert.match(source,/function nsGetStoredDraft\(\)/);
});

test('DF-055 live locale changes select the current draft warning without modifying persisted data',()=>{
 const start=source.indexOf('function nsDraftLabel(k)'),end=source.indexOf('\nfunction nsGetStoredDraft()',start);
 assert.ok(start>=0&&end>start,'draft label function boundary exists');
 const tr=dictionary();
 const cfg={lang:'en'};
 const sandbox=vm.createContext({cfg,NS_DRAFT_LANG:tr});
 vm.runInContext(source.slice(start,end),sandbox);
 for(const lang of langs){
  cfg.lang=lang;
  for(const key of keys){
   assert.equal(sandbox.nsDraftLabel(key),tr[lang][key],lang+' '+key);
  }
 }
 cfg.lang='unknown';
 assert.equal(sandbox.nsDraftLabel('failed'),tr.en.failed);
 assert.equal(sandbox.nsDraftLabel('not_a_key'),'');
});
