'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../../../android/app/src/main/assets/web/quick_training.js'),'utf8');
const inspect=()=>vm.runInNewContext(source+'\n({keys:QUICK_KEYS,packs:QUICK_TRANSLATIONS})');

test('rw/mg/ny contain exactly 36 nonempty strings and do not reuse English controls',()=>{
 const {keys,packs}=inspect();
 assert.equal(keys.length,36);
 for(const lang of ['rw','mg','ny']){
  assert.ok(Object.hasOwn(packs,lang),lang+' missing');
  assert.equal(packs[lang].length,36);
  assert.ok(packs[lang].every(s=>typeof s==='string'&&s.trim().length>0),lang+' empty');
  for(const i of [0,1,4,5,6,9,10,12,17,18,19,23,26,27,28,30,31,32,33,34])
    assert.notEqual(packs[lang][i],packs.en[i],lang+' raw English key '+keys[i]);
  for(const i of [7,8,32])
    assert.ok(packs[lang][i].includes('MM:SS'),lang+' MM:SS key '+keys[i]);
 }
});
