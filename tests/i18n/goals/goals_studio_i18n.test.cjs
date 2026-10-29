'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../../../android/app/src/main/assets/web/goals_studio.js'),'utf8');

function node(tag='div'){
  return {tagName:tag.toUpperCase(),value:'',textContent:'',children:[],style:{},attributes:{},
    className:'',classList:{add(){},remove(){}},
    setAttribute(k,v){this.attributes[k]=String(v);},getAttribute(k){return this.attributes[k] ?? null;},
    appendChild(child){this.children.push(child);return child;},
    replaceChildren(...children){this.children=children;},
    addEventListener(k,fn){(this.handlers ||= {})[k]=fn;}};
}
function fixture({lang='en',cfg:extra={},save=()=>true,locale=null}={}){
  const elements=new Map(),saved=[],toasts=[],closed=[];
  const doc={createElement:node,getElementById(id){if(!elements.has(id))elements.set(id,node());return elements.get(id);}};
  const cfg={lang,domain:'study',sessionHistory:[],
    dailyGoalsMin:{study:25,legacyMilestone:71},weeklyGoalsMin:{study:90,legacyMilestone:210},...extra};
  const ctx={cfg,document:doc,
    localDateISO(date){if(!date)return '2026-10-21';return date.getFullYear()+'-'+
      String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');},
    toWest:str=>String(str).replace(/[٠-٩]/g,d=>String(d.charCodeAt(0)-1632)).replace(/[۰-۹]/g,d=>String(d.charCodeAt(0)-1776)),
    L:()=>({domStudy:'Study',domRead:'Reading',domSport:'Sport',domWork:'Work',
      btnCancel:'Cancel',btnSave:'Save & Apply'}),
    showToast:msg=>toasts.push(msg),closeModal:id=>closed.push(id),
    saveFortressData:(key,obj)=>{saved.push({key,snapshot:JSON.parse(JSON.stringify(obj))});return save(key,obj);},
    switchActivityDomain(){},switchTab(){},startGoalActivity(){},
    globalThis:{DF99Locale:{t:locale||((code,family,key,fallback)=>
      code==='de'&&family==='analyticsDomain'&&key==='study'?'Studium':fallback)}}
  };
  vm.createContext(ctx);vm.runInContext(source,ctx,{filename:'goals_studio.js'});
  const evaluate=expression=>vm.runInContext(expression,ctx);
  function inputs(daily='60',weekly='240'){
    evaluate('openDailyGoalsModal()');
    for(const domain of ['study','read','sport','work']){
      doc.getElementById('goalInput-'+domain).value=daily;
      doc.getElementById('goalWeeklyInput-'+domain).value=weekly;
    }
  }
  return {ctx,cfg,doc,inputs,evaluate,saved,toasts,closed};
}

test('rejecting persistence does not mutate v21 goals or close the edit modal',()=>{
  const f=fixture({save:()=>false});
  f.inputs();
  assert.equal(f.evaluate('saveDailyGoals()'),false);
  assert.equal(f.cfg.dailyGoalsMin.study,25);
  assert.equal(f.cfg.weeklyGoalsMin.study,90);
  assert.equal(f.closed.length,0);
  assert.ok(f.toasts.length>0);
  assert.equal(f.saved[0].key,'zen_fortress_cfg_v21');
});
test('storage exception preserves original goals and reports a failure',()=>{
  const f=fixture({save:()=>{throw Error('disk quota');}});
  f.inputs();
  assert.equal(f.evaluate('saveDailyGoals()'),false);
  assert.equal(f.cfg.dailyGoalsMin.study,25);
  assert.equal(f.cfg.weeklyGoalsMin.study,90);
  assert.equal(f.closed.length,0);
  assert.ok(f.toasts[0]);
});
test('successful save preserves unknown existing goal properties and the single v21 key',()=>{
  const f=fixture();f.inputs();
  assert.equal(f.evaluate('saveDailyGoals()'),true);
  assert.equal(f.cfg.dailyGoalsMin.study,60);
  assert.equal(f.cfg.weeklyGoalsMin.study,240);
  assert.equal(f.cfg.dailyGoalsMin.legacyMilestone,71);
  assert.equal(f.cfg.weeklyGoalsMin.legacyMilestone,210);
  assert.equal(f.saved.length,1);
  assert.equal(f.saved[0].snapshot.dailyGoalsMin.legacyMilestone,71);
  assert.equal(f.saved[0].snapshot.weeklyGoalsMin.legacyMilestone,210);
});
test('invalid daily or weekly input cannot partially mutate or save goals',()=>{
  const f=fixture();f.inputs();
  f.doc.getElementById('goalInput-read').value='721';
  assert.equal(f.evaluate('saveDailyGoals()'),false);
  assert.equal(f.saved.length,0);
  f.doc.getElementById('goalInput-read').value='25';
  f.doc.getElementById('goalWeeklyInput-sport').value='5041';
  assert.equal(f.evaluate('saveDailyGoals()'),false);
  assert.equal(f.saved.length,0);
  assert.equal(f.cfg.dailyGoalsMin.study,25);
});
test('history includes only recorded completed sessions, deduplicated by typed IDs',()=>{
  const f=fixture({cfg:{sessionHistory:[
    {id:'real',date:'2026-10-21',domain:'study',minutes:25},
    {id:'real',date:'2026-10-21',domain:'study',minutes:25},
    {id:1,date:'2026-10-21',domain:'study',minutes:5,status:'completed'},
    {id:'1',date:'2026-10-21',domain:'study',minutes:7,status:'completed'},
    {id:'active',date:'2026-10-21',domain:'study',minutes:30,status:'active'},
    {id:'flag',date:'2026-10-21',domain:'study',minutes:40,completed:false},
    {id:'demo',date:'2026-10-21',domain:'study',minutes:100,isDemo:true}
  ]}});
  assert.equal(f.evaluate("gsRecordedMinutes('study','2026-10-21')"),37);
  assert.equal(f.evaluate("gsWeeklyRecordedMinutes('study','2026-10-21')"),37);
});
test('verified multilingual domains take precedence over an English core fallback',()=>{
  const f=fixture({lang:'de'});
  assert.equal(f.evaluate('gsLabels().study[0]'),'Studium');
  const rows=f.doc.getElementById('dailyGoalsRows');
  assert.equal(rows.children[0].children[1].children[0].textContent,'Studium');
  assert.match(rows.children[0].children[2].children[1].attributes['aria-label'],/Studium/);
});
test('RTL and LTR rendering retains Latin generated digits and scoped direction',()=>{
  for(const [lang,dir] of [['ar','rtl'],['fa','rtl'],['ku','ltr'],['de','ltr']]){
    const f=fixture({lang,cfg:{sessionHistory:[
      {id:'ok',date:'2026-10-21',domain:'study',minutes:25}]}});
    const rows=f.doc.getElementById('dailyGoalsRows');
    assert.equal(rows.attributes.dir,dir);
    assert.equal(rows.children.length,4);
    assert.match(rows.children[0].children[1].children[1].textContent,/25/);
    assert.doesNotMatch(rows.children[0].children[1].children[1].textContent,/[٠-٩۰-۹]/);
    f.inputs();
    assert.equal(f.doc.getElementById('goalsEditGrid').attributes.dir,dir);
  }
});
test('no goals shows setup state instead of inventing progress',()=>{
  const f=fixture({cfg:{dailyGoalsMin:{},weeklyGoalsMin:{},sessionHistory:[]}});
  const rows=f.doc.getElementById('dailyGoalsRows');
  assert.equal(rows.children.length,4);
  for(const row of rows.children){
    assert.ok(row.children[1].children[1].textContent);
    assert.equal(row.children[1].children[2].attributes['aria-valuenow'],'0');
  }
});
test('rerendering after language change keeps user data byte-for-byte',()=>{
  const f=fixture({cfg:{dailyGoalsMin:{study:45,userGoalTitle:'خطة خاصة ٢'},
    sessionHistory:[{id:'original-1',date:'2026-10-21',minutes:12,domain:'study'}]}});
  const before=JSON.stringify(f.cfg);
  f.cfg.lang='de';
  const expected=JSON.stringify(f.cfg);
  f.evaluate('renderDailyGoals()');
  assert.equal(JSON.stringify(f.cfg),expected);
  assert.equal(f.cfg.dailyGoalsMin.userGoalTitle,'خطة خاصة ٢');
  assert.equal(f.saved.length,0);
  assert.notEqual(before,expected);
});
test('completed daily target displays localized completion without changing minutes',()=>{
  const f=fixture({lang:'ar',cfg:{dailyGoalsMin:{study:20},sessionHistory:[
    {id:'session',date:'2026-10-21',minutes:25,domain:'study'}]}});
  const title=f.doc.getElementById('dailyGoalsRows').children[0].children[1];
  assert.ok(title.children.some(child=>String(child.textContent).includes('المنجز')));
  assert.equal(f.evaluate("gsRecordedMinutes('study','2026-10-21')"),25);
});

test('close button accessible label follows repeated locale changes',()=>{
  const f=fixture({lang:'ar'});
  const close=node('button');
  close.setAttribute('aria-label','Close');
  const modal=f.doc.getElementById('dailyGoalsModal');
  // HTML gives this button stable .modal-head and .task-mini-sel classes.
  // A selector based on translated aria-label stops matching after first update.
  modal.querySelector=selector=>{
    if(selector==='.modal-head .task-mini-sel')return close;
    if(selector==='[aria-label="Close"]')return close.getAttribute('aria-label')==='Close'?close:null;
    return null;
  };
  f.evaluate('openDailyGoalsModal()');
  assert.equal(close.getAttribute('aria-label'),'إغلاق');
  f.cfg.lang='de';
  f.evaluate('openDailyGoalsModal()');
  assert.equal(close.getAttribute('aria-label'),'Close');
  f.cfg.lang='ar';
  f.evaluate('openDailyGoalsModal()');
  assert.equal(close.getAttribute('aria-label'),'إغلاق');
  assert.equal(f.saved.length,0,'language changes must not save or mutate goal preferences');
});
test('regional Arabic keeps Arabic goal labels instead of English fallback',()=>{
  const f=fixture({lang:'ar-JO'});
  assert.equal(f.evaluate("gsText('heading')"),'تقدمك في كل نشاط');
  assert.equal(f.doc.getElementById('dailyGoalsRows').attributes.dir,'rtl');
});
