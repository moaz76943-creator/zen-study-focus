'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../android/app/src/main/assets/web');
function element() {
  return {value:'', textContent:'', type:'', inputMode:'', checked:false, style:{}, children:[],
    classList:{add(){},remove(){}}, setAttribute(){},addEventListener(){},
    appendChild(child){this.children.push(child);return child;},
    replaceChildren(...children){this.children=children;},
    parentElement:{querySelectorAll(){return [];}}};
}
function load(file, extras={}) {
  const elements=new Map(), saves=[];
  const document={getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);},
    createElement(){return element();},querySelectorAll(){return [];}};
  const {cfg:configOverrides={},...contextOverrides}=extras;
  const cfg={lang:'en',domain:'study',shortMin:5,longMin:15,sessionHistory:[],...configOverrides};
  const mock={
    cfg,document,window:{confirm:()=>true},
    localDateISO(d=new Date()){const p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());},
    toWest:x=>String(x), L:()=>({domStudy:'Study',domRead:'Reading',domSport:'Sport',domWork:'Work',weekdays:[]}),
    saveFortressData:(k,v)=>saves.push([k,JSON.stringify(v)]),
    closeModal(){},showToast(){},renderDomainState(){},renderAnalyticsBars(){},switchTab(){},renderQuickTraining(){},
    updateTimerDisplay(){},selectTimerMode(){mock.selectCalls++;},
    toggleTimerPlay(){mock.toggleCalls++;mock.timerRunning=!mock.timerRunning;},
    getDomainFocusMinutes:()=>25,DOMAIN_FOCUS_MINUTES:{study:25,read:20,work:50,sport:30},
    timerRunning:false,timerSessionId:null,timerLeft:1500,timerTotal:1500,
    currentTimerModeKey:'focus',selectCalls:0,toggleCalls:0,
    quickText:k=>k,quickInternalChange:false,quickTraining:null,
    tasksList:[{id:123,isStarter:false,title:'Write report'},{id:124,isStarter:true,title:'Example'}],
    ...contextOverrides};
  const sandbox=vm.createContext(mock);
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),sandbox,{filename:file});
  return {eval:s=>vm.runInContext(s,sandbox),cfg,elements,document,saves,mock};
}
test('goal totals reject invalid/demo rows and de-duplicate IDs without converting their types',()=>{
  const x=load('goals_studio.js',{cfg:{sessionHistory:[
    {id:'a',date:'2026-10-19',minutes:25,domain:'study'},
    {id:'a',date:'2026-10-19',minutes:25,domain:'study'},
    {id:1,date:'2026-10-19',minutes:5,domain:'study'},
    {id:'1',date:'2026-10-19',minutes:7,domain:'study'},
    {id:'fake',date:'2026-10-19',minutes:100,domain:'study',isDemo:true},
    {id:'negative',date:'2026-10-19',minutes:-3,domain:'study'},
    {id:'missing',date:'2026-10-19',minutes:40,domain:'nonsense'},
    {id:null,date:'2026-10-19',minutes:60,domain:'study'},
    {id:'bad-date',date:'2026-02-30',minutes:90,domain:'study'}
  ]}});
  assert.equal(x.eval("gsRecordedMinutes('study','2026-10-19')"),37);
  assert.equal(x.eval("gsRecordedMinutes('study','2026-02-30')"),0);
});
test('weekly minutes have calendar boundaries, keep real activity split and never fabricate future time',()=>{
  const x=load('goals_studio.js',{cfg:{sessionHistory:[
    {id:'past',date:'2026-10-18',minutes:20,domain:'study'},
    {id:'mon',date:'2026-10-19',minutes:30,domain:'study'},
    {id:'tue',date:'2026-10-20',minutes:15,domain:'study'},
    {id:'future',date:'2026-10-22',minutes:50,domain:'study'},
    {id:'read',date:'2026-10-20',minutes:10,domain:'review'}
  ]}});
  assert.equal(x.eval("gsWeeklyRecordedMinutes('study','2026-10-21')"),45);
  assert.equal(x.eval("gsWeeklyRecordedMinutes('read','2026-10-21')"),10);
  assert.equal(x.eval("gsWeeklyRecordedMinutes('work','2026-10-21')"),0);
});
test('weekly goal inputs persist alongside daily preferences without altering legacy records',()=>{
  const x=load('goals_studio.js');
  x.eval('openDailyGoalsModal()');
  for(const d of ['study','read','sport','work']){
    x.document.getElementById('goalInput-'+d).value='60';
    x.document.getElementById('goalWeeklyInput-'+d).value='240';
  }
  assert.equal(x.eval('saveDailyGoals()'),true);
  assert.equal(x.cfg.dailyGoalsMin.study,60);
  assert.equal(x.cfg.weeklyGoalsMin.study,240);
  assert.equal(x.eval("gsWeeklyGoal('study')"),240);
  x.document.getElementById('goalWeeklyInput-study').value='99999';
  assert.equal(x.eval('saveDailyGoals()'),false);
  assert.equal(x.cfg.weeklyGoalsMin.study,240);
});
test('timer preferences never reset a paused session, and invalid values never persist',()=>{
  const x=load('timer_settings.js',{timerSessionId:'paused123',timerLeft:1400,timerTotal:1500});
  x.eval('openTimerSettings()');
  x.document.getElementById('tsetFocus').value='35';
  x.document.getElementById('tsetShort').value='6';
  x.document.getElementById('tsetLong').value='19';
  x.document.getElementById('tsetRounds').value='4';
  assert.equal(x.eval('saveTimerSettings()'),true);
  assert.equal(x.mock.selectCalls,0);
  assert.equal(x.cfg.domainFocusMinutes.study,35);
  x.eval('openTimerSettings()');
  x.document.getElementById('tsetFocus').value='999';
  assert.equal(x.eval('saveTimerSettings()'),false);
  assert.equal(x.cfg.domainFocusMinutes.study,35);
});
test('quick workflow only binds real numeric task IDs and restores that link without forged identities',()=>{
  const x=load('quick_training.js');
  assert.equal(x.eval('focusWorkflowLinkTask(124)'),false);
  assert.equal(x.eval('focusWorkflowLinkTask(123)'),true);
  assert.equal(x.eval('focusWorkflowLinkedTaskId'),123);
  x.eval('applyQuickTrainingPreset("tabata")');
  x.eval('startQuickTraining()');
  assert.equal(x.eval('quickTraining.taskId'),123);
  const snapshot=x.eval('validQuickSnapshot(quickTraining)');
  assert.ok(snapshot,'Real active workout snapshot rejected: '+x.eval('JSON.stringify(quickTraining)'));
  assert.equal(snapshot.taskId,123);
  const forged=x.eval('validQuickSnapshot({...quickTraining,taskId:"task_123"})');
  assert.ok(forged,'Task-link identity must be sanitized, not discard the valid interval');
  assert.equal(forged.taskId,null);
  assert.equal(x.eval('parseQuickTime("03:99")'),null);
});

test('sound mixer prevalidates atomically, mixes two tracks and releases stopped resources',()=>{
  const {createSoundMixer}=require('../../android/app/src/main/assets/web/sound_mix_controls.js');
  const players=new Map(),starts=[],stops=[],volume=new Map();
  const mixer=createSoundMixer({
    catalog:[{id:'rain'},{id:'fire'},{id:'night'}],
    isPlaying:id=>players.has(id),
    start:id=>{starts.push(id);players.set(id,true);},
    stop:id=>{stops.push(id);players.delete(id);},
    setVolume:(id,v)=>volume.set(id,v)
  });
  assert.equal(mixer.applyMix([{id:'rain',percent:55},{id:'fire',percent:25}]),true);
  assert.deepEqual(starts,['rain','fire']);
  assert.equal(volume.get('rain'),.55);
  assert.equal(mixer.applyMix([{id:'rain',percent:55},{id:'fire',percent:25}]),true);
  assert.equal(starts.length,2,'Never start duplicate players');
  assert.equal(mixer.setPercent('fire',200),false);
  assert.equal(mixer.applyMix([{id:'night',percent:80},{id:'bad',percent:10}]),false);
  assert.equal(players.size,2,'Invalid mix must not mutate audio');
  assert.equal(mixer.applyMix([{id:'night',percent:80}]),true);
  assert.deepEqual(stops,['rain','fire']);
  assert.deepEqual(mixer.activeIds(),['night']);
  mixer.dispose();
  assert.deepEqual(stops,['rain','fire','night']);
  assert.equal(mixer.applyMix([{id:'rain',percent:30}]),false);
});

test('restored quick snapshots keep their exact work/rest phase and reject corrupt bounds',()=>{
  const x=load('quick_training.js');
  const snap={active:true,sets:3,workSeconds:20,restSeconds:10,currentSet:1,
    phase:'rest',skipLastRest:true,domain:'sport',taskId:123,exercises:['Run']};
  const restored=x.eval('validQuickSnapshot('+JSON.stringify(snap)+')');
  assert.equal(restored.phase,'rest');
  assert.equal(restored.currentSet,1);
  assert.equal(restored.workSeconds,20);
  assert.equal(restored.taskId,123);
  assert.equal(x.eval('validQuickSnapshot('+JSON.stringify({...snap,currentSet:3})+')'),null);
  assert.equal(x.eval('validQuickSnapshot('+JSON.stringify({...snap,restSeconds:-1})+')'),null);
});
test('work interval advances to rest then the next work interval without a second ledger',()=>{
  const x=load('quick_training.js');
  x.eval('applyQuickTrainingPreset("tabata"); startQuickTraining()');
  assert.equal(x.eval('quickTraining.phase'),'work');
  x.mock.timerRunning=false; // Original timer has just completed this work segment.
  assert.equal(x.eval('advanceQuickTrainingStep()'),true);
  assert.equal(x.eval('quickTraining.phase'),'rest');
  assert.equal(x.eval('quickTraining.currentSet'),0);
  x.mock.timerRunning=false; // A completed rest does not award focus time.
  assert.equal(x.eval('advanceQuickTrainingStep()'),true);
  assert.equal(x.eval('quickTraining.phase'),'work');
  assert.equal(x.eval('quickTraining.currentSet'),1);
});
