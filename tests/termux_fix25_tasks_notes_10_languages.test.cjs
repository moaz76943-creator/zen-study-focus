'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const packs=JSON.parse(fs.readFileSync('assets/i18n/df99_reviewed_packs.json','utf8'));
const languages=['it','pt','tr','ru','nl','pl','sv','da','no','fi'];
const areas={tasks:64,notes:36};
const bridge=fs.readFileSync('android/app/src/main/assets/web/js/df99_multiscreen_i18n.js','utf8');
const generated=fs.readFileSync('android/app/src/main/assets/web/js/df99_reviewed_packs.js','utf8');
function context(){const cx={window:{},console};vm.createContext(cx);vm.runInContext(bridge,cx);vm.runInContext(generated,cx);return cx;}

test('all 10 languages have 64 tasks and 36 notes strings, with no empty values',()=>{
  for(const lang of languages) for(const [family,n] of Object.entries(areas)){
    assert.ok(packs[lang] && packs[lang][family], lang+'/'+family);
    const values=packs[lang][family];
    assert.equal(Object.keys(values).length,n,lang+'/'+family);
    for(const [key,val] of Object.entries(values)){
      assert.ok(typeof val==='string'&&val.trim(),lang+'/'+family+'/'+key);
      assert.doesNotMatch(val,/[\u0660-\u0669\u06f0-\u06f9]|<\/?(?:script|style|iframe)/i);
    }
  }
});
test('existing locales and earlier strings are preserved',()=>{
  const total=Object.values(packs).reduce((sum,sections)=>sum+Object.values(sections).reduce((n,entries)=>n+Object.keys(entries).length,0),0);
  assert.ok(total>=2099,'Expected >= 2099 actual strings, found '+total);
  for(const lang of ['de','es','fr','it','pt','tr','ru','nl','sv','da','no','fi','pl','uk','ro','cs','hu']) assert.ok(packs[lang]?.timer,lang+'/timer');
  assert.equal(packs.he,undefined);assert.equal(packs.iw,undefined);
});
test('generated offline runtime resolves native translations for all 10 languages',()=>{
  const cx=context(),api=cx.window.DF99Locale;
  for(const lang of languages) for(const family of Object.keys(areas)){
    for(const [key,text] of Object.entries(packs[lang][family])){
      assert.equal(api.t(lang,family,key,'English fallback'),text,lang+'/'+family+'/'+key);
    }
  }
});
test('fallback is not counted as native and generated pack cannot read user storage',()=>{
  const api=context().window.DF99Locale;
  for(const lang of ['he','iw','zz'])assert.equal(api.t(lang,'tasks','title','fallback'),'fallback');
  assert.equal(api.t('nl','notes','999','fallback'),'fallback');
  assert.ok(!/\b(?:localStorage|indexedDB|fetch\s*\(|XMLHttpRequest)\b/.test(generated));
});
