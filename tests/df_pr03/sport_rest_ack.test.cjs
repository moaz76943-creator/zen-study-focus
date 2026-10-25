'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const app=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/assets/web/app.js'),'utf8');
const a=app.indexOf('function startQuickSportRest('),b=app.indexOf('\nfunction addReadPages(',a);
assert.ok(a>=0&&b>a,'Production sport-rest function boundary must be present');
const actual=app.slice(a,b);
function fixture({running=true,training=true,consent=true,write='true'}={}){
  const events=[],writes=[],toasts=[];
  const button={innerHTML:'original'},title={textContent:'Old focus'};
  const context={
    TIMER_STORAGE_KEY:'zen_fortress_active_timer_v21',
    quickTraining: training?{active:true,phase:'work'}:null,
    timerRunning:running,timerInterval:77,timerTotal:1500,timerLeft:1200,
    timerTargetTime:3000000,timerSessionId:'original-id',focusSessionTaskId:42,
    timerActiveMs:18000,timerResumeMs:12345,currentTimerModeKey:'focus',
    customSessionLabel:'Original title',
    Date:{now:()=>2000000},Math,Number,
    window:{confirm:()=>{events.push('confirm');return consent;},
      ZenNative:{startBackgroundService:(seconds,label)=>events.push(['native-start',seconds,label])}},
    document:{getElementById:id=>id==='mainPlayBtn'?button:title},
    saveFortressData:(key,value)=>{
      events.push('save');writes.push([key,JSON.parse(JSON.stringify(value))]);
      if(write==='throw')throw Error('NATIVE_ACK_REFUSED');
      return write==='true';
    },
    clearInterval:()=>events.push('clear'),setInterval:()=>{events.push('interval-start');return 99;},
    runTimerTick(){},toggleTimerPlay(){events.push('toggle');context.timerRunning=!context.timerRunning;},
    storeTimerSession(){events.push('unchecked-save');},renderQuickTraining(){events.push('render')},
    updateTimerDisplay(){events.push('display');},showToast:text=>toasts.push(String(text)),
    quickText:()=> 'Replacing the running timer discards progress. Continue?',
    toWest:x=>String(x),L:()=>({saveFailed:'Save failed'}),cfg:{lang:'en'}
  };
  vm.createContext(context);vm.runInContext(actual,context);
  const state=()=>JSON.stringify({
    timerTotal:context.timerTotal,timerLeft:context.timerLeft,timerRunning:context.timerRunning,
    target:context.timerTargetTime,mode:context.currentTimerModeKey,
    id:context.timerSessionId,taskId:context.focusSessionTaskId,
    activeMs:context.timerActiveMs,resumeMs:context.timerResumeMs,
    training:context.quickTraining,label:context.customSessionLabel
  });
  return {context,state,events,writes,toasts,button};
}
test('sport rest Cancel preserves training, focus ID and zero writes',()=>{
 const f=fixture({consent:false});const before=f.state();
 assert.equal(f.context.startQuickSportRest(45),false);
 assert.equal(f.state(),before);assert.deepEqual(f.writes,[]);
 assert.deepEqual(f.events,['confirm']);
});
for(const mode of ['false','throw']){
 test('failed durable rest snapshot leaves running session and native work untouched: '+mode,()=>{
  const f=fixture({write:mode});const before=f.state();
  assert.equal(f.context.startQuickSportRest(45),false);
  assert.equal(f.state(),before);
  assert.equal(f.events.filter(x=>x==='save').length,1);
  assert.ok(!f.events.includes('clear'));
  assert.ok(!f.events.includes('interval-start'));
  assert.ok(f.toasts.length>0,'Refusal must be shown to the user');
 });
}
test('accepted sport rest commits exactly one new paused-safe snapshot before work',()=>{
 const f=fixture();assert.equal(f.context.startQuickSportRest(45),true);
 assert.equal(f.writes.length,1,'No intermediate Pause/Reset writes');
 const [key,data]=f.writes[0];assert.equal(key,'zen_fortress_active_timer_v21');
 assert.equal(data.mode,'short');assert.equal(data.total,45);assert.equal(data.left,45);
 assert.equal(data.running,true);assert.equal(data.taskId,null);assert.equal(data.training,null);
 assert.notEqual(data.sessionId,'original-id');assert.ok(data.sessionId);
 assert.equal(f.context.timerRunning,true);assert.equal(f.context.timerSessionId,data.sessionId);
 assert.equal(f.context.quickTraining,null);assert.equal(f.context.timerActiveMs,0);
 assert.equal(f.events.filter(x=>Array.isArray(x)&&x[0]==='native-start').length,1);
 assert.equal(f.events.filter(x=>x==='interval-start').length,1);
 assert.ok(f.events.indexOf('save')<f.events.indexOf('clear'),'Durable ACK must precede interruption');
});
test('invalid sport rest seconds are non-destructive',()=>{
 const f=fixture();const before=f.state();
 assert.equal(f.context.startQuickSportRest(NaN),false);
 assert.equal(f.state(),before);assert.equal(f.writes.length,0);
});
