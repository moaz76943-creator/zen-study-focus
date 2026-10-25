'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const packs=JSON.parse(fs.readFileSync('assets/i18n/df99_reviewed_packs.json','utf8'));
const targets=['uk','ro','cs','hu','bg','hr','sr','sl','lt','lv'];
const script=fs.readFileSync('android/app/src/main/assets/web/js/df99_reviewed_packs.js','utf8');
function env(){
  const c={window:{},console}; vm.createContext(c);
  vm.runInContext(fs.readFileSync('android/app/src/main/assets/web/js/df99_multiscreen_i18n.js','utf8'),c);
  vm.runInContext(script,c);return c.window.DF99Locale;
}
test('ten new supported languages have complete tasks and notes dictionaries',()=>{
  for(const lang of targets){
    assert.equal(Object.keys(packs[lang].tasks||{}).length,64,lang+' tasks');
    assert.equal(Object.keys(packs[lang].notes||{}).length,36,lang+' notes');
    for(const family of ['tasks','notes']){
      for(const [key,value] of Object.entries(packs[lang][family])){
        assert.ok(typeof value==='string'&&value.trim(),lang+'/'+family+'/'+key);
        assert.doesNotMatch(value,/[\u0660-\u0669\u06f0-\u06f9]|<\/?(?:script|style|iframe)/i);
      }
    }
  }
});
test('runtime resolves 1000 new texts and keeps unsupported language fallback',()=>{
  const locale=env();let count=0;
  for(const lang of targets)for(const family of ['tasks','notes'])for(const [key,value] of Object.entries(packs[lang][family])){
    assert.equal(locale.t(lang,family,key,'fallback'),value,lang+'/'+family+'/'+key);
    count++;
  }
  assert.equal(count,1000);
  for(const lang of ['he','iw','zz'])assert.equal(locale.t(lang,'tasks','title','fallback'),'fallback');
  assert.equal(locale.t('uk','notes','999','fallback'),'fallback');
});
test('previous 2099 translations survive and pack is local only',()=>{
  const prior=['de','es','fr','it','pt','tr','ru','nl','sv','da','no','fi','pl','uk','ro','cs','hu'];
  for(const lang of prior)assert.ok(packs[lang]?.timer,lang+' prior timer');
  assert.equal(packs.he,undefined);assert.equal(packs.iw,undefined);
  assert.equal(Object.values(packs).reduce((n,f)=>n+Object.values(f).reduce((s,d)=>s+Object.keys(d).length,0),0),3099);
  assert.doesNotMatch(script,/\b(?:localStorage|indexedDB|XMLHttpRequest|fetch\s*\()\b/);
});
test('new Slavic and Baltic samples are native rather than English copies',()=>{
  assert.equal(packs.uk.tasks.title,'Студія завдань');
  assert.equal(packs.ro.tasks.add,'Sarcină nouă');
  assert.equal(packs.cs.notes['25'],'Uložit poznámku');
  assert.equal(packs.hu.tasks.cancel,'Mégse');
  assert.equal(packs.bg.notes['32'],'Изтрий');
  assert.equal(packs.sr.tasks.done,'Заврши');
  assert.equal(packs.lt.tasks.search,'Ieškoti užduočių');
  assert.equal(packs.lv.notes['35'],'Saglabāts');
});
