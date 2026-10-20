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
