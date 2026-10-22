'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const app=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/assets/web/app.js'),'utf8');
function rig(integrated,training=false){
 const cfg={lang:'en',todayMins:0,sessions:0,streak:0,unknown:{keep:'١٢'},sessionHistory:[],quickFocusRemainderSec:45};
 let fail=false,writes=0,refresh=0;const messages=[];
 const c=vm.createContext({cfg,tasksList:[{id:7,title:'Task',isStarter:false}],window:{},JSON,Number,Math,
  currentTimerModeKey:'focus',timerSessionId:'stable-id',timerActiveMs:training?20000:60000,
  quickTraining:training?{active:true}:null,focusSessionTaskId:7,
  localDateISO:()=> '2026-10-20',computeActualStreak:()=>1,syncHeaderMetrics(){refresh++;},
  document:{dispatchEvent(){}},showToast:s=>messages.push(s),CustomEvent:class{},
  saveFortressData(key,next){writes++;if(fail)throw Error('QuotaExceededError');return true;}
 });
 const run=s=>vm.runInContext(s,c);
 if(integrated)c.window.DF22Integration={getSnapshot:()=>JSON.parse(run('JSON.stringify({cfg,tasksList,notesList:[]})')),
  write(before,after){writes++;if(fail)throw Error('QuotaExceededError');c.cfg=after.cfg;return true;},onSessionRecorded(){}};
 const start=app.indexOf('function creditCompletedSession('),end=app.indexOf('\nfunction finalizeTimerSession',start);
 run(app.slice(start,end));
 return {run,fail(v){fail=v;},messages,get writes(){return writes;},get refresh(){return refresh;}};
}
for(const integrated of [true,false])for(const training of [true,false])test(`DF-112/122 failed completion retains real credit for retry (journal=${integrated}, training=${training})`,()=>{
 const h=rig(integrated,training),before=h.run('JSON.stringify(cfg)');h.fail(true);
 assert.equal(h.run('creditCompletedSession()'),false);
 assert.equal(h.run('JSON.stringify(cfg)'),before,'Uncommitted IDs/counters/remainder must not be published');
 assert.equal(h.refresh,0);h.fail(false);
 assert.equal(h.run('creditCompletedSession()'),true);
 assert.equal(h.run('cfg.sessions'),1);assert.equal(h.run('cfg.sessionHistory.length'),1);
 assert.equal(h.run('cfg.sessionHistory[0].minutes'),1);
 assert.equal(h.run('cfg.sessionHistory[0].taskId'),7);
 assert.equal(h.run('cfg.unknown.keep'),'١٢');
 assert.equal(h.run('cfg.quickFocusRemainderSec'),training?5:45);
 const writes=h.writes;
 assert.equal(h.run('creditCompletedSession()'),true);
 assert.equal(h.writes,writes,'Duplicate callback must not rewrite or count again');
 assert.equal(h.run('cfg.sessions'),1);
});
test('rest completion is a successful no-op without focus credit or persistence',()=>{
 const h=rig(true);h.run('currentTimerModeKey="short"');
 assert.equal(h.run('creditCompletedSession()'),true);assert.equal(h.writes,0);
});

// CROSS-002 / TIMER-028: real Start/Pause functions with a rejected snapshot write.
function toggleRig({running=false,failure='throw'}={}){
 const state={timerRunning:running,timerLeft:90,timerTotal:120,timerInterval:running?17:null,
  timerTargetTime:running?200000:null,timerSessionId:running?'stable-session':null,
  focusSessionTaskId:running?7:null,timerActiveMs:30000,timerResumeMs:running?100000:null,
  currentTimerModeKey:'focus',customSessionLabel:'Personal label ۱۲',quickTraining:null,chimeCtx:null};
 const original=JSON.parse(JSON.stringify(state)),events=[],messages=[],button={innerHTML:running?'pause':'play'};
 let reject=true,persisted=null;
 const ctx=vm.createContext({...state,Date:{now:()=>110000},Math,String,Number,
  TIMER_STORAGE_KEY:'zen_fortress_active_timer_v21',
  document:{getElementById:id=>id==='mainPlayBtn'?button:{textContent:'Focus'}},
  saveFortressData(key,snapshot){
   events.push(['save',key,JSON.parse(JSON.stringify(snapshot))]);
   if(reject&&failure==='throw')throw Error('QuotaExceededError');
   if(reject&&failure==='false')return false;
   persisted=JSON.parse(JSON.stringify(snapshot));
   return true;
  },window:{confirm:()=>true,ZenNative:{stopBackgroundService(){events.push(['native-stop']);}}},
  quickText:()=> 'Replace session?',
  L:()=>({saveFailed:'Could not save'}),showToast:m=>messages.push(m),
  setInterval(){events.push(['interval-start']);return 18;},clearInterval:id=>events.push(['interval-stop',id]),
  startNativeTimerForCurrentSession:(...args)=>events.push(['native-start',...args]),
  updateTimerDisplay:()=>events.push(['display']),
  focusWorkflowGetLinkedTask:()=>({id:7}),runTimerTick(){},finalizeTimerSession(){throw Error('Unexpected completion');}
 });
 for(const [begin,finish] of [['function accumulateActiveTime()', 'const TIMER_STORAGE_KEY'],
  ['function storeTimerSession()', 'function creditCompletedSession()'],
  ['function toggleTimerPlay()', 'function resetTimerNow()'],
  ['function changeTimerDelta(', 'function startNativeTimerForCurrentSession('],
  ['function selectTimerMode(mins,', 'function openCustomTimerModal()'],
  ['function resetTimerNow()', 'function skipTimerPhase()']]){
  const a=app.indexOf(begin),b=app.indexOf(finish,a);assert.ok(a>=0&&b>a);vm.runInContext(app.slice(a,b),ctx);
 }
 const snapshot=()=>Object.fromEntries(Object.keys(original).map(k=>[k,ctx[k]]));
 return {ctx,original,events,messages,button,snapshot,get persisted(){return persisted;},allow(){reject=false;},run:()=>vm.runInContext('toggleTimerPlay()',ctx),call:code=>vm.runInContext(code,ctx)};
}
for(const running of [false,true])for(const failure of ['throw','false'])test(`CROSS-002 ${running?'Pause':'Start'} ${failure} keeps timer, identity and scheduled work unchanged`,()=>{
 const h=toggleRig({running,failure});
 assert.throws(h.run,/QuotaExceededError|TIMER_SAVE_NOT_ACKNOWLEDGED/);
 assert.deepEqual(h.snapshot(),h.original);
 assert.equal(h.button.innerHTML,running?'pause':'play');
 assert.equal(h.events.length,1,'Only persistence attempted; no native/interval transitions');
 assert.deepEqual(h.messages,['Could not save']);
 h.allow();h.run();
 assert.equal(h.ctx.timerRunning,!running);
 assert.equal(h.ctx.focusSessionTaskId,7);
 if(running){
  assert.equal(h.ctx.timerSessionId,'stable-session');
  assert.equal(h.ctx.timerActiveMs,40000,'Retry counts elapsed time once');
  assert.equal(h.ctx.timerResumeMs,null);
  assert.deepEqual(h.events.slice(2),[['interval-stop',17],['native-stop']]);
 }else{
  assert.equal(h.ctx.timerActiveMs,30000);
  assert.equal(h.ctx.timerResumeMs,110000);
  assert.equal(h.ctx.timerTargetTime,200000);
  assert.deepEqual(h.events.slice(2),[['native-start',90,'Focus'],['interval-start']]);
 }
 const saved=h.events[1][2];
 assert.equal(saved.running,!running);
 assert.equal(saved.sessionId,h.ctx.timerSessionId);
 assert.equal(saved.taskId,7);
});

for(const action of ["selectTimerMode(5,'short',null)", 'resetTimerNow()'])test('CROSS-002 failed pause aborts internal '+action,()=>{
 const h=toggleRig({running:true});
 assert.throws(()=>h.call(action),/QuotaExceededError/);
 assert.deepEqual(h.snapshot(),h.original,'Caller cannot discard identity/elapsed time after rejected pause');
 assert.equal(h.events.length,1);
 assert.deepEqual(h.messages,['Could not save']);
});

for(const running of [false,true])for(const failure of ['throw','false'])test(`CROSS-002 duration adjustment ${running?'running':'paused'} ${failure} preserves JS/native duration until save`,()=>{
 const h=toggleRig({running,failure});
 assert.throws(()=>h.call('changeTimerDelta(5)'),/QuotaExceededError|TIMER_SAVE_NOT_ACKNOWLEDGED/);
 assert.deepEqual(h.snapshot(),h.original);
 assert.equal(h.events.length,1,'Rejected write must not reschedule native timer or redraw success');
 assert.deepEqual(h.messages,['Could not save']);
 h.allow();h.call('changeTimerDelta(5)');
 assert.equal(h.ctx.timerLeft,390);assert.equal(h.ctx.timerTotal,390);
 assert.equal(h.ctx.timerSessionId,h.original.timerSessionId);
 assert.equal(h.ctx.timerActiveMs,30000);
 assert.equal(h.events[1][2].left,390);assert.equal(h.events[1][2].total,390);
 assert.deepEqual(h.events.slice(2),running?[['native-start',390,'Focus'],['display']]:[['display']]);
});
test('CROSS-002 successful decrement preserves ten-second floor and identity',()=>{
 const h=toggleRig({running:true});h.allow();h.call('changeTimerDelta(-5)');
 assert.equal(h.ctx.timerLeft,10);assert.equal(h.ctx.timerTotal,120);
 assert.equal(h.ctx.timerSessionId,'stable-session');assert.equal(h.ctx.focusSessionTaskId,7);
 assert.deepEqual(h.events.slice(1),[['native-start',10,'Focus'],['display']]);
});

// P0 Reset: reject the reset snapshot itself, even if a preceding Pause could save.
for(const running of [false,true])for(const failure of ['throw','false'])test(`P0 Reset ${running?'running':'paused'} ${failure} preserves session and retries atomically`,()=>{
 const h=toggleRig({running,failure});
 // A paused session still owns its task, elapsed time and identity.
 if(!running){h.ctx.timerSessionId='stable-session';h.ctx.focusSessionTaskId=7;}
 h.allow();h.call('storeTimerSession()');
 const before=h.snapshot(),saved=h.persisted,button=h.button.innerHTML;
 // Re-enable refusal only for the reset snapshot; old implementation saves Pause first.
 const writer=h.ctx.saveFortressData;
 let refuse=true;
 h.ctx.saveFortressData=(key,next)=>{
  if(refuse&&next.sessionId===null){
   if(failure==='throw')throw Error('QuotaExceededError');
   return false;
  }
  return writer(key,next);
 };
 h.events.length=0;
 assert.throws(()=>h.call('resetTimerNow()'),/QuotaExceededError|TIMER_SAVE_NOT_ACKNOWLEDGED/);
 assert.deepEqual(h.snapshot(),before,'Rejected Reset retains every timer/session field');
 assert.deepEqual(h.persisted,saved,'Old durable session remains intact');
 assert.equal(h.button.innerHTML,button,'No successful Reset shown');
 assert.deepEqual(h.events,[],'No native stop, interval stop, display, or intermediate Pause save');
 assert.deepEqual(h.messages,['Could not save']);
 refuse=false;
 assert.equal(h.call('resetTimerNow()'),true);
 assert.equal(h.ctx.timerRunning,false);assert.equal(h.ctx.timerLeft,h.ctx.timerTotal);
 assert.equal(h.ctx.timerSessionId,null);assert.equal(h.ctx.focusSessionTaskId,null);
 assert.equal(h.ctx.timerActiveMs,0);assert.equal(h.ctx.timerResumeMs,null);
 assert.equal(h.ctx.customSessionLabel,before.customSessionLabel);
 assert.equal(h.persisted.sessionId,null);assert.equal(h.persisted.left,h.ctx.timerTotal);
 assert.equal(h.persisted.running,false);assert.equal(h.persisted.endAt,null);
 assert.deepEqual(h.events.map(e=>e[0]),running?['save','interval-stop','native-stop','display']:['save','display']);
});
test('P0 Reset cancellation and quick-training delegation preserve existing behavior',()=>{
 const h=toggleRig({running:true});h.ctx.window.confirm=()=>false;
 assert.equal(h.call('resetTimerNow()'),false);
 assert.deepEqual(h.snapshot(),h.original);assert.deepEqual(h.events,[]);
 h.ctx.quickTraining={active:true};let cancelled=0;
 h.ctx.cancelQuickTraining=()=>cancelled++;
 h.call('resetTimerNow()');assert.equal(cancelled,1);assert.deepEqual(h.events,[]);
});
