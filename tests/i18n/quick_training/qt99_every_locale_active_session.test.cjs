'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const app=fs.readFileSync(path.resolve(__dirname,'../../../android/app/src/main/assets/web/quick_training.js'),'utf8');

function fixture(){
  const calls={play:0,mode:0,save:0,event:0,confirm:0};
  const elements=new Map();
  const el=(attributes={})=>({
    attributes,style:{},textContent:'',placeholder:'',children:[],hidden:false,
    disabled:false,open:false,
    appendChild(child){this.children.push(child);return child;},
    getAttribute(key){return this.attributes[key]||null;},
    setAttribute(key,val){this.attributes[key]=val;}
  });
  const label=el({'data-qt':'workPhase'});
  const placeholder=el({'data-qt-placeholder':'exercisePlaceholder'});
  const document={
    querySelectorAll(selector){
      if(selector==='[data-qt]')return [label];
      if(selector==='[data-qt-placeholder]')return [placeholder];
      return [];
    },
    getElementById(id){
      if(id==='todayPlanPreview')return null;
      if(!elements.has(id))elements.set(id,el());
      return elements.get(id);
    },
    createElement:()=>el()
  };
  const cfg={lang:'en',domain:'sport',sessionHistory:[{id:'real-1',minutes:25}]};
  const context=vm.createContext({
    cfg,document,toWest:String,timerRunning:false,timerSessionId:null,
    window:{confirm(){calls.confirm++;return false;},dispatchEvent(){calls.event++;}},
    CustomEvent:function(kind,payload){this.type=kind;this.detail=payload.detail;},
    saveFortressData(){calls.save++;},toggleTimerPlay(){calls.play++;},
    selectTimerMode(){calls.mode++;},getDomainFocusMinutes:()=>25,
    showToast(){},renderDomainState(){}
  });
  vm.runInContext(app,context,{filename:'quick_training.js'});
  const workout={active:true,sets:2,workSeconds:90,restSeconds:15,
    currentSet:1,phase:'rest',skipLastRest:true,domain:'sport',
    exercises:[],taskId:null};
  vm.runInContext('quickTraining='+JSON.stringify(workout),context);
  return {context,cfg,calls,elements,label,placeholder,workout,
    run:script=>vm.runInContext(script,context)};
}

test('all 99 Quick Training UI locales switch without ending or mutating a running rest phase',()=>{
  const x=fixture();
  const codes=Object.keys(x.run('QUICK_TRANSLATIONS'));
  assert.equal(codes.length,99);
  const before=x.run('JSON.stringify(quickTraining)');
  const savedHistory=JSON.stringify(x.cfg.sessionHistory);
  for(const lang of codes){
    x.cfg.lang=lang;
    x.run('quickL10n()');
    const labels=x.run('QUICK_TRANSLATIONS['+JSON.stringify(lang)+']');
    const keys=x.run('QUICK_KEYS');
    assert.equal(x.label.textContent,labels[keys.indexOf('workPhase')],lang+' phase label');
    assert.equal(x.placeholder.placeholder,labels[keys.indexOf('exercisePlaceholder')],lang+' placeholder');
    assert.equal(x.elements.get('focusStatusLabel').textContent,labels[keys.indexOf('ready')],lang+' timer status');
    const progress=x.elements.get('qtProgressTitle').textContent;
    assert.ok(progress.startsWith(labels[keys.indexOf('restPhase')]),lang+' current rest title');
    assert.equal(x.elements.get('qtProgressFill').style.width,'75.0%',lang+' progress');
    assert.equal(x.run('JSON.stringify(quickTraining)'),before,lang+' active state modified');
    assert.equal(x.run('timeString(65)'),'01:05',lang+' western digits');
    assert.equal(JSON.stringify(x.cfg.sessionHistory),savedHistory,lang+' history mutated');
  }
  assert.equal(x.calls.play,0);assert.equal(x.calls.mode,0);
  assert.equal(x.calls.save,0);assert.equal(x.calls.event,0);
});

test('Cancel must reject safely in every locale and never count an unfinished session',()=>{
  const x=fixture();
  const codes=Object.keys(x.run('QUICK_TRANSLATIONS'));
  const initial=x.run('JSON.stringify(quickTraining)');
  for(const lang of codes){
    x.cfg.lang=lang;
    assert.ok(x.run('quickText("cancelPrompt")').trim(),lang+' missing confirmation');
    x.run('cancelQuickTraining()'); // fixture returns Cancel on every dialog
    assert.equal(x.run('JSON.stringify(quickTraining)'),initial,lang+' canceled user session');
  }
  assert.equal(x.calls.confirm,99);
  assert.equal(x.calls.play,0);assert.equal(x.calls.mode,0);
  assert.equal(x.calls.save,0);assert.equal(x.calls.event,0);
  assert.equal(x.cfg.sessionHistory.length,1);
});
