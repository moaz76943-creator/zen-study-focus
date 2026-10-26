'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const packs=JSON.parse(fs.readFileSync('assets/i18n/df99_reviewed_packs.json','utf8'));
const keys={timer:Array.from({length:11},(_,i)=>String(i)),goals:[
  'kicker','heading','desc','edit','modal','hint','save','invalid','noGoal',
  'minute','done','today','week','weekTarget','weekInvalid'
]};
test('Vietnamese timer and goals resolve every actual UI label without fallback',()=>{
  const context={window:{},console};vm.createContext(context);
  for(const file of ['df99_multiscreen_i18n.js','df99_reviewed_packs.js'])
    vm.runInContext(fs.readFileSync('android/app/src/main/assets/web/js/'+file,'utf8'),context);
  for(const [family,required] of Object.entries(keys)){
    assert.ok(packs.vi[family],family+' reviewed source missing');
    assert.deepEqual(Object.keys(packs.vi[family]).sort(),required.slice().sort());
    for(const key of required){
      const text=packs.vi[family][key];
      assert.ok(text.trim());
      assert.doesNotMatch(text,/[٠-٩۰-۹]|<\/?(?:script|style|iframe)\b/u);
      assert.deepEqual(text.match(/\{[A-Za-z][A-Za-z0-9_]*\}/g)||[],[]);
      assert.equal(context.window.DF99Locale.t('vi',family,key,'FALLBACK'),text);
      assert.notEqual(text,'FALLBACK');
    }
  }
});
test('Vietnamese settings explain deferred application and preserve numeric bounds',()=>{
  assert.match(packs.vi.timer?.['2']||'',/phiên hiện tại.*phiên mới/iu);
  assert.match(packs.vi.goals?.hint||'',/0.*hoàn thành/u);
  assert.match(packs.vi.goals?.invalid||'',/0.*720/u);
  assert.match(packs.vi.goals?.weekInvalid||'',/0.*5040/u);
  assert.match(packs.vi.goals?.desc||'',/hoàn thành/u);
});
