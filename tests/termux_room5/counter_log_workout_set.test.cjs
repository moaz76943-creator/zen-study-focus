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

const routines=section('function logWorkoutSet() {','\nfunction startQuickSportRest(');

function harness(mode='ok') {
 const state={cfg:{lang:'en',sets:3,unknown:{legacy:'keep'}},renders:0,toasts:[],writes:0};
 const c=vm.createContext({
  cfg:state.cfg, window:{},
  document: {
      getElementById: (id) => ({
          textContent: ''
      })
  },
  saveFortressData:(key,next)=>{
   state.writes++;
   assert.equal(key,'zen_fortress_cfg_v21');
   assert.equal(c.cfg,state.cfg,'Do not publish new values before persistence ACK');
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

test('logWorkoutSet() normal operation updates counter and saves', () => {
  const h=harness();
  assert.equal(h.run('logWorkoutSet()'),true);
  assert.equal(h.c.cfg.sets,4);
  assert.equal(h.c.cfg.unknown.legacy,'keep');
  assert.equal(h.state.renders,1);
  assert.equal(h.state.toasts.length,1);
  assert.ok(h.state.toasts[0].includes('4/4'));
  assert.equal(h.state.writes,1);
});

test('logWorkoutSet() rolls over after 12 sets', () => {
  const h=harness();
  h.c.cfg.sets = 12;
  assert.equal(h.run('logWorkoutSet()'),true);
  assert.equal(h.c.cfg.sets,1);
  assert.equal(h.state.writes,1);
});

for(const value of ['-1','Infinity','1.5']){
  test('logWorkoutSet rejects invalid value '+value+' without storage or UI side effects',()=>{
    const h=harness();
    h.run(`cfg.sets=${value}`);
    const old=JSON.stringify(h.c.cfg);
    assert.equal(h.run('logWorkoutSet()'),false);
    assert.equal(JSON.stringify(h.c.cfg),old);
    assert.equal(h.state.writes,0);
    assert.equal(h.state.renders,0);
    assert.equal(h.state.toasts.length,0);
  });
}

test('logWorkoutSet() treats missing previous value as 0', () => {
  const h=harness();
  delete h.c.cfg.sets;
  assert.equal(h.run('logWorkoutSet()'),true);
  assert.equal(h.c.cfg.sets,1);
  assert.equal(h.state.writes,1);
});

test('logWorkoutSet() handles unacknowledged save properly', () => {
  const h=harness('false');
  const old=JSON.stringify(h.c.cfg);
  assert.equal(h.run('logWorkoutSet()'),false);
  assert.equal(JSON.stringify(h.c.cfg),old);
  assert.equal(h.state.writes,1);
  assert.equal(h.state.renders,0);
  assert.equal(h.state.toasts[0], 'Save failed');
});

test('logWorkoutSet() handles throwing save properly', () => {
  const h=harness('throw');
  const old=JSON.stringify(h.c.cfg);
  assert.equal(h.run('logWorkoutSet()'),false);
  assert.equal(JSON.stringify(h.c.cfg),old);
  assert.equal(h.state.writes,1);
  assert.equal(h.state.renders,0);
  assert.equal(h.state.toasts[0], 'Save failed');
});
