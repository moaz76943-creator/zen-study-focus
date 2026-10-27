'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const app=fs.readFileSync(require('node:path').join(__dirname,'../../android/app/src/main/assets/web/app.js'),'utf8');
const section=(a,b)=>app.slice(app.indexOf(a),app.indexOf(b,app.indexOf(a)));
function fixture(failure,{running=true}={}) {
 const key='zen_fortress_active_timer_v21',old='original-packet';
 const stored=new Map([[key,old],[key+'_mirror',old]]),events=[];
 const ctx={timerRunning:running,timerTotal:120,timerLeft:100,timerTargetTime:101000,
  currentTimerModeKey:'custom',customSessionLabel:'My session',timerSessionId:'original-id',
  timerActiveMs:60000,timerResumeMs:running?1000:null,focusSessionTaskId:17,
  quickTraining:{active:true,domain:'sport',phase:'work',currentSet:1},TIMER_STORAGE_KEY:key,
  Date:{now:()=>1000},
  window:{ZenNative:{
   acknowledgeActiveTimerSnapshot:raw=>{events.push('native-ack');return failure!=='native';},
   startBackgroundService:(seconds,title)=>events.push(['alarm',seconds,title])}},
  document:{getElementById:id=>{assert.equal(id,'timerModeCaption');return {textContent:'My session'};}},
  localStorage:{getItem:k=>stored.get(k)??null,setItem:(k,v)=>stored.set(k,v),removeItem:k=>stored.delete(k)},
  saveFortressData:(k,v)=>{events.push('write');if(failure==='throw')throw Error('quota');if(failure==='false')return false;stored.set(k,JSON.stringify(v));stored.set(k+'_mirror',JSON.stringify(v));return true;},
  updateTimerDisplay:()=>events.push('render'),showToast:()=>events.push('save-failed'),L:()=>({saveFailed:'Save failed'})};
 vm.createContext(ctx);
 vm.runInContext(section('function storeTimerSession()', 'function readNativeTimerSession()')+'\n'+section('function changeTimerDelta(', 'function toggleTimerPlay()'),ctx);
 return {ctx,stored,events,key,old};
}
for(const running of [true,false])for(const failure of ['false','throw','native'])test((running?'running':'paused')+' time adjustment retains session after rejected '+failure+' ACK',()=>{
 const {ctx,stored,events,key,old}=fixture(failure,{running});
 const result=ctx.changeTimerDelta(1);
 assert.equal(ctx.timerLeft,100);assert.equal(ctx.timerTotal,120);assert.equal(ctx.timerTargetTime,101000);
 assert.equal(ctx.timerRunning,running);assert.equal(ctx.timerSessionId,'original-id');
 assert.equal(ctx.focusSessionTaskId,17);assert.equal(ctx.timerActiveMs,60000);
 assert.equal(ctx.timerResumeMs,running?1000:null);
 assert.equal(stored.get(key),old);assert.equal(stored.get(key+'_mirror'),old);
 assert.ok(!events.includes('render'));assert.ok(!events.some(e=>Array.isArray(e)&&e[0]==='alarm'));
 assert.equal(result,false);
});
test('running adjustment acknowledges the complete replacement before changing the alarm',()=>{
 const {ctx,stored,events,key}=fixture();
 assert.equal(ctx.changeTimerDelta(1),true);
 assert.equal(ctx.timerLeft,160);assert.equal(ctx.timerTotal,160);assert.equal(ctx.timerTargetTime,161000);
 const snapshot=JSON.parse(stored.get(key));
 assert.equal(snapshot.left,160);assert.equal(snapshot.total,160);assert.equal(snapshot.endAt,161000);
 assert.equal(snapshot.running,true);assert.equal(snapshot.sessionId,'original-id');assert.equal(snapshot.taskId,17);
 assert.equal(snapshot.activeMs,60000);assert.equal(snapshot.resumedAt,1000);
 assert.deepEqual(snapshot.training,{active:true,domain:'sport',phase:'work',currentSet:1});
 assert.equal(snapshot.mode,'custom');assert.equal(snapshot.label,'My session');
 assert.deepEqual(events,['write','native-ack',['alarm',160,'My session'],'render']);
});
test('paused reduction keeps the ten-second minimum, total and active-time accounting',()=>{
 const {ctx,stored,events,key}=fixture(undefined,{running:false});
 assert.equal(ctx.changeTimerDelta(-5),true);
 assert.equal(ctx.timerLeft,10);assert.equal(ctx.timerTotal,120);
 const snapshot=JSON.parse(stored.get(key));
 assert.equal(snapshot.left,10);assert.equal(snapshot.total,120);assert.equal(snapshot.running,false);
 assert.equal(snapshot.endAt,null);assert.equal(snapshot.resumedAt,null);assert.equal(snapshot.activeMs,60000);
 assert.deepEqual(events,['write','native-ack','render']);
});
