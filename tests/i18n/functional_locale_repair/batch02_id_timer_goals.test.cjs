'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const packs=JSON.parse(fs.readFileSync('assets/i18n/df99_reviewed_packs.json','utf8'));
const timer=Array.from({length:11},(_,i)=>String(i));
const goals=['kicker','heading','desc','edit','modal','hint','save','invalid','noGoal','minute',
  'done','today','week','weekTarget','weekInvalid'];

test('DF13-E batch02: Indonesian has every Timer and Goals translation in reviewed source',()=>{
  for(const [family,keys] of Object.entries({timer,goals})){
    const dict=packs.id[family];
    assert.ok(dict,'id/'+family+' absent');
    assert.deepEqual(Object.keys(dict).sort(),keys.slice().sort(),'id/'+family+' incomplete');
    for(const key of keys){
      const val=dict[key];
      assert.equal(typeof val,'string','id/'+family+'/'+key);
      assert.ok(val.trim(),'id/'+family+'/'+key+' blank');
      assert.doesNotMatch(val,/[٠-٩۰-۹]/u,'id/'+family+'/'+key+' non-Western digits');
      assert.doesNotMatch(val,/<\/?(?:script|iframe|style|img)\b/i,'id/'+family+'/'+key+' unsafe markup');
      assert.deepEqual((val.match(/\{[A-Za-z][A-Za-z0-9_]*\}/g)||[]),[],
        'id/'+family+'/'+key+' unexpected placeholder');
    }
  }
  assert.match(packs.id.timer['10'],/disimpan/iu,'Timer save confirmation must mean saved');
  assert.match(packs.id.goals.save,/disimpan/iu,'Goals save confirmation must mean saved');
  assert.match(packs.id.goals.invalid,/0.*720/u,'Keep the input bounds');
  assert.match(packs.id.goals.weekInvalid,/0.*5040/u,'Keep the weekly bounds');
  assert.match(packs.id.goals.hint,/0/u,'Keep the hide goal instruction');
  assert.equal(packs.he,undefined);
  assert.equal(packs.iw,undefined);
});

test('DF13-E batch02: Indonesian reviewed labels load in offline DF99 runtime',()=>{
  const c={window:{},console};
  vm.createContext(c);
  vm.runInContext(fs.readFileSync('android/app/src/main/assets/web/js/df99_multiscreen_i18n.js','utf8'),c);
  vm.runInContext(fs.readFileSync('android/app/src/main/assets/web/js/df99_reviewed_packs.js','utf8'),c);
  for(const [family,keys] of Object.entries({timer,goals})){
    for(const key of keys){
      assert.equal(c.window.DF99Locale.t('id',family,key,'ENGLISH_FALLBACK'),
        packs.id[family][key],'id/'+family+'/'+key);
      assert.notEqual(packs.id[family][key],'ENGLISH_FALLBACK');
    }
  }
});
