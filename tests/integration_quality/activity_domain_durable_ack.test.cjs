'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/assets/web/app.js'),'utf8');
// Use the real cross-key transition, not a stubbed mode selector that hides partial saves.
const {fixture}=require('../integration_recovery/activity_transition_fixture.cjs');
for(const kind of ['false','throw'])test('07-09 rejected cfg '+kind+' retains session and exact packets',()=>{
 const h=fixture(),before=h.state(),packets=new Map(h.slots);h.reject('cfg_v21',kind);
 assert.equal(h.call("switchActivityDomain('work',null)"),false);
 assert.deepEqual(h.state(),before);assert.deepEqual(h.slots,packets);
 assert.ok(h.events.every(e=>Array.isArray(e)&&e[0]==='save'));
 assert.ok(h.messages.some(m=>/save/i.test(m)));
});
test('07-09 successful domain change saves timer and cfg before native/UI publication',()=>{
 const h=fixture();assert.equal(h.call("switchActivityDomain('work',null)"),true);
 assert.equal(h.c.cfg.domain,'work');assert.equal(h.c.quickTraining,null);
 assert.deepEqual(h.events.slice(0,2),[['save','zen_fortress_active_timer_v21'],['save','zen_fortress_cfg_v21']]);
 assert.ok(h.events.indexOf('native-stop')>1);assert.ok(h.events.indexOf('domain')>1);
});
test('07-09 declined replacement leaves all state and packets unchanged',()=>{
 const h=fixture(),before=h.state(),packets=new Map(h.slots);h.c.window.confirm=()=>false;
 assert.equal(h.call("switchActivityDomain('work',null)"),false);
 assert.deepEqual(h.state(),before);assert.deepEqual(h.slots,packets);assert.deepEqual(h.events,[]);
});

// CROSS-001: execute the real water action and v21 writer, including rollback.
const writerStart=source.indexOf('const SECRET_SALT =');
const writerEnd=source.indexOf('function loadFortressData(',writerStart);
const waterStart=source.indexOf('function addWaterCup()');
const waterEnd=source.indexOf('function toggleDeskClock(',waterStart);
assert.ok(writerStart>=0&&writerEnd>writerStart&&waterStart>=0&&waterEnd>waterStart);
function waterFixture(failure){
 const cfg={lang:'ar',water:8,sessions:4,sessionHistory:[{id:'legacy',minutes:7}],unknown:{text:'نصي ۱۲'}};
 const old=JSON.stringify(cfg),slots=new Map(),messages=[],renders=[];
 const key='zen_fortress_cfg_v21';
 let armed=false,failed=false,allowAck=failure!=='ack';
 const ctx={cfg,Date,localStorage:{
  getItem(k){return slots.get(k)??null;},
  setItem(k,v){
   if(armed&&failure==='mirror'&&k===key+'_mirror'&&!failed){failed=true;throw Error('QuotaExceededError');}
   if(armed&&failure==='readback'&&k===key&&!failed){failed=true;slots.set(k,'mismatched');return;}
   slots.set(k,v);
  },removeItem(k){slots.delete(k);}
 },window:{ZenNative:{},DF22Preflight:{nativeAcknowledge:()=>allowAck}},
 L:()=>({saveFailed:'تعذر الحفظ'}),showToast:m=>messages.push(m),
 syncHeaderMetrics:()=>renders.push(cfg.water)};
 const sandbox=vm.createContext(ctx);
 vm.runInContext(source.slice(writerStart,writerEnd)+source.slice(waterStart,waterEnd),sandbox);
 // Seed both copies through the genuine writer before injecting failures.
 const native=ctx.window.ZenNative;delete ctx.window.ZenNative;
 vm.runInContext("saveFortressData('zen_fortress_cfg_v21',cfg)",sandbox);
 ctx.window.ZenNative=native;failed=false;armed=true;
 const before=new Map(slots);
 if(failure==='false')sandbox.saveFortressData=()=>false;
 return {cfg,old,slots,before,messages,renders,
  run:()=>vm.runInContext('addWaterCup()',sandbox),
  retry(){allowAck=true;return vm.runInContext('addWaterCup()',sandbox);}};
}
for(const failure of ['ack','mirror','readback','false'])test('CROSS-001 water '+failure+' failure preserves memory, packets and visible count',()=>{
 const f=waterFixture(failure);
 assert.equal(f.run(),false);
 assert.equal(JSON.stringify(f.cfg),f.old);
 assert.deepEqual(f.slots,f.before);
 assert.deepEqual(f.renders,[]);
 assert.deepEqual(f.messages,['تعذر الحفظ']);
});
test('CROSS-001 water retry after rejected ACK increments once and preserves legacy fields',()=>{
 const f=waterFixture('ack');
 assert.equal(f.run(),false);
 assert.equal(f.retry(),true);
 assert.equal(f.cfg.water,0);
 assert.deepEqual(f.renders,[0]);
 const key='zen_fortress_cfg_v21';
 assert.equal(f.slots.get(key),f.slots.get(key+'_mirror'));
 assert.deepEqual(JSON.parse(JSON.parse(f.slots.get(key)).payload),{...JSON.parse(f.old),water:0});
});
