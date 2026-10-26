'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const app = fs.readFileSync(path.resolve(__dirname, '../../android/app/src/main/assets/web/app.js'), 'utf8');
function production(from, to) {
  const start = app.indexOf('function ' + from + '(');
  const end = app.indexOf('function ' + to + '(', start + 10);
  assert.ok(start >= 0 && end > start, 'Current production function boundary: ' + from);
  return app.slice(start, end);
}

test('v21 timer save acknowledges success but fails closed on failed storage write', () => {
  const key = 'zen_fortress_active_timer_v21';
  const events = [];
  const ctx = {
    TIMER_STORAGE_KEY:key, timerTotal:1500, timerLeft:900, timerRunning:false,
    timerTargetTime:null, currentTimerModeKey:'focus', customSessionLabel:'',
    timerSessionId:'same-session', focusSessionTaskId:null, timerActiveMs:2000,
    timerResumeMs:null, quickTraining:null, window:{}, L:()=>({saveFailed:'Save failed'}),
    showToast:s=>events.push(['toast',s]),
    saveFortressData:(k,v)=>{events.push(['write',k]);assert.equal(k,key);return true;}
  };
  vm.runInNewContext(production('storeTimerSession','creditCompletedSession'),ctx);
  assert.equal(ctx.storeTimerSession(),true);
  ctx.saveFortressData=()=>{throw Error('Injected storage failure');};
  assert.equal(ctx.storeTimerSession(),false,'Failed v21 save must NOT be acknowledged');
  assert.ok(events.some(e=>e[0]==='toast'),'User must receive save failure feedback');
});

function timerContext(running) {
  const record={running,activeMs:32000,resumeMs:Date.now()-2500,target:Date.now()+100000};
  const events=[];
  const button={innerHTML:''};
  const ctx={
    document:{getElementById:(name)=>name==='mainPlayBtn'?button:{textContent:'Focus'}},
    timerRunning:running,timerTotal:1500,timerLeft:100,timerTargetTime:record.target,
    timerResumeMs:record.resumeMs,timerActiveMs:record.activeMs,
    timerInterval:running?77:null, timerSessionId:'session-stable',
    focusSessionTaskId:44, quickTraining:null, chimeCtx:{state:'running'},
    window:{ZenNative:{stopBackgroundService(){events.push('STOP')},startBackgroundService(){events.push('START')}}},
    Date,Math,Number,JSON,
    accumulateActiveTime(){ctx.timerActiveMs+=2500;ctx.timerResumeMs=null;},
    clearInterval(){events.push('CLEAR')},
    setInterval(){events.push('TICK');return 88;},
    runTimerTick(){},updateTimerDisplay(){events.push('DISPLAY')},
    storeTimerSession(){events.push('REJECTED_SAVE');return false;}
  };
  vm.runInNewContext(production('toggleTimerPlay','resetTimerNow'),ctx);
  return {ctx,button,events,record};
}

test('failed Pause save retains running timer, exact session ID and native alarm', () => {
  const {ctx,events,record}=timerContext(true);
  assert.equal(ctx.toggleTimerPlay(),false,'Pause must not claim success');
  assert.equal(ctx.timerRunning,true);
  assert.equal(ctx.timerSessionId,'session-stable');
  assert.equal(ctx.focusSessionTaskId,44);
  assert.equal(ctx.timerActiveMs,record.activeMs);
  assert.equal(ctx.timerResumeMs,record.resumeMs);
  assert.equal(ctx.timerTargetTime,record.target);
  assert.ok(events.includes('TICK'),'Expired queued callback should resume ticking');
  assert.ok(!events.includes('STOP'),'Native alarm must remain active');
});

test('failed Start save cannot start alarm or fabricate running timer', () => {
  const {ctx,events}=timerContext(false);
  assert.equal(ctx.toggleTimerPlay(),false,'Failed Start must be rejected');
  assert.equal(ctx.timerRunning,false);
  assert.equal(ctx.timerSessionId,'session-stable');
  assert.equal(ctx.focusSessionTaskId,44);
  assert.ok(!events.includes('START'),'No background service before durable save');
  assert.ok(!events.includes('TICK'),'No running timer interval after rejected Start');
});
