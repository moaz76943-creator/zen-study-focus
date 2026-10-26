'use strict';
// DF-PARALLEL-07: exercise actual quick_training.js actions, not an alternate timer.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../../../android/app/src/main/assets/web/quick_training.js'),'utf8');

function fixture({pauseAcknowledged=false,confirmCancel=true,running=true}={}) {
  const calls={pause:0,mode:0,confirm:0,event:0,render:0,toasts:[]};
  const context=vm.createContext({
    cfg:{lang:'en',domain:'sport'},timerRunning:running,timerSessionId:'live-session',
    document:{getElementById(id){return {id};}},
    window:{
      confirm(){calls.confirm++;return confirmCancel;},
      dispatchEvent(){calls.event++;}
    },
    CustomEvent:function(type,init){this.type=type;this.detail=init.detail;},
    toggleTimerPlay(){
      calls.pause++;
      if(pauseAcknowledged)context.timerRunning=!context.timerRunning;
      return pauseAcknowledged;
    },
    selectTimerMode(){calls.mode++;return true;},
    renderQuickTraining(){calls.render++;},
    showToast(s){calls.toasts.push(s);},
    L(){return {saveFailed:'Save failed'};},
    getDomainFocusMinutes(){return 25;},
    toWest:String
  });
  vm.runInContext(source,context,{filename:'quick_training.js'});
  vm.runInContext('quickTraining='+JSON.stringify({
    active:true,sets:3,workSeconds:20,restSeconds:10,currentSet:0,phase:'work',
    skipLastRest:true,domain:'sport',exercises:[],taskId:null
  }),context);
  const snapshot=()=>vm.runInContext('JSON.stringify(quickTraining)',context);
  const run=(name)=>vm.runInContext(name+'()',context);
  return {context,calls,snapshot,run};
}

test('Skip must not advance work or emit phase events when Pause ACK is refused',()=>{
  const x=fixture();
  const before=x.snapshot();
  assert.equal(x.run('skipQuickTrainingStep'),false);
  assert.equal(x.snapshot(),before,'Retain exact work/rest set and task link');
  assert.equal(x.context.timerSessionId,'live-session');
  assert.equal(x.context.timerRunning,true);
  assert.equal(x.calls.pause,1);
  assert.equal(x.calls.mode,0,'Never switch timer modes after rejected pause');
  assert.equal(x.calls.event,0,'No false phase transition');
  assert.ok(x.calls.toasts.length>=1,'Tell user the save was rejected');
});

test('Confirmed End must retain active training when Pause ACK is refused',()=>{
  const x=fixture();
  const before=x.snapshot();
  assert.equal(x.run('cancelQuickTraining'),false);
  assert.equal(x.calls.confirm,1);
  assert.equal(x.snapshot(),before,'Failed pause is not a completed cancellation');
  assert.equal(x.context.timerSessionId,'live-session');
  assert.equal(x.context.timerRunning,true);
  assert.equal(x.calls.pause,1);
  assert.equal(x.calls.mode,0);
  assert.equal(x.calls.event,0);
});

test('Dialog Cancel remains a complete no-op with no storage or timer side effects',()=>{
  const x=fixture({confirmCancel:false});
  const before=x.snapshot();
  x.run('cancelQuickTraining');
  assert.equal(x.snapshot(),before);
  assert.equal(x.calls.confirm,1);
  assert.equal(x.calls.pause,0);
  assert.equal(x.calls.mode,0);
  assert.equal(x.calls.event,0);
});

test('Successful confirmed End stops once and emits one cancellation event',()=>{
  const x=fixture({pauseAcknowledged:true});
  assert.equal(x.run('cancelQuickTraining'),true);
  assert.equal(x.snapshot(),'null');
  assert.equal(x.context.timerRunning,false);
  assert.equal(x.calls.pause,1,'Pause exactly once');
  assert.equal(x.calls.mode,1,'Reset to domain focus only after Pause');
  assert.equal(x.calls.event,1,'One cancellation without crediting minutes');
});
