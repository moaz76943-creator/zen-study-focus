'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../../android/app/src/main/assets/web/app.js'),'utf8');
function section(start,end) {
 const a=source.indexOf(start),b=source.indexOf(end,a);
 assert.ok(a>=0&&b>a,'Existing v21 function boundaries remain intact');
 return source.slice(a,b);
}
const routines=section('function logWorkoutSet() {','\nfunction startQuickSportRest(')+
 '\n'+section('function addReadPages(p) {','\nconst TAB_GRADS =');
function harness(mode='ok') {
 const state={cfg:{lang:'en',sets:3,pagesRead:8,unknown:{legacy:'keep'}},renders:0,toasts:[],writes:0};
 const c=vm.createContext({
  cfg:state.cfg, window:{},
  saveFortressData:(key,next)=>{
   state.writes++;
   assert.equal(key,'zen_fortress_cfg_v21');
   assert.equal(c.cfg,state.cfg,'Do not publish new values before persistence ACK');
   assert.equal(state.cfg.sets,3,'Workout counter unchanged before ACK');
   assert.equal(state.cfg.pagesRead,8,'Reading counter unchanged before ACK');
   if(mode==='throw')throw Error('QuotaExceededError');
   return mode!=='false';
  },
  L:()=>({domSport:'Sport',domRead:'Read',saveFailed:'Save failed'}),
  syncHeaderMetrics:()=>{state.renders++;},
  showToast:text=>{state.toasts.push(text);},
  toWest:text=>text
 });
 vm.runInContext(routines,c);
 return {c,state,run:expr=>vm.runInContext(expr,c)};
}
for(const operation of ['logWorkoutSet()','addReadPages(2)'])for(const mode of ['throw','false']){
 test(operation+' '+mode+' must not change live v21 counters or show success',()=>{
  const h=harness(mode),old=JSON.stringify(h.c.cfg);
  assert.equal(h.run(operation),false);
  assert.equal(JSON.stringify(h.c.cfg),old);
  assert.equal(h.state.renders,0);
  assert.deepEqual(h.state.toasts,['Save failed']);
 });
}
for(const [operation,field,value] of [['logWorkoutSet()','sets',4],['addReadPages(2)','pagesRead',10]]){
 test(operation+' commits only after acknowledged write',()=>{
  const h=harness();
  assert.equal(h.run(operation),true);
  assert.equal(h.c.cfg[field],value);
  assert.equal(h.c.cfg.unknown.legacy,'keep');
  assert.equal(h.state.renders,1);
  assert.equal(h.state.toasts.length,1);
  assert.notEqual(h.state.toasts[0],'Save failed');
  assert.equal(h.state.writes,1);
 });
}
for(const value of ['-1','0','NaN','Infinity','1.5','Number.MAX_SAFE_INTEGER']){
 test('addReadPages rejects invalid delta '+value+' without storage or UI side effects',()=>{
  const h=harness(),old=JSON.stringify(h.c.cfg);
  assert.equal(h.run('addReadPages('+value+')'),false);
  assert.equal(JSON.stringify(h.c.cfg),old);
  assert.equal(h.state.writes,0);
  assert.equal(h.state.renders,0);
  assert.equal(h.state.toasts.length,0);
 });
}
