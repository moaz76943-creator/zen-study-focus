'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const app=fs.readFileSync(require('node:path').join(__dirname,'../../android/app/src/main/assets/web/app.js'),'utf8');
const section=(a,b)=>app.slice(app.indexOf(a),app.indexOf(b,app.indexOf(a)));
function fixture(failure){
 const stored=new Map(),events=[];
 const ctx={timerRunning:false,timerInterval:null,timerTotal:1500,timerLeft:900,
  currentTimerModeKey:'focus',customSessionLabel:'',timerSessionId:'paused-original',
  timerActiveMs:600000,timerResumeMs:null,focusSessionTaskId:17,
  quickTraining:null,quickInternalChange:false,TIMER_STORAGE_KEY:'zen_fortress_active_timer_v21',
  window:{confirm:()=>true,ZenNative:failure==='native'?{acknowledgeActiveTimerSnapshot:()=>false}:undefined},
  localStorage:{getItem:k=>stored.get(k)??null,setItem:(k,v)=>stored.set(k,v),removeItem:k=>stored.delete(k)},
  saveFortressData:(k,v)=>{if(failure==='throw')throw Error('quota');if(failure==='false')return false;stored.set(k,JSON.stringify(v));stored.set(k+'_mirror',JSON.stringify(v));return true;},
  updateTimerDisplay:()=>events.push('render'),renderQuickTraining:()=>events.push('training-render'),
  showToast:()=>events.push('save-failed'),L:()=>({saveFailed:'Save failed'}),quickText:()=> 'Confirm',
  toggleTimerPlay:()=>{throw Error('Paused mode switch must not call Play');}};
 vm.createContext(ctx);
 vm.runInContext(section('function storeTimerSession()', 'function readNativeTimerSession()')+'\n'+section('function selectTimerMode(mins, modeKey, btn)', 'function openCustomTimerModal()'),ctx);
 return {ctx,stored,events};
}
for(const failure of ['false','throw','native'])test('paused mode choice remains unchanged after rejected '+failure+' ACK',()=>{
 const {ctx,events}=fixture(failure);
 assert.equal(ctx.selectTimerMode(5,'short',null),false);
 assert.equal(ctx.currentTimerModeKey,'focus');assert.equal(ctx.timerTotal,1500);assert.equal(ctx.timerLeft,900);
 assert.equal(ctx.timerSessionId,'paused-original');assert.equal(ctx.timerActiveMs,600000);
 assert.ok(!events.includes('render'));
});
test('accepted mode is published after the exact idle snapshot ACK',()=>{
 const {ctx,stored,events}=fixture();
 assert.equal(ctx.selectTimerMode(5,'short',null),true);
 assert.equal(ctx.currentTimerModeKey,'short');assert.equal(ctx.timerLeft,300);assert.equal(ctx.timerSessionId,null);
 const snapshot=JSON.parse(stored.get(ctx.TIMER_STORAGE_KEY));
 assert.equal(snapshot.mode,'short');assert.equal(snapshot.left,300);assert.equal(snapshot.sessionId,null);assert.equal(snapshot.running,false);
 assert.deepEqual(events,['render']);
});
