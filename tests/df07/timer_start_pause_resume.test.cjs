'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/assets/web/app.js'),'utf8');
function segment(start,end){
  const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
  assert.ok(a>=0&&b>a,'Expected production timer function boundary: '+start);
  return source.slice(a,b);
}
const accumulation=segment('function accumulateActiveTime()','const TIMER_STORAGE_KEY');
const toggle=segment('function toggleTimerPlay()','function resetTimerNow()');
const tick=segment('function runTimerTick()','function restoreTimerSession()');

function rig({saveAcks=[]}={}){
  const acknowledgements=[...saveAcks];
  const calls={saves:[],nativeStarts:[],nativeStops:0,intervals:0,clears:0,completions:0};
  const button={innerHTML:''},caption={textContent:'Study 25m'};
  let handle=0;
  const c={
    timerRunning:false,timerSessionId:null,timerLeft:1500,timerTotal:1500,
    timerTargetTime:null,timerResumeMs:null,timerActiveMs:0,timerInterval:null,
    quickTraining:null,focusSessionTaskId:null,chimeCtx:null,
    document:{getElementById(id){return id==='mainPlayBtn'?button:caption}},
    window:{
      AudioContext:class {constructor(){this.state='running'}},
      ZenNative:{
        startBackgroundService(...args){calls.nativeStarts.push(args)},
        stopBackgroundService(){calls.nativeStops++}
      }
    },
    setInterval(){calls.intervals++;return ++handle},
    clearInterval(){calls.clears++},
    storeTimerSession(){calls.saves.push(JSON.parse(vm.runInContext('JSON.stringify({timerRunning,timerSessionId,timerLeft,timerTotal,timerResumeMs,timerActiveMs})',c)));return acknowledgements.length?acknowledgements.shift():true;},
    updateTimerDisplay(){},
    finalizeTimerSession(){calls.completions++}
  };
  vm.createContext(c);
  vm.runInContext(accumulation+toggle+tick,c);
  const evaluate=code=>vm.runInContext(code,c);
  const state=()=>JSON.parse(evaluate('JSON.stringify({running:timerRunning,id:timerSessionId,left:timerLeft,total:timerTotal,resume:timerResumeMs,active:timerActiveMs})'));
  return {c,calls,state,play:()=>evaluate('toggleTimerPlay()'),tick:()=>evaluate('runTimerTick()')};
}

test('Start, Pause and Resume retain exactly one session ID without changing timer duration',()=>{
  const t=rig();
  t.play();
  const started=t.state();
  assert.equal(started.running,true);
  assert.ok(started.id&&typeof started.id==='string');
  assert.equal(started.total,1500);
  assert.equal(t.calls.saves.length,1);
  t.play();
  const paused=t.state();
  assert.equal(paused.running,false);
  assert.equal(paused.id,started.id);
  assert.equal(paused.total,1500);
  assert.equal(t.calls.saves.length,2);
  t.play();
  const resumed=t.state();
  assert.equal(resumed.running,true);
  assert.equal(resumed.id,started.id,'Resume must not create another focus session');
  assert.equal(resumed.total,1500);
  assert.equal(t.calls.saves.length,3);
  assert.equal(t.calls.nativeStarts.length,2);
  assert.equal(t.calls.nativeStops,1);
  assert.equal(t.calls.intervals,2);
  assert.equal(t.calls.clears,1);
  assert.equal(t.calls.completions,0);
});

test('Queued timer tick following Pause cannot complete or credit a session',()=>{
  const t=rig();
  t.play();
  t.play();
  const before=t.state();
  t.c.timerTargetTime=Date.now()-5000;
  t.tick();
  assert.deepEqual(t.state(),before,'Paused session must ignore obsolete completion callbacks');
  assert.equal(t.calls.completions,0);
  assert.equal(t.calls.saves.length,2);
});

test('Start denied by durable storage leaves no phantom running session or native alarm',()=>{
  const t=rig({saveAcks:[false]});
  assert.equal(t.play(),false);
  assert.deepEqual(t.state(),{running:false,id:null,left:1500,total:1500,resume:null,active:0});
  assert.equal(t.calls.nativeStarts.length,0);
  assert.equal(t.calls.intervals,0);
  assert.equal(t.calls.saves.length,1);
});
test('Pause rejected by durable storage keeps original focus session running and alarm intact',()=>{
  const t=rig({saveAcks:[true,false]});
  assert.equal(t.play(),true);
  const before=t.state();
  assert.equal(t.play(),false);
  const after=t.state();
  assert.equal(after.id,before.id);
  assert.equal(after.running,true);
  assert.equal(after.total,before.total);
  assert.equal(t.calls.nativeStops,0);
  assert.equal(t.calls.intervals,2,'Failed Pause must rearm an in-app tick');
});
test('Resume rejected by storage preserves previously paused session identity',()=>{
  const t=rig({saveAcks:[true,true,false]});
  assert.equal(t.play(),true);
  assert.equal(t.play(),true);
  const paused=t.state();
  assert.equal(paused.running,false);
  assert.equal(t.play(),false);
  assert.deepEqual(t.state(),paused);
  assert.equal(t.calls.nativeStarts.length,1);
});
