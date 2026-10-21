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
 let reject=true;
 const ctx=vm.createContext({...state,Date:{now:()=>110000},Math,String,Number,
  TIMER_STORAGE_KEY:'zen_fortress_active_timer_v21',
  document:{getElementById:id=>id==='mainPlayBtn'?button:{textContent:'Focus'}},
  saveFortressData(key,snapshot){
   events.push(['save',key,JSON.parse(JSON.stringify(snapshot))]);
   if(reject&&failure==='throw')throw Error('QuotaExceededError');
   return !(reject&&failure==='false');
  },window:{confirm:()=>true,ZenNative:{stopBackgroundService(){events.push(['native-stop']);}}},
  quickText:()=> 'Replace session?',
  L:()=>({saveFailed:'Could not save'}),showToast:m=>messages.push(m),
  setInterval(){events.push(['interval-start']);return 18;},clearInterval:id=>events.push(['interval-stop',id]),
  startNativeTimerForCurrentSession:(...args)=>events.push(['native-start',...args]),
  focusWorkflowGetLinkedTask:()=>({id:7}),runTimerTick(){},finalizeTimerSession(){throw Error('Unexpected completion');}
 });
 for(const [begin,finish] of [['function accumulateActiveTime()', 'const TIMER_STORAGE_KEY'],
  ['function storeTimerSession()', 'function creditCompletedSession()'],
  ['function toggleTimerPlay()', 'function resetTimerNow()'],
  ['function selectTimerMode(mins,', 'function openCustomTimerModal()'],
  ['function resetTimerNow()', 'function skipTimerPhase()']]){
  const a=app.indexOf(begin),b=app.indexOf(finish,a);assert.ok(a>=0&&b>a);vm.runInContext(app.slice(a,b),ctx);
 }
 const snapshot=()=>Object.fromEntries(Object.keys(original).map(k=>[k,ctx[k]]));
 return {ctx,original,events,messages,button,snapshot,allow(){reject=false;},run:()=>vm.runInContext('toggleTimerPlay()',ctx),call:code=>vm.runInContext(code,ctx)};
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
