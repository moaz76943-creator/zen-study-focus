'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const packs=JSON.parse(fs.readFileSync('assets/i18n/df99_reviewed_packs.json','utf8'));
test('Japanese timer and goals have complete reviewed dictionaries in packaged offline runtime',()=>{
  const context={window:{},console};vm.createContext(context);
  for(const file of ['df99_multiscreen_i18n.js','df99_reviewed_packs.js'])
    vm.runInContext(fs.readFileSync('android/app/src/main/assets/web/js/'+file,'utf8'),context);
  // Indonesian is an already accepted inventory of the same real UI controls.
  for(const family of ['timer','goals']){
    assert.ok(packs.ja[family],family+' reviewed source missing');
    assert.deepEqual(Object.keys(packs.ja[family]).sort(),Object.keys(packs.id[family]).sort());
    for(const [key,text] of Object.entries(packs.ja[family])){
      assert.match(text,/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u,key);
      assert.doesNotMatch(text,/[٠-٩۰-۹]|<\/?(?:script|style|iframe)\b/u);
      assert.deepEqual(text.match(/\{[A-Za-z][A-Za-z0-9_]*\}/g)||[],[]);
      assert.equal(context.window.DF99Locale.t('ja',family,key,'FALLBACK'),text);
    }
  }
});
test('Japanese goal limits and deferred timer settings remain explicit',()=>{
  assert.match(packs.ja.timer?.['2']||'',/現在のセッション.*新しいセッション/u);
  assert.match(packs.ja.goals?.hint||'',/0.*完了/u);
  assert.match(packs.ja.goals?.invalid||'',/0.*720/u);
  assert.match(packs.ja.goals?.weekInvalid||'',/0.*5040/u);
  assert.match(packs.ja.goals?.desc||'',/完了/u);
});
