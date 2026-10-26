'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const packs=JSON.parse(fs.readFileSync('assets/i18n/df99_reviewed_packs.json','utf8'));
test('Simplified Chinese timer and goals cover the actual controls through the packaged offline runtime',()=>{
 const context={window:{},console};vm.createContext(context);
 for(const file of ['df99_multiscreen_i18n.js','df99_reviewed_packs.js'])
  vm.runInContext(fs.readFileSync('android/app/src/main/assets/web/js/'+file,'utf8'),context);
 for(const family of ['timer','goals']){
  assert.ok(packs.zh?.[family],family+' reviewed source missing');
  assert.deepEqual(Object.keys(packs.zh[family]).sort(),Object.keys(packs.id[family]).sort());
  for(const [key,text] of Object.entries(packs.zh[family])){
   assert.match(text,/\p{Script=Han}/u,key);
   assert.doesNotMatch(text,/[٠-٩۰-۹]|<\/?(?:script|style|iframe)\b/u);
   assert.deepEqual(text.match(/\{[A-Za-z][A-Za-z0-9_]*\}/g)||[],[]);
   assert.equal(context.window.DF99Locale.t('zh',family,key,'FALLBACK'),text);
  }
 }
 assert.match(packs.zh.timer['2'],/当前时段.*新时段/u);
 assert.match(packs.zh.goals.hint,/0.*完成/u);
 assert.match(packs.zh.goals.invalid,/0.*720/u);
 assert.match(packs.zh.goals.weekInvalid,/0.*5040/u);
 assert.match(packs.zh.goals.desc,/完成/u);
});
