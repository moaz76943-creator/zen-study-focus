'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');

function inventory() {
  const file=path.resolve(__dirname,'../../../android/app/src/main/assets/web/quick_training.js');
  const source=fs.readFileSync(file,'utf8');
  return vm.runInNewContext(source+'\n({keys:QUICK_KEYS,translations:QUICK_TRANSLATIONS})');
}
test('Latin and Somali packs contain all 36 entries, with no empty translation',()=>{
  const {keys,translations}=inventory();
  assert.equal(keys.length,36);
  for(const lang of ['la','so']){
    assert.ok(Object.hasOwn(translations,lang),lang+' missing');
    const labels=translations[lang];
    assert.equal(labels.length,keys.length,lang);
    assert.ok(labels.every(v=>typeof v==='string'&&v.trim().length>0),lang);
  }
});
test('Latin and Somali translate session controls, validation and prompts rather than aliasing English',()=>{
  const {translations:t}=inventory();
  for(const lang of ['la','so']){
    const values=t[lang];
    for(const i of [0,1,4,5,6,9,10,12,17,18,19,23,26,27,28,30,31,32,33,34]){
      assert.notEqual(values[i],t.en[i],lang+' control '+i+' copied English');
    }
    for(const i of [7,8,32])assert.match(values[i],/MM:SS/,lang+' time convention');
    assert.ok(values[30].includes('?'),lang+' end confirmation should be a question');
    assert.ok(values[31].includes('?'),lang+' replacement confirmation should be a question');
  }
});
