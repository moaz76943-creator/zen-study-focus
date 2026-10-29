'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/assets/web/app.js'),'utf8');
const start=source.indexOf('function switchActivityDomain(dom, el) {');
const end=source.indexOf('/* Home timer shortcuts',start);
assert.ok(start>=0 && end>start,'Cannot locate production domain switch');
const functionSource=source.slice(start,end);
function fixture({ack='false',accepted=true,quick=true}={}){
  const events=[], notices=[], training={active:true,phase:'work'};
  const cfg={lang:'en',domain:'study',unknownV21:{preserve:1}};
  const context={cfg,quickTraining:quick?training:null,timerRunning:true,
    timerSessionId:'session-1',timerLeft:400,timerTotal:1500,
    window:{confirm(){events.push('confirm');return accepted;}},
    quickText:()=> 'Replace?', toWest:x=>String(x),
    saveFortressData(key,next){
      events.push('ack');
      assert.equal(key,'zen_fortress_cfg_v21');
      assert.equal(next.domain,'work');
      assert.equal(next.unknownV21,cfg.unknownV21);
      if(ack==='throw')throw Error('NATIVE_ACK_FAILED');
      return ack==='true';
    },
    toggleTimerPlay(){events.push('toggle');context.timerRunning=false;},
    renderQuickTraining(){events.push('renderTraining');},
    renderDomainState(){events.push('renderDomain');},
    L(){return {domStudy:'Study',domSport:'Sport',domRead:'Reading',domWork:'Work'};},
    getDomainFocusMinutes:()=>30,
    selectTimerMode(){events.push('mode');return true;},
    showToast:t=>notices.push(String(t)),document:{getElementById:()=>({})}
  };
  const ctx=vm.createContext(context);
  vm.runInContext(functionSource,ctx,{filename:'app.js:switchActivityDomain'});
  return {cfg,context,training,events,notices,
    run:()=>vm.runInContext("switchActivityDomain('work',null)",ctx)};
}
test('PR80 rejected native ACK leaves original activity and live session unchanged',()=>{
  const f=fixture();
  assert.equal(f.run(),false);
  assert.equal(f.cfg.domain,'study');
  assert.equal(f.context.quickTraining,f.training);
  assert.equal(f.context.timerRunning,true);
  assert.deepEqual(f.events,['confirm','ack']);
  assert.ok(f.notices.some(t=>/save|حفظ/i.test(t)));
});
test('PR80 throwing native ACK cannot cancel live quick training',()=>{
  const f=fixture({ack:'throw'});
  assert.equal(f.run(),false);
  assert.equal(f.cfg.domain,'study');
  assert.equal(f.context.quickTraining,f.training);
  assert.deepEqual(f.events,['confirm','ack']);
});
test('PR80 confirmed successful ACK precedes changes to activity and training',()=>{
  const f=fixture({ack:'true'});
  assert.equal(f.run(),true);
  assert.equal(f.cfg.domain,'work');
  assert.equal(f.context.quickTraining,null);
  assert.deepEqual(f.events,['confirm','ack','toggle','renderTraining','renderDomain','mode']);
});
test('PR80 Cancel never writes nor changes the timer',()=>{
  const f=fixture({ack:'true',accepted:false});
  assert.equal(f.run(),false);
  assert.equal(f.cfg.domain,'study');
  assert.equal(f.context.quickTraining,f.training);
  assert.deepEqual(f.events,['confirm']);
});
test('PR80 ordinary running focus session persists before changing mode',()=>{
  const f=fixture({ack:'false',quick:false});
  assert.equal(f.run(),false);
  assert.equal(f.cfg.domain,'study');
  assert.equal(f.context.timerRunning,true);
  assert.deepEqual(f.events,['confirm','ack']);
});
