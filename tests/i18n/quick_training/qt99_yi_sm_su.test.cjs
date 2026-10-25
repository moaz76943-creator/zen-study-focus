'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../../../android/app/src/main/assets/web/quick_training.js'),'utf8');

test('Yiddish, Samoan and Sundanese have 36 localized Quick Training entries',()=>{
 const {keys,packs}=vm.runInNewContext(source+'\n({keys:QUICK_KEYS,packs:QUICK_TRANSLATIONS})');
 assert.equal(keys.length,36);
 for(const lang of ['yi','sm','su']){
  assert.ok(Object.hasOwn(packs,lang),'missing '+lang);
  assert.equal(packs[lang].length,36);
  assert.ok(packs[lang].every(v=>typeof v==='string'&&v.trim()),lang+' has blank entries');
  for(const i of [0,1,4,5,6,9,10,12,17,18,19,20,23,26,27,28,29,30,31,32,33,34]){
   assert.notEqual(packs[lang][i],packs.en[i],lang+' retained unlocalized '+keys[i]);
  }
  for(const i of [7,8,32]) assert.ok(packs[lang][i].includes('MM:SS'),lang+' time literal');
  assert.ok(!/[٠-٩۰-۹]/.test(packs[lang].join(' ')),lang+' numerals');
 }
 assert.ok(/[\u0590-\u05ff]/.test(packs.yi[4]),'Yiddish should use its own traditional script');
 assert.equal(Object.hasOwn(packs,'he'),false,'Hebrew locale must remain excluded');
 assert.equal(Object.hasOwn(packs,'iw'),false,'Hebrew legacy code must remain excluded');
});
