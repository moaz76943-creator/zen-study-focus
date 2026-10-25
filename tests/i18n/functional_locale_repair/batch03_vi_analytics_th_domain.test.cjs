'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const packs=JSON.parse(fs.readFileSync('assets/i18n/df99_reviewed_packs.json','utf8'));
const expected={
  vi:{analytics:['title','activity','period','start','end','minutes','sessions','average',
    'streak','noData','goal','noGoals','tasks','chart','year','export','details']},
  th:{analyticsDomain:['study','read','work','sport']}
};
test('DF13-E batch03: all new analytics and domain keys are reviewed, nonblank and safe',()=>{
  for(const [lang,sections] of Object.entries(expected))for(const [family,keys] of Object.entries(sections)){
    const d=packs[lang]?.[family];
    assert.ok(d,lang+'/'+family+' absent');
    assert.deepEqual(Object.keys(d).sort(),keys.slice().sort(),lang+'/'+family+' missing keys');
    for(const key of keys){
      const s=d[key];
      assert.equal(typeof s,'string');
      assert.ok(s.trim(),lang+'/'+family+'/'+key+' blank');
      assert.doesNotMatch(s,/[٠-٩۰-۹]/u);
      assert.doesNotMatch(s,/<\/?(?:script|style|iframe|img)\b/i);
      assert.deepEqual((s.match(/\{[A-Za-z][A-Za-z0-9_]*\}/g)||[]),[]);
    }
  }
  assert.match(packs.vi.analytics.export,/CSV/u);
  assert.match(packs.vi.analytics.noData,/Không có phiên/u);
  assert.equal(packs.he,undefined);
  assert.equal(packs.iw,undefined);
});
test('DF13-E batch03: actual offline runtime resolves Vietnamese analytics and Thai activity labels',()=>{
  const c={window:{},console};vm.createContext(c);
  vm.runInContext(fs.readFileSync('android/app/src/main/assets/web/js/df99_multiscreen_i18n.js','utf8'),c);
  vm.runInContext(fs.readFileSync('android/app/src/main/assets/web/js/df99_reviewed_packs.js','utf8'),c);
  for(const [lang,sections] of Object.entries(expected))for(const [family,keys] of Object.entries(sections))
    for(const key of keys)assert.equal(c.window.DF99Locale.t(lang,family,key,'FALLBACK'),packs[lang][family][key],
      lang+'/'+family+'/'+key);
});
