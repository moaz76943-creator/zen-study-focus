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

// P0 mode/custom transition: use production selectors, snapshot writer and restore.
function modeRig({running=false,training=false,failure='throw'}={}){
 const h=toggleRig({running,failure});
 const elements=new Map();
 function element(id){
  if(!elements.has(id)){
   const classes=new Set(id==='modeFocusBtn'?['active']:id==='customTimerModal'?['open']:[]);
   elements.set(id,{value:id==='inpCustomMins'?'47':id==='inpCustomTitle'?'New custom title':'',
    textContent:'',innerHTML:'',style:{},setAttribute(){},
    classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),
     toggle(x,on){if(on)classes.add(x);else classes.delete(x);}},
    parentElement:{querySelectorAll:()=>['modeFocusBtn','modeShortBtn','modeLongBtn','modeCustomBtn'].map(element)}});
  }
  return elements.get(id);
 }
 const c=h.ctx;
 c.document.getElementById=id=>id==='mainPlayBtn'?h.button:element(id);
 c.cfg={domain:'study',shortMin:5,longMin:15};c.quickInternalChange=false;
 c.customSessionLabel='Old label';c.timerSessionId='stable-session';c.focusSessionTaskId=7;
 if(training)c.quickTraining={active:true,sets:2,workSeconds:20,restSeconds:10,currentSet:0,
  phase:'work',skipLastRest:true,domain:'study',taskId:7,exercises:['Read']};
 c.renderQuickTraining=()=>h.events.push(['training-render']);
 c.closeModal=id=>{element(id).classList.remove('open');h.events.push(['close',id]);};
 c.toWest=x=>String(x);c.L=()=>({saveFailed:'Could not save',modeCustom:'Custom',modeShort:'Short',modeLong:'Long',domStudy:'Study'});
 c.formatDurationUnit=(n,u)=>`${n} ${u}`;c.ringCircumference=660;c.updateFocusStatus=()=>{};
 c.loadFortressData=()=>h.persisted;
 c.validQuickSnapshot=x=>x; // persistence shape checked by neighboring quick-training suite
 for(const [a,b] of [['function selectTimerModeFromUser(', 'function selectTimerMode('],
  ['function applyCustomTimerNow()', 'function changeTimerDelta('],
  ['function restoreTimerSession()', 'const ringCircumference'],
  ['function updateTimerDisplay()', 'function selectTimerModeFromUser('],
  ['function selectHomeQuickSession(', 'function logWorkoutSet('],
  ['function skipTimerPhase()', 'function addWaterCup()']]){
  const start=app.indexOf(a),end=app.indexOf(b,start);assert.ok(start>=0&&end>start);
  vm.runInContext(app.slice(start,end),c);
 }
 const state=()=>JSON.parse(JSON.stringify(h.snapshot()));
 const ui=()=>({play:h.button.innerHTML,caption:element('timerModeCaption').textContent,
  active:['modeFocusBtn','modeShortBtn','modeLongBtn','modeCustomBtn'].filter(id=>element(id).classList.contains('active')),
  open:element('customTimerModal').classList.contains('open'),
  title:element('inpCustomTitle').value,mins:element('inpCustomMins').value});
 // Seed the old durable session, then reject only the requested replacement.
 h.allow();h.call('storeTimerSession()');h.call('updateTimerDisplay()');
 const writer=c.saveFortressData;let refuse=true;
 c.saveFortressData=(key,next)=>{
  if(refuse&&next.sessionId===null){
   if(failure==='throw')throw Error('QuotaExceededError');return false;
  }
  return writer(key,next);
 };
 h.events.length=0;
 return {...h,element,state,ui,get persisted(){return h.persisted;},accept(){refuse=false;}};
}
for(const action of ['mode','custom'])for(const running of [false,true])for(const training of [false,true])for(const failure of ['throw','false'])test(`P0 mode/custom ${action} running=${running} training=${training} ${failure}`,()=>{
 const h=modeRig({running,training,failure}),before=h.state(),ui=h.ui(),saved=h.persisted;
 const code=action==='custom'?'applyCustomTimerNow()':"selectTimerModeFromUser(5,'short',document.getElementById('modeShortBtn'))";
 assert.throws(()=>h.call(code),/QuotaExceededError|TIMER_SAVE_NOT_ACKNOWLEDGED/);
 assert.deepEqual(h.state(),before,'Failed replacement retains complete session and training');
 assert.deepEqual(h.ui(),ui,'Failed replacement retains buttons, caption and editable modal');
 assert.deepEqual(h.persisted,saved,'No partial Pause may replace old snapshot');
 assert.deepEqual(h.events,[],'No native/interval/render/close work before verified save');
 assert.deepEqual(h.messages,['Could not save']);
 h.accept();assert.equal(h.call(code),true);
 assert.equal(h.ctx.currentTimerModeKey,action==='custom'?'custom':'short');
 assert.equal(h.persisted.label,action==='custom'?'New custom title (47m)':'Old label');
 assert.equal(h.persisted.total,action==='custom'?2820:300);
 assert.equal(h.persisted.sessionId,null);assert.equal(h.persisted.taskId,null);
 assert.equal(h.persisted.training,null);assert.equal(h.persisted.running,false);
 assert.equal(h.events.filter(e=>e[0]==='save').length,1,'One committed transition');
 assert.equal(h.events[0][0],'save','Save must precede native/UI changes');
 assert.equal(h.events.filter(e=>e[0]==='native-stop').length,running?1:0);
 assert.deepEqual(h.ui().active,[action==='custom'?'modeCustomBtn':'modeShortBtn']);
 // Simulate a fresh WebView's empty timer state and restore using the real body.
 h.ctx.timerRunning=false;h.ctx.timerSessionId=null;h.ctx.customSessionLabel='';
 h.ctx.currentTimerModeKey='focus';h.ctx.timerLeft=1;h.ctx.timerTotal=1;
 h.call('restoreTimerSession()');
 assert.equal(h.ctx.timerTotal,action==='custom'?2820:300);
 assert.equal(h.element('timerModeCaption').textContent,action==='custom'?'New custom title (47m)':'Short');
});
for(const custom of [false,true])test(`P0 mode/custom Cancel preserves all state (custom=${custom})`,()=>{
 const h=modeRig({running:true,training:true}),before=h.state(),ui=h.ui();
 h.ctx.window.confirm=()=>false;
 assert.equal(h.call(custom?'applyCustomTimerNow()':"selectTimerModeFromUser(5,'short',document.getElementById('modeShortBtn'))"),false);
 assert.deepEqual(h.state(),before);assert.deepEqual(h.ui(),ui);assert.deepEqual(h.events,[]);
});
test('P0 mode/custom direct training Cancel propagates false through user wrapper',()=>{
 const h=modeRig({training:true});h.ctx.timerSessionId=null;h.ctx.timerActiveMs=0;
 h.ctx.window.confirm=()=>false;const before=h.state();
 assert.equal(h.call("selectTimerModeFromUser(5,'short',null)"),false);
 assert.deepEqual(h.state(),before);assert.deepEqual(h.events,[]);
});
for(const running of [false,true])test(`P0 mode/custom home shortcut rejection preserves training running=${running}`,()=>{
 const h=modeRig({running,training:true}),before=h.state(),ui=h.ui();
 assert.throws(()=>h.call('selectHomeQuickSession(50)'),/QuotaExceededError|TIMER_SAVE_NOT_ACKNOWLEDGED/);
 assert.deepEqual(h.state(),before);assert.deepEqual(h.ui(),ui);assert.deepEqual(h.events,[]);
});
test('P0 mode/custom Skip and internal rest preserve valid training and shortcuts',()=>{
 const h=modeRig({training:true});h.accept();h.ctx.quickInternalChange=true;
 assert.equal(h.call("selectTimerMode(10/60,'short',document.getElementById('modeShortBtn'))"),true);
 assert.equal(h.ctx.quickTraining.active,true);assert.equal(h.persisted.training.phase,'work');
 assert.equal(h.ctx.timerTotal,10,'Internal training seconds must not be rounded to minutes');
 const rest=modeRig();rest.accept();assert.equal(rest.call('skipTimerPhase()'),true);
 assert.equal(rest.ctx.currentTimerModeKey,'short');assert.equal(rest.ctx.timerTotal,300);
 const home=modeRig();home.accept();assert.equal(home.call('selectHomeQuickSession(50)'),true);
 assert.equal(home.ctx.currentTimerModeKey,'focus');assert.equal(home.ctx.timerTotal,3000);
});
test('P0 mode/custom successful custom title survives real snapshot reload',()=>{
 const h=modeRig();h.accept();
 assert.equal(h.call('applyCustomTimerNow()'),true);
 assert.equal(h.persisted.label,'New custom title (47m)','The committed snapshot must already contain the new title');
 assert.equal(h.ui().open,false);assert.equal(h.element('timerModeCaption').textContent,'New custom title (47m)');
 h.ctx.customSessionLabel='';h.ctx.currentTimerModeKey='focus';
 h.call('restoreTimerSession()');
 assert.equal(h.ctx.customSessionLabel,'New custom title (47m)');
 assert.equal(h.element('timerModeCaption').textContent,'New custom title (47m)');
});
