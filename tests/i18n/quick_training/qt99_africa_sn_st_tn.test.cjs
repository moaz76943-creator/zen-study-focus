'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../../../android/app/src/main/assets/web/quick_training.js'),'utf8');

function inventory(){
  return vm.runInNewContext(source+'\n({keys:QUICK_KEYS,packs:QUICK_TRANSLATIONS})');
}
const locales=['sn','st','tn'];

test('Shona, Sesotho and Setswana each have a full Quick Training UI pack',()=>{
  const {keys,packs}=inventory();
  assert.equal(keys.length,36);
  for(const lang of locales){
    assert.ok(Object.hasOwn(packs,lang),'missing locale '+lang);
    assert.equal(packs[lang].length,keys.length,'wrong number of keys for '+lang);
    assert.ok(packs[lang].every(t=>typeof t==='string'&&t.trim()),'empty translation in '+lang);
  }
});
test('African locale packs do not pass off English interface text as translations',()=>{
  const {packs}=inventory();
  for(const lang of locales){
    for(const i of [0,1,4,5,6,7,8,9,10,11,12,17,18,19,20,21,23,24,25,26,27,28,29,30,31,32,33,34,35]){
      assert.notEqual(packs[lang][i],packs.en[i],lang+' / '+i);
    }
    for(const i of [7,8,32])assert.ok(packs[lang][i].includes('MM:SS'),lang+' / MM:SS / '+i);
    assert.ok(!/[٠-٩۰-۹]/.test(packs[lang].join(' ')),lang+' contains Eastern numerals');
  }
});
