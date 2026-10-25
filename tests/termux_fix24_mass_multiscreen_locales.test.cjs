'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=JSON.parse(fs.readFileSync('assets/i18n/df99_reviewed_packs.json','utf8'));
const batch=['nl','sv','da','no','fi','pl','uk','ro','cs','hu'];
const counts={timer:11,goals:15,analytics:17,analyticsDomain:4};
const base=['de','es','fr','it','pt','ru','tr'];
test('10 new locale packs contain complete native strings for 4 screens each',()=>{
  for(const lang of batch){
    assert.ok(src[lang], 'Missing batch-24 translations: '+lang);
    for(const [family,count] of Object.entries(counts)){
      const d=src[lang][family];assert.ok(d,lang+'/'+family);
      assert.equal(Object.keys(d).length,count,lang+'/'+family);
      for(const [key,val] of Object.entries(d)){
        assert.ok(typeof val==='string'&&val.trim(),lang+'/'+family+'/'+key);
        assert.doesNotMatch(val,/[\u0660-\u0669\u06f0-\u06f9]|<\/?(?:script|style|iframe)/i);
      }
    }
  }
});
test('all existing language data is still retained',()=>{
  for(const lang of base)assert.ok(src[lang]&&src[lang].timer,lang);
  assert.equal(src.he,undefined);assert.equal(src.iw,undefined);
  const sum=Object.values(src).reduce((n,f)=>n+Object.values(f).reduce((s,d)=>s+Object.keys(d).length,0),0);
  assert.ok(sum>=1099,`Expected at least 1099 actual strings; got ${sum}`);
});
test('generated JS registers complete packs and rejects excluded codes',()=>{
  const cx={window:{},console};vm.createContext(cx);
  vm.runInContext(fs.readFileSync('android/app/src/main/assets/web/js/df99_multiscreen_i18n.js','utf8'),cx);
  vm.runInContext(fs.readFileSync('android/app/src/main/assets/web/js/df99_reviewed_packs.js','utf8'),cx);
  for(const lang of batch){
    const api=cx.window.DF99Locale;
    for(const [area,dict] of Object.entries(src[lang]))for(const [key,val] of Object.entries(dict)){
      assert.equal(api.t(lang,area,key,'Fallback'),val,lang+'/'+area+'/'+key);
    }
  }
  assert.equal(cx.window.DF99Locale.t('he','timer','0','Fallback'),'Fallback');
  assert.equal(cx.window.DF99Locale.t('zz','analytics','title','Fallback'),'Fallback');
});
test('no network or user storage access is introduced to the generated pack',()=>{
  const p=fs.readFileSync('android/app/src/main/assets/web/js/df99_reviewed_packs.js','utf8');
  assert.ok(!/\b(?:localStorage|fetch\(|XMLHttpRequest|indexedDB)\b/.test(p));
});
