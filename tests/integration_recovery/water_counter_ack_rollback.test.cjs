'use strict';
// P0 DATA regression: the hydration counter shares the v21 cfg family with
// todayMins/sessions/streak. Like logWorkoutSet()/addReadPages(), publishing
// cfg.water or refreshing the header before a verified durable write
// acknowledgement silently diverges memory from storage on failed writes.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../../android/app/src/main/assets/web/app.js'),'utf8');
function section(start,end) {
  const a=source.indexOf(start),b=source.indexOf(end,a);
  assert.ok(a>=0&&b>a,'Existing v21 function boundaries remain intact');
  return source.slice(a,b);
}
const routine=section('function addWaterCup() {','\nfunction toggleDeskClock(');
function harness(mode='ok',initialWater=2) {
  const state={cfg:{lang:'en',water:initialWater,unknown:{legacy:'keep'}},renders:0,toasts:[],writes:0,acked:null};
  if(initialWater==='missing')delete state.cfg.water;
  const c=vm.createContext({
    cfg:state.cfg, window:{},
    saveFortressData:(key,next)=>{
      state.writes++;
      assert.equal(key,'zen_fortress_cfg_v21','Water counter lives in the existing cfg v21 family');
      assert.equal(c.cfg,state.cfg,'Do not publish new values before persistence ACK');
      assert.equal(state.cfg.water,initialWater==='missing'?undefined:initialWater,'Water counter unchanged before ACK');
      if(mode==='throw')throw Error('QuotaExceededError');
      const ok=mode!=='false';
      if(ok)state.acked=next;
      return ok;
    },
    L:()=>({saveFailed:'Save failed'}),
    syncHeaderMetrics:()=>{state.renders++;},
    showToast:text=>{state.toasts.push(text);},
    toWest:text=>text
  });
  vm.runInContext(routine,c);
  return {c,state,run:expr=>vm.runInContext(expr,c)};
}
for(const mode of ['throw','false']){
  test('failed durable water write ('+mode+') leaves live v21 counters/render unchanged and reports retry',()=>{
    const h=harness(mode);
    const old=JSON.stringify(h.c.cfg);
    assert.equal(h.run('addWaterCup()'),false);
    assert.equal(JSON.stringify(h.c.cfg),old,'Unknown legacy fields and water counter must stay untouched');
    assert.equal(h.state.renders,0,'Header must not claim unacknowledged hydration');
    assert.deepEqual(h.state.toasts,['Save failed']);
    assert.equal(h.state.writes,1);
  });
}
test('water cup commits exactly once after acknowledgement, wrapping 8 back to 0 and preserving unknown fields',()=>{
  const h=harness('ok',8);
  assert.equal(h.run('addWaterCup()'),true);
  assert.equal(h.c.cfg.water,0);
  assert.equal(h.c.cfg.unknown.legacy,'keep');
  assert.equal(h.state.renders,1);
  assert.equal(h.state.writes,1);
  assert.equal(h.c.cfg,h.state.acked,'Publish reuses the exact acknowledged packet object');
});
test('legacy cfg without a water counter resolves to 1 instead of serializing NaN',()=>{
  const h=harness('ok','missing');
  assert.equal(h.run('addWaterCup()'),true);
  assert.equal(h.c.cfg.water,1);
  assert.equal(h.state.writes,1);
  assert.equal(h.state.renders,1);
});
