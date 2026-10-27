'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'../android/app/src/main/assets/web/app.js'),'utf8');
const start=app.indexOf('function selectTimerModeFromUser(');
const stop=app.indexOf('\nfunction changeTimerDelta(',start);
assert.ok(start>=0 && stop>start, 'Expected complete custom timer source section');
const section=app.slice(start,stop);
function setup({quick=false,allow=false,running=true,pauseAck=true,modeAck=true}={}) {
  let prompts=0,closes=0,toasts=0,rendered=0,stops=0;
  const saves=[],acknowledgements=[];
  const fields={
    inpCustomMins:{value:'40'},
    inpCustomTitle:{value:'New project'},
    modeCustomBtn:{classList:{add(){}},parentElement:{querySelectorAll(){return []}}}
  };
  const sandbox={
    window:{confirm(){prompts++;return allow;}},
    cfg:{lang:'en'},
    timerRunning:running,timerSessionId:'original-session',timerActiveMs:120000,
    timerLeft:900,timerTotal:1500,timerResumeMs:12345,
    currentTimerModeKey:'focus',customSessionLabel:'Existing title (25m)',
    quickTraining:quick?{active:true}:null,quickInternalChange:false,
    quickText(){return 'Discard quick training?'},
    renderQuickTraining(){rendered++;},
    L(){return {modeCustom:'Custom'}},toWest(x){return x},
    document:{getElementById(id){assert.ok(fields[id],`missing ${id}`);return fields[id]}},
    toggleTimerPlay(){stops++;if(pauseAck!==true)return false;sandbox.timerRunning=false;return true},
    persistActiveTimerSnapshot(snapshot){acknowledgements.push(snapshot);return modeAck},
    storeTimerSession(){saves.push({label:sandbox.customSessionLabel,mode:sandbox.currentTimerModeKey,total:sandbox.timerTotal});return true},
    updateTimerDisplay(){},
    closeModal(id){assert.equal(id,'customTimerModal');closes++;},
    showToast(){toasts++;}
  };
  vm.createContext(sandbox);
  vm.runInContext(section,sandbox);
  const apply=()=>vm.runInContext('applyCustomTimerNow()',sandbox);
  return {sandbox,apply,saves,acknowledgements,metrics:()=>({prompts,closes,toasts,rendered,stops})};
}

test('Declining a custom timer change preserves title, time, running session, and open dialog',()=>{
  const t=setup({allow:false});
  const result=t.apply();
  assert.equal(result,false);
  assert.equal(t.sandbox.customSessionLabel,'Existing title (25m)');
  assert.equal(t.sandbox.timerTotal,1500);
  assert.equal(t.sandbox.timerSessionId,'original-session');
  assert.equal(t.sandbox.timerRunning,true);
  assert.equal(t.saves.length,0);
  assert.deepEqual(t.metrics(),{prompts:1,closes:0,toasts:0,rendered:0,stops:0});
});

test('Accepting a custom timer change persists the new label before closing',()=>{
  const t=setup({allow:true});
  assert.equal(t.apply(),true);
  assert.equal(t.sandbox.customSessionLabel,'New project (40m)');
  assert.equal(t.sandbox.timerTotal,2400);
  assert.equal(t.sandbox.timerRunning,false);
  assert.equal(t.saves.at(-1).label,'New project (40m)');
  assert.equal(t.saves.at(-1).mode,'custom');
  assert.deepEqual(t.metrics(),{prompts:1,closes:1,toasts:1,rendered:0,stops:1});
});

test('Replacing quick training asks once and respects Cancel',()=>{
  const cancel=setup({quick:true,allow:false});
  assert.equal(cancel.apply(),false);
  assert.equal(cancel.sandbox.quickTraining.active,true);
  assert.equal(cancel.sandbox.customSessionLabel,'Existing title (25m)');
  assert.equal(cancel.saves.length,0);
  assert.equal(cancel.metrics().prompts,1);
  assert.equal(cancel.metrics().closes,0);
  const accept=setup({quick:true,allow:true});
  assert.equal(accept.apply(),true);
  assert.equal(accept.sandbox.quickTraining,null);
  assert.equal(accept.sandbox.customSessionLabel,'New project (40m)');
  assert.equal(accept.saves.at(-1).label,'New project (40m)');
  assert.deepEqual(accept.metrics(),{prompts:1,closes:1,toasts:1,rendered:1,stops:1});
});

test('Accepted Custom switch aborts when durable Pause is rejected, retaining current session and draft',()=>{
 const t=setup({allow:true,pauseAck:false});
 const previous=t.sandbox.customSessionLabel;
 assert.equal(t.apply(),false);
 assert.equal(t.sandbox.timerRunning,true);
 assert.equal(t.sandbox.timerSessionId,'original-session');
 assert.equal(t.sandbox.currentTimerModeKey,'focus');
 assert.equal(t.sandbox.customSessionLabel,previous);
 assert.equal(t.sandbox.timerTotal,1500);
 assert.equal(t.saves.length,0);
 assert.equal(t.metrics().closes,0);
 assert.equal(t.metrics().stops,1);
});

test('Rejected custom-mode checkpoint preserves paused progress and open editor',()=>{
 const t=setup({allow:true,running:false,modeAck:false});
 assert.equal(t.apply(),false);
 assert.equal(t.sandbox.timerSessionId,'original-session');
 assert.equal(t.sandbox.timerActiveMs,120000);
 assert.equal(t.sandbox.timerLeft,900);
 assert.equal(t.sandbox.timerTotal,1500);
 assert.equal(t.sandbox.customSessionLabel,'Existing title (25m)');
 assert.equal(t.sandbox.currentTimerModeKey,'focus');
 assert.equal(t.acknowledgements.length,1);
 assert.equal(t.acknowledgements[0].mode,'custom');
 assert.equal(t.acknowledgements[0].total,2400);
 assert.equal(t.saves.length,0);
 assert.equal(t.metrics().closes,0);
 assert.equal(t.metrics().toasts,0);
});
