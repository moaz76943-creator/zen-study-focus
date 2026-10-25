'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../../../android/app/src/main/assets/web/quick_training.js'),'utf8');
test('Hawaiian, Hmong and legacy-jw Javanese packs do not use English placeholders',()=>{
 const {keys,packs}=vm.runInNewContext(source+'\n({keys:QUICK_KEYS,packs:QUICK_TRANSLATIONS})');
 assert.equal(keys.length,36);
 for(const lang of ['haw','hmn','jw']){
  assert.ok(Object.hasOwn(packs,lang),'missing '+lang);
  assert.equal(packs[lang].length,36);
  assert.ok(packs[lang].every(t=>typeof t==='string'&&t.trim()),lang+' blanks');
  for(const i of [0,1,4,5,6,9,10,11,12,17,18,19,20,21,23,26,27,28,29,30,31,32,33,34,35])
    assert.notEqual(packs[lang][i],packs.en[i],lang+' English fallback '+keys[i]);
  for(const i of [7,8,32]) assert.ok(packs[lang][i].includes('MM:SS'),lang+' missing MM:SS');
  assert.ok(!/[٠-٩۰-۹]/.test(packs[lang].join(' ')),lang+' Eastern numerals');
 }
 assert.ok(/[ʻōāēīū]/.test(packs.haw.join(' ')),'Hawaiian glyphs must survive source');
 assert.ok(packs.hmn.some(t=>t.includes('kev')),'Hmong Daw RPA text expected');
});
