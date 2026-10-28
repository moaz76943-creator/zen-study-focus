'use strict';
// Execute the shipped restore/finalize/credit functions. Only the storage and
// Android bridge boundaries are controlled; no duplicate implementation of them.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const app=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/assets/web/app.js'),'utf8');
function body(name,next){
 const start=app.indexOf('function '+name+'('),end=app.indexOf(next,start);
 assert.ok(start>=0&&end>start,'Missing actual production function '+name);
 return app.slice(start,end);
}
const actual=body('accumulateActiveTime','const TIMER_STORAGE_KEY')+
 body('creditCompletedSession','function runTimerTick(')+
 body('restoreTimerSession','const ringCircumference');
function fixture({accepted=true,training=false,nextRunning=false}={}){
 const events=[],now=2000000;
 const snap={total:10,left:10,running:true,endAt:now-1000,mode:'focus',sessionId:'expired-real-id',activeMs:0,resumedAt:now-11000,training:training?{active:true}:null};
 const context={
  cfg:{lang:'en',sessions:0,todayMins:0,sessionHistory:[],completedTimerIds:[],shortMin:5,longMin:15},
  timerTotal:1500,timerLeft:1500,timerRunning:false,timerInterval:null,timerTargetTime:null,
  timerSessionId:null,focusSessionTaskId:null,quickTraining:null,timerActiveMs:0,timerResumeMs:null,
  currentTimerModeKey:'focus',customSessionLabel:'',TIMER_STORAGE_KEY:'zen_fortress_active_timer_v21',
  readNativeTimerSession:()=>snap,validQuickSnapshot:value=>value,
  loadFortressData(){throw Error('Must use native checkpoint');},
  Date:{now:()=>now},Number,Math,JSON,
  document:{getElementById:()=>({innerHTML:'',textContent:'Focus'}),dispatchEvent(){}},
  CustomEvent:function(){},clearInterval(){},
  setInterval(){throw Error('Expired checkpoint must not resume');},
  updateTimerDisplay(){},syncHeaderMetrics(){},showToast(){events.push('save-rejected');},
  localDateISO:()=> '2026-10-28',computeActualStreak:()=>1,
  saveFortressData(key,next){assert.equal(key,'zen_fortress_cfg_v21');events.push(accepted?'durable-credit':'rejected-credit');return accepted;},
  storeTimerSession(){events.push('timer-snapshot');return true;},
  selectTimerMode(){events.push('idle-mode');},
  playRichCompletionChime(){throw Error('Recovery must not replay completion chime');},
  advanceQuickTrainingStep(){events.push('next-phase');context.timerRunning=nextRunning;},
  window:{ZenNative:{stopBackgroundService(){events.push('native-cancel');}}}
 };
 vm.runInNewContext(actual,context,{filename:'app.js:actual-expired-reconcile'});
 return {context,events,restore:()=>context.restoreTimerSession()};
}
test('expired reconciliation clears native alarm only after durable completion credit',()=>{
 const f=fixture();f.restore();
 assert.equal(f.context.cfg.sessions,1);assert.deepEqual([...f.context.cfg.completedTimerIds],['expired-real-id']);
 assert.equal(f.context.timerRunning,false);
 assert.equal(f.events.filter(x=>x==='native-cancel').length,1);
 assert.ok(f.events.indexOf('native-cancel')>f.events.indexOf('durable-credit'));
});
test('refused expired credit retains native receipt and pending session for retry',()=>{
 const f=fixture({accepted:false});f.restore();
 assert.equal(f.context.cfg.sessions,0);assert.equal(f.context.timerSessionId,'expired-real-id');
 assert.equal(f.context.timerLeft,0);assert.equal(f.context.timerRunning,false);
 assert.deepEqual(f.events,['rejected-credit','save-rejected']);
});
test('expired quick-training credit does not cancel the next running interval',()=>{
 const f=fixture({training:true,nextRunning:true});f.restore();
 assert.equal(f.context.cfg.sessions,1);assert.equal(f.context.timerRunning,true);
 assert.deepEqual(f.events,['durable-credit','next-phase']);
});
test('finished quick-training recovery clears the old native alarm after credit',()=>{
 const f=fixture({training:true,nextRunning:false});f.restore();
 assert.equal(f.context.cfg.sessions,1);assert.equal(f.context.timerRunning,false);
 assert.deepEqual(f.events,['durable-credit','next-phase','native-cancel']);
});
