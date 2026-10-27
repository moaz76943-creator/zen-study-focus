'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const app=fs.readFileSync(require('node:path').join(__dirname,'../../android/app/src/main/assets/web/app.js'),'utf8');
const section=(a,b)=>app.slice(app.indexOf(a),app.indexOf(b,app.indexOf(a)));
function fixture(failure,{consent=true}={}) {
 const key='zen_fortress_active_timer_v21',old='original-paused-packet';
 const stored=new Map([[key,old],[key+'_mirror',old]]),events=[];
 const ctx={timerRunning:false,timerTotal:1500,timerLeft:900,
  currentTimerModeKey:'focus',customSessionLabel:'Original label',timerSessionId:'paused-original',
  timerActiveMs:600000,timerResumeMs:null,focusSessionTaskId:17,quickTraining:null,
  TIMER_STORAGE_KEY:key,cfg:{lang:'en'},
  window:{confirm:()=>consent,ZenNative:failure==='native'?{acknowledgeActiveTimerSnapshot:()=>false}:undefined},
  localStorage:{getItem:k=>stored.get(k)??null,setItem:(k,v)=>stored.set(k,v),removeItem:k=>stored.delete(k)},
  saveFortressData:(k,v)=>{events.push('write');if(failure==='throw')throw Error('quota');if(failure==='false')return false;stored.set(k,JSON.stringify(v));stored.set(k+'_mirror',JSON.stringify(v));return true;},
  updateTimerDisplay:()=>events.push('render'),showToast:()=>events.push('save-failed'),L:()=>({saveFailed:'Save failed'}),
  toggleTimerPlay:()=>{throw Error('Paused reset must not call Play');}};
 vm.createContext(ctx);
 vm.runInContext(section('function storeTimerSession()', 'function readNativeTimerSession()')+'\n'+section('function resetTimerNow()', 'function skipTimerPhase()'),ctx);
 return {ctx,stored,events,key,old};
}
for(const failure of ['false','throw','native'])test('paused Reset retains progress after rejected '+failure+' ACK',()=>{
 const {ctx,stored,events,key,old}=fixture(failure);
 assert.equal(ctx.resetTimerNow(),false);
 assert.equal(ctx.timerSessionId,'paused-original');assert.equal(ctx.focusSessionTaskId,17);
 assert.equal(ctx.timerActiveMs,600000);assert.equal(ctx.timerLeft,900);assert.equal(ctx.timerTotal,1500);
 assert.equal(ctx.timerRunning,false);assert.equal(ctx.customSessionLabel,'Original label');
 assert.equal(stored.get(key),old);assert.equal(stored.get(key+'_mirror'),old);
 assert.ok(!events.includes('render'));
});
test('Reset Cancel preserves paused progress without attempting storage',()=>{
 const {ctx,events}=fixture(undefined,{consent:false});
 assert.equal(ctx.resetTimerNow(),false);assert.equal(ctx.timerSessionId,'paused-original');
 assert.equal(ctx.timerActiveMs,600000);assert.equal(ctx.timerLeft,900);assert.deepEqual(events,[]);
});
test('accepted Reset publishes only the acknowledged idle snapshot',()=>{
 const {ctx,stored,events,key}=fixture();
 assert.equal(ctx.resetTimerNow(),true);
 assert.equal(ctx.timerSessionId,null);assert.equal(ctx.focusSessionTaskId,null);
 assert.equal(ctx.timerActiveMs,0);assert.equal(ctx.timerLeft,1500);assert.equal(ctx.timerRunning,false);
 const snapshot=JSON.parse(stored.get(key));
 assert.equal(snapshot.mode,'focus');assert.equal(snapshot.label,'Original label');
 assert.equal(snapshot.left,1500);assert.equal(snapshot.sessionId,null);assert.equal(snapshot.taskId,null);
 assert.equal(snapshot.running,false);assert.equal(snapshot.activeMs,0);assert.equal(snapshot.training,null);
 assert.deepEqual(events,['write','render']);
});
