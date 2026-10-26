'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../../android/app/src/main/assets/web/app.js'),'utf8');
function extract(a,b){
 const start=source.indexOf(a),stop=source.indexOf(b,start);
 assert.ok(start>=0&&stop>start,'Timer function boundary missing');
 return source.slice(start,stop);
}
const credit=extract('function creditCompletedSession() {','\nfunction finalizeTimerSession(');
const finalize=extract('function finalizeTimerSession(','\nfunction runTimerTick(');
function state(mode='ok',integrated=false,training=null) {
 const info={writes:0,events:0,renders:0,toasts:[],chimes:0,advances:0,modes:0,storeTimer:0};
 const original={lang:'en',sessions:2,todayMins:7,quickFocusRemainderSec:40,
  completedTimerIds:[],sessionHistory:[],focusCycleCount:2,roundsPerCycle:4,unknown:{keep:'legacy'}};
 const cfg=structuredClone(original);
 const c=vm.createContext({
  cfg,currentTimerModeKey:'focus',timerSessionId:'session-native-1',focusSessionTaskId:null,
  tasksList:[],timerActiveMs:training?25000:60500,quickTraining:training,
  localDateISO:()=> '2026-10-26',computeActualStreak:()=>3,
  window:{},showToast:x=>info.toasts.push(x),L:()=>({saveFailed:'Save failed'}),
  saveFortressData:(key,after)=>{
   info.writes++;assert.equal(key,'zen_fortress_cfg_v21');
   assert.equal(c.cfg.sessions,2,'Counter must not advance before ACK');
   assert.equal(c.cfg.todayMins,7,'Minutes must not advance before ACK');
   assert.equal(c.cfg.sessionHistory.length,0,'No phantom history before ACK');
   if(mode==='throw')throw Error('Native ACK failed');
   return mode!=='false';
  },
  syncHeaderMetrics:()=>{info.renders++;},
  document:{dispatchEvent:()=>{info.events++;},getElementById:()=>({innerHTML:'',textContent:'Focus'})},
  CustomEvent:class {constructor(){}},
  clearInterval:()=>{},accumulateActiveTime:()=>{},setInterval:()=>1,
  updateTimerDisplay:()=>{},storeTimerSession:()=>{info.storeTimer++;return true;},
  advanceQuickTrainingStep:()=>{info.advances++;},
  playRichCompletionChime:()=>{info.chimes++;},
  selectTimerMode:()=>{info.modes++;},getDomainFocusMinutes:()=>25
 });
 if(integrated)c.window.DF22Integration={
  getSnapshot:()=>({cfg:c.cfg,tasksList:[],notesList:[]}),
  write(before,after){
   info.writes++;
   assert.equal(before.cfg.sessions,2);
   assert.equal(c.cfg.sessions,2);
   if(mode==='throw')throw Error('Native ACK failed');
   if(mode==='false')return false;
   c.cfg=after.cfg;return true;
  },
  onSessionRecorded:()=>{}
 };
 vm.runInContext(credit+'\n'+finalize,c);
 return {c,original,info,call:expression=>vm.runInContext(expression,c)};
}
for(const integrated of [false,true])for(const mode of ['throw','false']){
 test('P0 session credit '+mode+' keeps counters/history/remainder unchanged (journal='+integrated+')',()=>{
  const h=state(mode,integrated,{active:true});
  const before=JSON.stringify(h.c.cfg);
  assert.equal(h.call('creditCompletedSession()'),false);
  assert.equal(JSON.stringify(h.c.cfg),before);
  assert.equal(h.info.events,0);assert.equal(h.info.renders,0);
  assert.equal(h.info.toasts.length,1);
 });
}
for(const integrated of [false,true]){
 test('P0 success credits exact real minutes once after ACK (journal='+integrated+')',()=>{
  const h=state('ok',integrated);
  assert.equal(h.call('creditCompletedSession()'),true);
  assert.equal(h.c.cfg.todayMins,8);assert.equal(h.c.cfg.sessions,3);
  assert.equal(h.c.cfg.sessionHistory.length,1);
  assert.equal(h.c.cfg.sessionHistory[0].minutes,1);
  assert.equal(h.c.cfg.completedTimerIds[0],'session-native-1');
  assert.equal(h.c.cfg.unknown.keep,'legacy');
  assert.equal(h.info.events,1);assert.equal(h.info.renders,1);
  assert.equal(h.call('creditCompletedSession()'),true);
  assert.equal(h.info.writes,1);
  assert.equal(h.c.cfg.sessionHistory.length,1);
 });
}
test('P0 short training round earns one minute only when remainder reaches 60 seconds',()=>{
 const h=state('ok',false,{active:true});
 assert.equal(h.call('creditCompletedSession()'),true);
 assert.equal(h.c.cfg.todayMins,8);
 assert.equal(h.c.cfg.quickFocusRemainderSec,5);
});
test('P0 failed completion retains session id and prevents rest/chime/advance',()=>{
 const h=state('false',false,{active:true});
 h.c.timerInterval=10;h.c.timerRunning=true;h.c.timerLeft=1;
 assert.equal(h.call('finalizeTimerSession(true)'),false);
 assert.equal(h.c.timerSessionId,'session-native-1');
 assert.equal(h.c.cfg.sessions,2);
 assert.equal(h.info.chimes,0);assert.equal(h.info.advances,0);
 assert.equal(h.info.modes,0);assert.equal(h.info.storeTimer,0);
});
