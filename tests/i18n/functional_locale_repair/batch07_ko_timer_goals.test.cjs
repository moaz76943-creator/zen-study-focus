'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const packs=JSON.parse(fs.readFileSync('assets/i18n/df99_reviewed_packs.json','utf8'));
test('Korean timer and goals cover the actual controls through the packaged offline runtime',()=>{
 const context={window:{},console};vm.createContext(context);
 for(const file of ['df99_multiscreen_i18n.js','df99_reviewed_packs.js'])
  vm.runInContext(fs.readFileSync('android/app/src/main/assets/web/js/'+file,'utf8'),context);
 for(const family of ['timer','goals']){
  assert.ok(packs.ko?.[family],family+' reviewed source missing');
  assert.deepEqual(Object.keys(packs.ko[family]).sort(),Object.keys(packs.id[family]).sort());
  for(const [key,text] of Object.entries(packs.ko[family])){
   assert.match(text,/\p{Script=Hangul}/u,key);
   assert.doesNotMatch(text,/[٠-٩۰-۹]|<\/?(?:script|style|iframe)\b/u);
   assert.deepEqual(text.match(/\{[A-Za-z][A-Za-z0-9_]*\}/g)||[],[]);
   assert.equal(context.window.DF99Locale.t('ko',family,key,'FALLBACK'),text);
  }
 }
 assert.match(packs.ko.timer['2'],/현재 세션.*새 세션/u);
 assert.match(packs.ko.goals.hint,/0.*완료/u);
 assert.match(packs.ko.goals.invalid,/0.*720/u);
 assert.match(packs.ko.goals.weekInvalid,/0.*5040/u);
 assert.match(packs.ko.goals.desc,/완료/u);
});
