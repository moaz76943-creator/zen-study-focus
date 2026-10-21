'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/assets/web/app.js'),'utf8');
const start=source.indexOf('function switchActivityDomain(dom, el) {');
const end=source.indexOf('/* Home timer shortcuts',start);
assert.ok(start!==-1&&end>start,'Activity domain switch function not found');
const definition=source.slice(start,end);

function fixture({persist='false',confirmed=true,running=true}={}){
 const events=[],messages=[],draft={active:true,phase:'work'};
 const cfg={lang:'en',domain:'study',sessionHistory:[],unknownField:{protected:true}};
 const ctx={cfg,quickTraining:draft,timerRunning:running,
  timerSessionId:null,timerLeft:1500,timerTotal:1500,
  window:{confirm:()=>confirmed},quickText:()=> 'Replace running session?',
  saveFortressData:(key,next)=>{
   events.push('persist');
   assert.equal(key,'zen_fortress_cfg_v21');
   assert.equal(next.domain,'work');
   assert.equal(next.unknownField,cfg.unknownField);
   if(persist==='throw')throw Error('NATIVE_DURABLE_ACK_FAILED');
   return persist==='true';
  },
  toggleTimerPlay(){events.push('toggle');ctx.timerRunning=false;},
  renderQuickTraining(){events.push('renderTraining');},
  renderDomainState(){events.push('renderDomain');},
  L(){return {domStudy:'Study',domSport:'Sport',domRead:'Read',domWork:'Work'};},
  getDomainFocusMinutes:()=>30,
  selectTimerMode(){events.push('selectTimer');},
  showToast:m=>messages.push(m),
  formatDurationUnit:()=> '30m',
  document:{getElementById:()=>({})}
 };
 const sandbox=vm.createContext(ctx);
 vm.runInContext(definition,sandbox,{filename:'switchActivityDomain-from-app.js'});
 return {cfg,ctx,draft,events,messages,run:()=>vm.runInContext("switchActivityDomain('work',null)",sandbox)};
}

test('07-09 domain save false leaves running quick session, domain and UI untouched',()=>{
 const f=fixture({persist:'false'});
 assert.equal(f.run(),false);
 assert.equal(f.cfg.domain,'study');
 assert.equal(f.ctx.quickTraining,f.draft);
 assert.equal(f.ctx.timerRunning,true);
 assert.deepEqual(f.events,['persist']);
 assert.ok(f.messages.some(m=>/save|حفظ/i.test(m)));
});

test('07-09 thrown native durable ACK leaves running quick session and domain untouched',()=>{
 const f=fixture({persist:'throw'});
 assert.equal(f.run(),false);
 assert.equal(f.cfg.domain,'study');
 assert.equal(f.ctx.quickTraining,f.draft);
 assert.deepEqual(f.events,['persist']);
 assert.ok(f.messages.some(m=>/save|حفظ/i.test(m)));
});

test('07-09 successful confirmed change persists before replacing active session',()=>{
 const f=fixture({persist:'true'});
 assert.equal(f.run(),true);
 assert.equal(f.cfg.domain,'work');
 assert.equal(f.ctx.quickTraining,null);
 assert.deepEqual(f.events,['persist','toggle','renderTraining','renderDomain','selectTimer']);
});

test('07-09 declined replacement causes no storage write or session mutation',()=>{
 const f=fixture({persist:'true',confirmed:false});
 assert.equal(f.run(),false);
 assert.equal(f.cfg.domain,'study');
 assert.equal(f.ctx.quickTraining,f.draft);
 assert.deepEqual(f.events,[]);
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
