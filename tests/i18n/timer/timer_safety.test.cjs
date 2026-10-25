'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const web = path.resolve(__dirname, '../../../android/app/src/main/assets/web');
const source = fs.readFileSync(path.join(web,'timer_settings.js'),'utf8');
const {recordCompletion,STORAGE_KEY_PROCESSED} = require(path.join(web,'js/timer_idempotency.js'));

function setup(overrides={}) {
  const elements=new Map(),calls={saves:[],toast:[],closed:0,select:0,render:0};
  const el=id=>{if(!elements.has(id))elements.set(id,{value:'',textContent:'',classList:{add(){},remove(){}}});return elements.get(id);};
  const cfg={lang:'en',domain:'study',domainFocusMinutes:{study:25,work:50},shortMin:5,longMin:15,roundsPerCycle:4,focusCycleCount:2,...overrides.cfg};
  const state={cfg, document:{getElementById:el},globalThis:null,
    getDomainFocusMinutes:()=>cfg.domainFocusMinutes[cfg.domain]||25,
    DOMAIN_FOCUS_MINUTES:{study:25,read:20,work:50,sport:30},
    toWest:s=>String(s).replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))),
    saveFortressData:(key,data)=>{calls.saves.push({key, data:JSON.parse(JSON.stringify(data))});return true;},
    showToast:s=>calls.toast.push(s),closeModal:()=>{calls.closed++},
    renderDomainState:()=>{calls.render++},
    selectTimerMode:()=>{calls.select++;return true;},
    timerRunning:false,quickTraining:null,timerSessionId:null,
    timerLeft:1500,timerTotal:1500,currentTimerModeKey:'focus',customSessionLabel:'My custom session (40m)',...overrides
  };
  state.globalThis=state;
  vm.createContext(state);vm.runInContext(source,state);
  return {state,cfg,el,calls,eval:code=>vm.runInContext(code,state)};
}
function draft(x,{focus='35',short='6',long='19',rounds='5'}={}){
  x.eval('openTimerSettings()');
  for(const [id,v] of Object.entries({tsetFocus:focus,tsetShort:short,tsetLong:long,tsetRounds:rounds}))x.el(id).value=v;
}
function snapshot(x){return JSON.stringify({running:x.state.timerRunning,training:x.state.quickTraining,id:x.state.timerSessionId,left:x.state.timerLeft,total:x.state.timerTotal,mode:x.state.currentTimerModeKey,label:x.state.customSessionLabel});}

test('storage rejection does not mutate configuration, close dialog or claim success',()=>{
  const x=setup({saveFortressData:()=>{throw new Error('QUOTA_EXCEEDED')}});draft(x);
  const before=JSON.stringify(x.cfg);
  assert.equal(x.eval('saveTimerSettings()'),false);
  assert.equal(JSON.stringify(x.cfg),before);assert.equal(x.calls.closed,0);
  assert.ok(x.calls.toast.at(-1) && !/Settings saved/i.test(x.calls.toast.at(-1)));
});
test('false persistence acknowledgement keeps cfg and dialog intact',()=>{
  const x=setup({saveFortressData:()=>false});draft(x);
  assert.equal(x.eval('saveTimerSettings()'),false);
  assert.equal(x.cfg.shortMin,5);assert.equal(x.calls.closed,0);
});
test('save while running/paused/quick training preserves session and custom label',()=>{
  for(const initial of [
    {timerRunning:true,timerSessionId:'active-A',timerLeft:1000},
    {timerRunning:false,timerSessionId:'paused-A',timerLeft:900},
    {quickTraining:{active:true},timerSessionId:'training-A',timerLeft:400},
    {currentTimerModeKey:'custom',timerLeft:2400,timerTotal:2400}
  ]){
    const x=setup(initial),before=snapshot(x);draft(x);
    assert.equal(x.eval('saveTimerSettings()'),true);
    assert.equal(snapshot(x),before);assert.equal(x.calls.select,0);
    assert.equal(x.cfg.shortMin,6);assert.equal(x.cfg.focusCycleCount,0);
    assert.equal(x.calls.saves[0].data.domainFocusMinutes.study,35);
  }
});
test('language change changes labels only; keeps active session and Western digits',()=>{
  const x=setup({timerRunning:true,timerSessionId:'r1',timerLeft:1031});const before=snapshot(x);
  x.cfg.lang='ar';x.eval('refreshTimerSettings()');
  assert.equal(snapshot(x),before);
  assert.match(x.el('tsetSave').textContent,/حفظ/);
  assert.equal(x.el('modeShortBtn').textContent,'5m');
});
test('Cancel/no save preserves previous values and fresh save refreshes only fresh preset',()=>{
  const x=setup();draft(x,{focus:'45',short:'8',long:'20',rounds:'4'});
  x.eval('resetTimerSettingsFields()');assert.equal(x.el('tsetFocus').value,'25');
  assert.equal(x.calls.saves.length,0);assert.equal(x.cfg.shortMin,5);
  draft(x,{focus:'45',short:'8',long:'20',rounds:'4'});
  assert.equal(x.eval('saveTimerSettings()'),true);
  assert.equal(x.cfg.domainFocusMinutes.study,45);assert.equal(x.cfg.focusCycleCount,2);
  assert.equal(x.calls.select,1);assert.equal(x.calls.closed,1);
});
test('invalid values and switched domain cannot mutate configuration',()=>{
  const x=setup();draft(x,{focus:'0'});
  assert.equal(x.eval('saveTimerSettings()'),false);assert.equal(x.calls.saves.length,0);
  draft(x);x.cfg.domain='work';
  assert.equal(x.eval('saveTimerSettings()'),false);assert.equal(x.calls.saves.length,0);
});
function ledger(initial){const records=new Map(initial||[]);return {getItem:k=>records.has(k)?records.get(k):null,setItem:(k,v)=>records.set(k,v),records};}
function tracker(){const total={minutes:0,calls:0};return {total,addFocusMinutes(m){total.minutes+=m;total.calls++;}};}
test('completion is credited once across duplicate and restored engine calls',()=>{
  const storage=ledger(),a=tracker(),session={sessionId:'session-a',durationMinutes:12,activityType:'study'};
  assert.equal(recordCompletion(session,storage,a).status,'CREDITED_SUCCESSFULLY');
  assert.equal(recordCompletion(session,storage,a).status,'ALREADY_CREDITED');
  assert.equal(recordCompletion(session,storage,tracker()).status,'ALREADY_CREDITED');
  assert.equal(a.total.calls,1);assert.equal(a.total.minutes,12);
});
test('ledger quota/write failures prevent credit before side effects',()=>{
  const storage=ledger(),a=tracker();storage.setItem=()=>{throw new Error('quota')};
  const result=recordCompletion({sessionId:'session-a',durationMinutes:15},storage,a);
  assert.equal(result.credited,false);assert.equal(a.total.calls,0);
});
test('corrupt ledger must fail closed, not reset dedup records',()=>{
  const storage=ledger([[STORAGE_KEY_PROCESSED,'garbled']]),a=tracker();
  assert.equal(recordCompletion({sessionId:'a',durationMinutes:30},storage,a).credited,false);
  assert.equal(a.total.calls,0);
});
test('tracker failure cannot enable replay or duplicate credits',()=>{
  const storage=ledger(), a={addFocusMinutes(){throw new Error('tracker side effect uncertain')}};
  const s={sessionId:'a',durationMinutes:20};
  assert.equal(recordCompletion(s,storage,a).credited,false);
  assert.equal(recordCompletion(s,storage,tracker()).status,'ALREADY_CREDITED');
});
test('invalid minutes and missing tracker never consume session ID',()=>{
  const storage=ledger(),s={sessionId:'a',durationMinutes:-12};
  assert.equal(recordCompletion(s,storage,tracker()).credited,false);
  s.durationMinutes=25;
  assert.equal(recordCompletion(s,storage,null).credited,false);
  assert.equal(storage.getItem(STORAGE_KEY_PROCESSED),null);
});
