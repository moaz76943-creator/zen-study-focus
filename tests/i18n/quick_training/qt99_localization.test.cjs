'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.resolve(__dirname,
  '../../../android/app/src/main/assets/web/quick_training.js'), 'utf8');
function fixture() {
  const elements = new Map();
  const document = {
    querySelectorAll: () => [],
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, {
        value: '', textContent: '', checked: false, hidden: false, open: false,
        style: {}, children: [], addEventListener(){}, setAttribute(){},
        appendChild(node){this.children.push(node);}, classList:{add(){},remove(){}}
      });
      return elements.get(id);
    },
    createElement() {
      return {type:'',textContent:'',title:'',style:{},setAttribute(){},appendChild(){}};
    }
  };
  const calls = {play:0,mode:0,save:0,events:0};
  const cfg = {lang:'en',domain:'study',sessionHistory:[]};
  const sandbox = {
    cfg,document,window:{confirm:()=>false,dispatchEvent(){calls.events++;}},
    CustomEvent:function(type,payload){this.type=type;this.detail=payload.detail;},
    timerRunning:false,timerSessionId:null,toWest:String,
    getDomainFocusMinutes:()=>25,saveFortressData(){calls.save++;},
    renderDomainState(){},selectTimerMode(){calls.mode++;},
    toggleTimerPlay(){calls.play++;},showToast(){},
    localDateISO:()=> '2026-10-25',
  };
  const context = vm.createContext(sandbox);
  vm.runInContext(source,context,{filename:'quick_training.js'});
  return {cfg,document,calls,elements,evaluate:code=>vm.runInContext(code,context)};
}

test('all supplied quick training packs have exactly 36 real nonempty strings',()=>{
  const x=fixture(), packs=x.evaluate('QUICK_TRANSLATIONS');
  const keys=x.evaluate('QUICK_KEYS');
  assert.equal(keys.length,36);
  assert.ok(Object.keys(packs).length>=82,'new batches must increase coverage from 80');
  for (const [lang,values] of Object.entries(packs)) {
    assert.equal(values.length,keys.length,lang);
    assert.ok(values.every(s=>typeof s==='string' && s.trim().length>0),lang);
  }
});

test('Corsican and Western Frisian have distinct complete translations, not English aliases',()=>{
  const x=fixture(), p=x.evaluate('QUICK_TRANSLATIONS');
  for (const lang of ['co','fy']) {
    assert.ok(Object.hasOwn(p,lang),'missing '+lang);
    assert.equal(p[lang].length,36);
    for (const i of [0,1,4,5,7,8,9,17,18,19,23,26,27,30,31,32,33,34]) {
      assert.notEqual(p[lang][i],p.en[i],lang+' must not copy English for entry '+i);
    }
    assert.match(p[lang][7],/MM:SS/);
    assert.match(p[lang][8],/MM:SS/);
    assert.match(p[lang][32],/MM:SS/);
  }
});

test('language switching re-renders labels without mutating active workout or history',()=>{
  const x=fixture();
  const saved={active:true,sets:2,workSeconds:90,restSeconds:15,
    currentSet:1,phase:'rest',skipLastRest:true,domain:'sport',exercises:[],taskId:null};
  x.evaluate('quickTraining='+JSON.stringify(saved));
  const before=x.evaluate('JSON.stringify(quickTraining)');
  for (const lang of ['en','co','fy','ar']) {
    x.cfg.lang=lang;
    x.evaluate('quickL10n()');
    assert.equal(x.evaluate('JSON.stringify(quickTraining)'),before);
    assert.equal(x.evaluate('timeString(65)'),'01:05');
  }
  assert.equal(x.calls.play,0);
  assert.equal(x.calls.mode,0);
  assert.equal(x.calls.save,0);
  assert.equal(x.calls.events,0);
  assert.equal(x.cfg.sessionHistory.length,0);
});

test('Cancel does not stop or record a training session without confirmation',()=>{
  const x=fixture();
  x.evaluate('quickTraining={active:true,sets:3,workSeconds:20,restSeconds:10,currentSet:1,phase:"work",skipLastRest:true,domain:"sport",exercises:[],taskId:null}');
  x.evaluate('cancelQuickTraining()');
  assert.equal(x.evaluate('quickTraining.active'),true);
  assert.equal(x.calls.mode,0);
  assert.equal(x.calls.play,0);
  assert.equal(x.calls.events,0);
  assert.equal(x.cfg.sessionHistory.length,0);
});

test('validated saved workout retains work/rest phase; final rest skip never invents minutes',()=>{
  const x=fixture();
  const saved={active:true,sets:2,workSeconds:20,restSeconds:10,
    currentSet:1,phase:'work',skipLastRest:true,domain:'sport',taskId:null,exercises:[]};
  const recovered=x.evaluate('validQuickSnapshot('+JSON.stringify(saved)+')');
  assert.equal(recovered.currentSet,1);
  assert.equal(recovered.phase,'work');
  x.evaluate('quickTraining='+JSON.stringify(saved));
  x.evaluate('advanceQuickTrainingStep()');
  assert.equal(x.evaluate('quickTraining'),null);
  assert.equal(x.cfg.sessionHistory.length,0);
  assert.equal(x.calls.events,1);
});
