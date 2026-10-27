'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const web=path.resolve(__dirname,'../../android/app/src/main/assets/web');
const quick=fs.readFileSync(path.join(web,'quick_training.js'),'utf8');
const app=fs.readFileSync(path.join(web,'app.js'),'utf8');
function production(name) {
  const start=app.indexOf('function '+name+'('),end=app.indexOf('\nfunction ',start+10);
  assert.ok(start>=0 && end>start,name);
  return app.slice(start,end);
}
function fixture() {
  let now=1000000,serial=0,reject=null,confirmation=true;
  const slots=new Map(),nodes=new Map(),events=[];
  const el=id=>{
    if(!nodes.has(id))nodes.set(id,{value:'',checked:true,textContent:'Focus',innerHTML:'',style:{},
      classList:{add(){},remove(){}},parentElement:{querySelectorAll(){return [];}},appendChild(){}});
    return nodes.get(id);
  };
  const clock=class extends Date {constructor(...args){super(...(args.length?args:[now]));} static now(){return now;}};
  const ctx=vm.createContext({
    Date:clock,Math:{...Math,random:()=>++serial/1000,round:Math.round,max:Math.max,min:Math.min,floor:Math.floor,ceil:Math.ceil},
    document:{getElementById:el,createElement:()=>el('child'+serial++),dispatchEvent:e=>events.push(e)},
    window:{confirm:()=>confirmation,dispatchEvent:e=>events.push(e)},
    CustomEvent:function(type,init){this.type=type;this.detail=init.detail;},
    cfg:{lang:'en',domain:'sport',sessions:0,todayMins:0,sessionHistory:[],shortMin:5,longMin:15},tasksList:[],
    timerRunning:false,timerSessionId:null,timerTotal:20,timerLeft:20,timerActiveMs:0,timerResumeMs:null,
    timerTargetTime:null,timerInterval:null,currentTimerModeKey:'focus',customSessionLabel:'',focusSessionTaskId:null,
    TIMER_STORAGE_KEY:'zen_fortress_active_timer_v21',chimeCtx:{state:'running'},
    clearInterval(){},setInterval(){return ++serial;},
    localDateISO:()=> '2026-10-27',computeActualStreak:()=>1,syncHeaderMetrics(){},updateTimerDisplay(){},
    showToast(){},L:()=>({saveFailed:'Save failed'}),getDomainFocusMinutes:()=>25,toWest:String,renderDomainState(){},
    playRichCompletionChime(){},readNativeTimerSession:()=>null,
    saveFortressData(key,value){if(reject && reject(key,value))return false;slots.set(key,JSON.stringify(value));return true;},
    loadFortressData(key,fallback){return slots.has(key)?JSON.parse(slots.get(key)):fallback;}
  });
  vm.runInContext(quick,ctx);
  vm.runInContext(['accumulateActiveTime','storeTimerSession','persistActiveTimerSnapshot',
    'creditCompletedSession','finalizeTimerSession','runTimerTick','restoreTimerSession','selectTimerMode','toggleTimerPlay'].map(production).join('\n'),ctx);
  const run=code=>vm.runInContext(code,ctx);
  const snapshot=()=>JSON.parse(run('JSON.stringify({quickTraining,timerRunning,timerSessionId,timerLeft,currentTimerModeKey,timerActiveMs,cfg})'));
  const begin=(sets=3,rest=10,skip=true)=>{
    el('qtSets').value=String(sets);el('qtWork').value='00:20';el('qtRest').value='00:'+String(rest).padStart(2,'0');
    el('qtSkipLast').checked=skip;return run('startQuickTraining()');
  };
  const finish=()=>{now=ctx.timerTargetTime;return run('runTimerTick()');};
  return {ctx,run,snapshot,begin,finish,slots,events,reject:f=>{reject=f;},confirm:b=>{confirmation=b;},advance:ms=>{now+=ms;}};
}
test('real Work/Rest rounds count only work seconds and never duplicate a credited timer ID',()=>{
  const x=fixture();x.begin();
  for(let round=0;round<3;round++){
    assert.equal(x.snapshot().quickTraining.phase,'work');
    x.finish();
    assert.equal(x.ctx.cfg.sessions,round+1);
    if(round<2){assert.equal(x.snapshot().quickTraining.phase,'rest');x.finish();assert.equal(x.ctx.cfg.sessions,round+1);}
  }
  assert.equal(x.snapshot().quickTraining,null);
  assert.equal(x.ctx.cfg.todayMins,1);assert.equal(x.ctx.cfg.quickFocusRemainderSec,0);
  assert.equal(x.ctx.cfg.sessionHistory.length,3);
  assert.equal(new Set(x.ctx.cfg.sessionHistory.map(row=>row.id)).size,3);
  assert.equal(x.ctx.cfg.sessionHistory.reduce((n,row)=>n+row.minutes,0),1);
  const before=JSON.stringify(x.ctx.cfg);x.run('creditCompletedSession()');x.run('runTimerTick()');
  assert.equal(JSON.stringify(x.ctx.cfg),before);
});
test('optional final Rest, zero Rest, Skip and dialog Cancel follow actual app transitions without extra credit',()=>{
  for(const rest of [0,10])for(const skip of [false,true]){
    const x=fixture();x.begin(1,rest,skip);
    x.confirm(false);const before=x.snapshot();assert.equal(x.run('cancelQuickTraining()'),false);assert.deepEqual(x.snapshot(),before);
    x.finish();
    if(rest>0&&!skip){assert.equal(x.snapshot().quickTraining.phase,'rest');x.finish();}
    assert.equal(x.snapshot().quickTraining,null);assert.equal(x.ctx.cfg.sessions,1);
  }
  const x=fixture();x.begin(2);assert.equal(x.run('skipQuickTrainingStep()'),true);
  assert.equal(x.snapshot().quickTraining.phase,'rest');assert.equal(x.ctx.cfg.sessions,0);
  assert.equal(x.run('cancelQuickTraining()'),true);assert.equal(x.snapshot().quickTraining,null);assert.equal(x.ctx.cfg.sessions,0);
});
test('actual process restoration preserves a mid-Rest snapshot and credits subsequent work once',()=>{
  const x=fixture();x.begin(2);x.finish();x.advance(3000);assert.equal(x.run('toggleTimerPlay()'),true);
  const y=fixture();for(const [k,v] of x.slots)y.slots.set(k,v);y.ctx.cfg=JSON.parse(JSON.stringify(x.ctx.cfg));
  y.run('restoreTimerSession()');assert.equal(y.snapshot().quickTraining.phase,'rest');
  assert.equal(y.snapshot().timerRunning,false);assert.equal(y.snapshot().quickTraining.currentSet,0);
  assert.equal(y.run('toggleTimerPlay()'),true);y.finish();y.finish();
  assert.equal(y.ctx.cfg.sessions,2);assert.equal(y.ctx.cfg.sessionHistory.length,2);
  assert.equal(y.snapshot().quickTraining,null);
});
test('failed credit ACK retains completed Work for retry and duplicate replay cannot credit twice',()=>{
  const x=fixture();x.begin(2);x.reject(key=>key==='zen_fortress_cfg_v21');x.finish();
  assert.equal(x.ctx.cfg.sessions,0);assert.equal(x.snapshot().quickTraining.phase,'work');
  assert.equal(x.snapshot().timerRunning,false);const id=x.snapshot().timerSessionId;
  x.reject(null);assert.equal(x.run('creditCompletedSession()'),true);assert.equal(x.run('creditCompletedSession()'),true);
  assert.equal(x.ctx.cfg.sessions,1);assert.equal(x.ctx.cfg.sessionHistory[0].id,id);
});
test('failed phase replacement ACK retains original Work snapshot and never restarts its old timer',()=>{
  const x=fixture();x.begin(2);const before=x.snapshot();
  x.reject((key,v)=>key==='zen_fortress_active_timer_v21'&&v.mode==='short');x.finish();
  assert.deepEqual(x.snapshot().quickTraining,before.quickTraining);
  assert.equal(x.snapshot().timerSessionId,before.timerSessionId);
  assert.equal(x.snapshot().timerRunning,false);assert.equal(x.ctx.cfg.sessions,1);
});
test('failed Stop/completion replacement ACK retains recoverable training and emits no false success',()=>{
  for(const completed of [false,true]){
    const x=fixture();x.begin(1);const before=x.snapshot().quickTraining;
    x.reject((key,v)=>key==='zen_fortress_active_timer_v21'&&v.total===1500);
    if(completed)x.finish();else assert.equal(x.run('cancelQuickTraining()'),false);
    assert.deepEqual(x.snapshot().quickTraining,before);
    assert.equal(x.events.filter(e=>['completed','cancelled'].includes(e.detail?.kind)).length,0);
  }
});
test('rejected Pause when replacing another timer cannot overwrite its original timer or training state',()=>{
  const x=fixture();x.run('toggleTimerPlay()');const before=x.snapshot();
  x.reject((key,v)=>key==='zen_fortress_active_timer_v21'&&!v.running);
  assert.equal(x.begin(2),false);
  assert.equal(x.snapshot().quickTraining,null);assert.equal(x.snapshot().timerSessionId,before.timerSessionId);
  assert.equal(x.snapshot().timerRunning,true);assert.equal(x.snapshot().timerLeft,before.timerLeft);
});
test('rejected initial mode write preserves paused timer identity and publishes no started event',()=>{
  const x=fixture();x.run('toggleTimerPlay(); toggleTimerPlay()');const before=x.snapshot();
  x.reject((key,v)=>key==='zen_fortress_active_timer_v21'&&v.training!==null);
  assert.equal(x.begin(2),false);assert.equal(x.snapshot().quickTraining,null);
  assert.equal(x.snapshot().timerSessionId,before.timerSessionId);assert.equal(x.snapshot().timerRunning,false);
  assert.equal(x.events.filter(e=>e.detail?.kind==='started').length,0);
});
test('rejected Start after acknowledged phase selection keeps the new interval safely paused for retry',()=>{
  const x=fixture();x.begin(2);
  x.reject((key,v)=>key==='zen_fortress_active_timer_v21'&&v.mode==='short'&&v.running);x.finish();
  assert.equal(x.snapshot().quickTraining.phase,'rest');assert.equal(x.snapshot().timerRunning,false);
  assert.equal(x.ctx.cfg.sessions,1);
  x.reject(null);assert.equal(x.run('toggleTimerPlay()'),true);x.finish();x.finish();
  assert.equal(x.ctx.cfg.sessions,2);assert.equal(x.ctx.cfg.sessionHistory.length,2);
});
