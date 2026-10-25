'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');

const source=fs.readFileSync(path.resolve(__dirname,
  '../../../android/app/src/main/assets/web/quick_training.js'),'utf8');
function load() {
  const context=vm.createContext({toWest:String});
  vm.runInContext(source,context);
  return code=>vm.runInContext(code,context);
}

test('all corrected time labels use the exact ASCII MM:SS token',()=>{
  const inspect=load(), packs=inspect('QUICK_TRANSLATIONS');
  for(const lang of ['tr','ru','ka']){
    const labels=packs[lang];
    for(const i of [7,8,32]){
      assert.ok(labels[i].includes('MM:SS'),lang+' must show ASCII MM:SS on key '+i);
    }
  }
});

test('work and rest time formatting uses Western 0-9, enforces seconds below 60',()=>{
  const run=load();
  for(const [seconds,expected] of [[0,'00:00'],[9,'00:09'],[65,'01:05'],[600,'10:00']])
    assert.equal(run('timeString('+seconds+')'),expected);
  assert.equal(run('parseQuickTime("01:05")'),65);
  assert.equal(run('parseQuickTime("03:60")'),null);
  assert.equal(run('parseQuickTime("00:00")'),null);
  assert.equal(run('parseQuickTime("00:00",true)'),0);
});
