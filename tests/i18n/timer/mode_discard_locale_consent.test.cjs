'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const web=path.resolve(__dirname,'../../../android/app/src/main/assets/web');
const app=fs.readFileSync(path.join(web,'app.js'),'utf8');
const quick=fs.readFileSync(path.join(web,'quick_training.js'),'utf8');
const start=app.indexOf('function selectTimerModeFromUser(');
const end=app.indexOf('function selectTimerMode(',start+1);
assert.ok(start>=0 && end>start, 'Exact production mode wrapper present');
const actual=app.slice(start,end);
assert.match(actual,/window\.confirm\(quickText\('replacePrompt'\)\)/);
assert.doesNotMatch(actual,/cfg\.lang\s*===\s*'ar'/);

function fixture(lang,active=true,accept=false,training=false){
  const calls={prompts:[],mutations:0};
  const state={
    cfg:{lang},toWest:String,
    quickTraining:training?{active:true}:null,
    timerRunning:active, timerSessionId:active?'session-1':null,timerActiveMs:active?12345:0,
    selectTimerMode(){calls.mutations++;return true},
    window:{confirm(s){calls.prompts.push(s);return accept}}
  };
  const ctx=vm.createContext(state);
  vm.runInContext(quick+'\n'+actual,ctx);
  return {
    calls,
    state,
    text:()=>vm.runInContext("quickText('replacePrompt')",ctx),
    invoke:()=>vm.runInContext("selectTimerModeFromUser(5,'short',{})",ctx)
  };
}
test('Cancel shows exact selected language and preserves active session',()=>{
  for(const lang of ['en','ar','fr','de','hi','ur','tr','ja','zz']){
    const f=fixture(lang),before=[f.state.timerSessionId,f.state.timerActiveMs,f.state.timerRunning];
    assert.equal(f.invoke(),false,lang);
    assert.deepEqual(f.calls.prompts,[f.text()],lang);
    assert.equal(f.calls.mutations,0,lang);
    assert.deepEqual([f.state.timerSessionId,f.state.timerActiveMs,f.state.timerRunning],before,lang);
  }
});
test('Accept delegates exactly one mode change; idle switch has no consent prompt',()=>{
  const accepted=fixture('es',true,true);
  assert.equal(accepted.invoke(),true);
  assert.equal(accepted.calls.prompts.length,1);
  assert.equal(accepted.calls.mutations,1);
  const idle=fixture('ar',false,false);
  assert.equal(idle.invoke(),true);
  assert.equal(idle.calls.prompts.length,0);
  assert.equal(idle.calls.mutations,1);
});
test('Quick Training keeps its existing separate consent path',()=>{
  const f=fixture('fr',true,false,true);
  assert.equal(f.invoke(),true);
  assert.equal(f.calls.prompts.length,0);
  assert.equal(f.calls.mutations,1);
});
