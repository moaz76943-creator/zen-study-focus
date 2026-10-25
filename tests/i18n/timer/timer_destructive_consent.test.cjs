'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const web=path.resolve(__dirname,'../../../android/app/src/main/assets/web');
const source=fs.readFileSync(path.join(web,'app.js'),'utf8');
const html=fs.readFileSync(path.join(web,'index.html'),'utf8');
const start=source.indexOf('function resetTimerNow(');
const stop=source.indexOf('\nfunction addWaterCup(',start);
assert.ok(start>=0&&stop>start,'Timer reset and skip functions must remain available');
function setup({running=false,paused=false,allow=false,training=false}={}){
 const calls={confirms:0,stops:0,saves:0,updates:0,selected:[],trainingCancel:0,trainingSkip:0};
 const session=running||paused;
 const c={
  cfg:{lang:'en',shortMin:5},
  window:{confirm(){calls.confirms++;return allow;}},
  quickTraining:training?{active:true}:null,
  timerRunning:running,timerSessionId:session?'live-session':null,timerActiveMs:session?100000:0,
  timerResumeMs:session?777:null,timerLeft:850,timerTotal:1500,focusSessionTaskId:session?41:null,
  document:{getElementById(id){assert.equal(id,'modeShortBtn');return {id};}},
  toggleTimerPlay(){calls.stops++;c.timerRunning=false;},
  storeTimerSession(){calls.saves++;},updateTimerDisplay(){calls.updates++;},
  cancelQuickTraining(){calls.trainingCancel++;},skipQuickTrainingStep(){calls.trainingSkip++;},
  selectTimerModeFromUser(mins,mode,btn){calls.selected.push({mins,mode,id:btn.id});return allow;}
 };
 vm.createContext(c);
 vm.runInContext(source.slice(start,stop),c);
 const snapshot=()=>JSON.stringify({running:c.timerRunning,id:c.timerSessionId,active:c.timerActiveMs,
  resume:c.timerResumeMs,left:c.timerLeft,total:c.timerTotal,linked:c.focusSessionTaskId});
 return {c,calls,snapshot,reset:()=>vm.runInContext('resetTimerNow()',c),skip:()=>vm.runInContext('skipTimerPhase()',c)};
}
test('Reset Cancel is a no-op on active and paused sessions, with zero writes',()=>{
 for(const flags of [{running:true},{paused:true}]){
  const t=setup({...flags,allow:false}),before=t.snapshot();
  assert.equal(t.reset(),false);
  assert.equal(t.snapshot(),before);
  assert.equal(t.calls.confirms,1);
  assert.equal(t.calls.stops,0);
  assert.equal(t.calls.saves,0);
 }
});
test('Reset Accept stops once, clears session once, and saves only after consent',()=>{
 const t=setup({running:true,allow:true});
 assert.equal(t.reset(),true);
 assert.equal(t.calls.confirms,1);assert.equal(t.calls.stops,1);
 assert.equal(t.calls.saves,1);assert.equal(t.calls.updates,1);
 assert.equal(t.c.timerSessionId,null);assert.equal(t.c.timerLeft,t.c.timerTotal);
 assert.equal(t.c.focusSessionTaskId,null);
});
test('Idle Reset has no unnecessary confirmation',()=>{
 const t=setup();
 assert.equal(t.reset(),true);
 assert.equal(t.calls.confirms,0);assert.equal(t.calls.saves,1);
});
test('Skip delegates to the consent-preserving mode wrapper and never pauses first',()=>{
 for(const allow of [false,true]){
  const t=setup({running:true,allow}),before=t.snapshot();
  assert.equal(t.skip(),allow);
  assert.deepEqual(t.calls.selected,[{mins:5,mode:'short',id:'modeShortBtn'}]);
  assert.equal(t.calls.stops,0);
  if(!allow)assert.equal(t.snapshot(),before);
 }
});
test('Quick Training retains its existing dedicated cancel/skip paths',()=>{
 const t=setup({training:true});
 t.reset();t.skip();
 assert.equal(t.calls.trainingCancel,1);
 assert.equal(t.calls.trainingSkip,1);
 assert.equal(t.calls.confirms,0);
 assert.equal(t.calls.saves,0);
});
test('Both break buttons use the user-consent wrapper, not destructive mode selection',()=>{
 assert.match(html,/id="modeShortBtn"[^>]*onclick="selectTimerModeFromUser\(cfg\.shortMin, 'short', this\)"/);
 assert.match(html,/id="modeLongBtn"[^>]*onclick="selectTimerModeFromUser\(cfg\.longMin, 'long', this\)"/);
});
