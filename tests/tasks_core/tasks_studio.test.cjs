'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const Studio=require('../../android/app/src/main/assets/web/tasks_studio.js');
class FakeElement {
 constructor(doc,tag){this.ownerDocument=doc;this.tagName=tag.toUpperCase();this.children=[];this.listeners={};this.attributes={};this.value='';this.textContent='';this.checked=false;this.style={};}
 appendChild(n){this.children.push(n);n.parent=this;return n;}
 replaceChildren(...nodes){this.children=[];nodes.forEach(n=>this.appendChild(n));}
 setAttribute(k,v){this.attributes[k]=v;}
 addEventListener(k,cb){this.listeners[k]=cb;}
 dispatch(k){this.listeners[k]?.({target:this,preventDefault(){}});}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);}
 get descendants(){return this.children.flatMap(c=>[c,...c.descendants]);}
}
const fakeDoc={createElement(tag){return new FakeElement(this,tag);}};
function fixture(){let state={cfg:{sessionHistory:[],taskProjectsV21:[]},tasksList:[{id:7,title:'Write',date:'2026-10-19',catKey:'study',done:false,isStarter:false}]};
 let commits=0;
 const root=new FakeElement(fakeDoc,'main'),studio=Studio.mount(root,{locale:'en',now:()=>new Date(2026,9,19),readState:()=>JSON.parse(JSON.stringify(state)),
  commit(before,after){assert.deepEqual(before,state);state=JSON.parse(JSON.stringify(after));commits++;return true;},linkTaskToTimer:()=>true});
 return {root,studio,get:()=>state,commits:()=>commits,set:x=>{state=x;}};}
test('UI mounts into supplied root and respects isolated style',()=>{
 const f=fixture();assert.ok(f.root.descendants.some(x=>x.tagName==='STYLE'));
 assert.ok(f.root.descendants.some(x=>x.textContent==='Tasks Studio'));
 assert.equal(f.commits(),0);f.studio.destroy();assert.equal(f.root.descendants.length,0);
});
test('complete then undo/redo uses only injected commit adapter',()=>{
 const f=fixture();
 const find=s=>f.root.descendants.find(x=>x.tagName==='BUTTON'&&x.textContent===s);
 find('Complete').dispatch('click');assert.equal(f.get().tasksList[0].done,true);
 find('Undo').dispatch('click');assert.equal(f.get().tasksList[0].done,false);
 find('Redo').dispatch('click');assert.equal(f.get().tasksList[0].done,true);
 assert.equal(f.commits(),3);
});
test('external timer state revision invalidates undo instead of erasing sessions',()=>{
 const f=fixture(),find=s=>f.root.descendants.find(x=>x.tagName==='BUTTON'&&x.textContent===s);
 find('Complete').dispatch('click');
 const external=f.get();external.cfg.sessionHistory.push({id:'new',taskId:7,completed:true,mode:'focus',minutes:12,date:'2026-10-19'});
 f.set(external);find('Undo').dispatch('click');
 assert.equal(f.get().tasksList[0].done,true);
 assert.equal(f.get().cfg.sessionHistory.length,1);
});

test('legacy undated tasks render and priority sorting remains read-only',()=>{
 let state={cfg:{sessions:4,sessionHistory:[],unknown:{keep:'cfg'}},tasksList:[
  {id:40,title:'Scheduled task',date:'2026-10-19',done:false,priority:'medium'},
  {id:12,title:'مهمة قديمة ١٢',done:false,priority:'medium'},
  {id:13,title:'Legacy null date',date:null,done:false,priority:'medium'},
  {id:14,title:'Legacy malformed date',date:'bad-date',done:false,priority:'medium'}].map(t=>({...t,unknown:{keep:'task'}}))};
 const before=JSON.parse(JSON.stringify(state));let commits=0;
 const root=new FakeElement(fakeDoc,'main');
 const studio=Studio.mount(root,{locale:'en',now:()=>new Date(2026,9,19),
  readState:()=>JSON.parse(JSON.stringify(state)),commit(){commits++;return true;}});
 const cardTitles=()=>root.descendants.filter(x=>x.className==='df-title').map(x=>x.textContent);
 assert.deepEqual(cardTitles(),['مهمة قديمة ١٢','Legacy null date','Legacy malformed date','Scheduled task']);
 const sort=root.descendants.find(x=>x.tagName==='SELECT'&&x.children.some(o=>o.value==='priority'));
 assert.ok(sort);sort.value='priority';sort.dispatch('change');
 assert.deepEqual(cardTitles(),['مهمة قديمة ١٢','Legacy null date','Legacy malformed date','Scheduled task']);
 const search=root.descendants.find(x=>x.tagName==='INPUT'&&x.type==='search');
 search.value='قديمة';search.dispatch('input');assert.deepEqual(cardTitles(),['مهمة قديمة ١٢']);
 assert.equal(commits,0);assert.deepEqual(state,before);assert.equal(Object.hasOwn(state.tasksList[1],'date'),false);
 studio.destroy();
});


function legacyEditorFixture(task, acknowledged=true){
 let state={cfg:{sessionHistory:[],taskProjectsV21:[],legacyConfig:{keep:'cfg'}},tasksList:[JSON.parse(JSON.stringify(task))]};
 const root=new FakeElement(fakeDoc,'main');let attempts=0,commits=0;
 const studio=Studio.mount(root,{locale:'en',now:()=>new Date(2026,9,21),
  readState:()=>JSON.parse(JSON.stringify(state)),
  commit(before,after){
   attempts++;
   assert.deepEqual(before,state);
   if(!acknowledged)return false;
   state=JSON.parse(JSON.stringify(after));commits++;return true;
  }});
 const edit=root.descendants.find(x=>x.tagName==='BUTTON'&&x.textContent==='Edit');
 assert.ok(edit,'Edit action must exist');edit.dispatch('click');
 const form=root.descendants.find(x=>x.tagName==='FORM'&&x.className==='df-form');
 assert.ok(form,'Editor form must exist');
 const field=name=>{
  const label=form.descendants.find(x=>x.tagName==='LABEL'&&x.textContent===name);
  assert.ok(label,'Missing editor field: '+name);return label.children[0];
 };
 return {root,studio,form,field,get:()=>state,attempts:()=>attempts,commits:()=>commits};
}

test('editing a v21 task with no date never invents date/dueAssigned or unrelated optional fields',()=>{
 const original={id:73,title:'Old task',done:false,isStarter:false,catKey:'study',
  oldExtension:{owner:'keep'},historicalTag:'legacy'};
 const f=legacyEditorFixture(original);
 assert.equal(f.field('Date').value,'');
 assert.equal(f.field('Has due date').checked,false);
 f.field('Task title').value='Renamed legacy task';
 f.form.dispatch('submit');
 const saved=f.get().tasksList[0];
 assert.equal(saved.id,73);assert.equal(saved.title,'Renamed legacy task');
 assert.equal(Object.hasOwn(saved,'date'),false);
 assert.equal(Object.hasOwn(saved,'dueAssigned'),false);
 assert.equal(Object.hasOwn(saved,'priority'),false);
 assert.equal(Object.hasOwn(saved,'repeat'),false);
 assert.equal(Object.hasOwn(saved,'dueTime'),false);
 assert.equal(Object.hasOwn(saved,'estimateMin'),false);
 assert.deepEqual(saved.oldExtension,{owner:'keep'});
 assert.equal(saved.historicalTag,'legacy');
 assert.deepEqual(f.get().cfg.legacyConfig,{keep:'cfg'});
 assert.equal(f.commits(),1);f.studio.destroy();
});

test('editing null or malformed legacy dates leaves their exact stored representations alone',()=>{
 for(const date of [null,'legacy-not-a-date']){
  const f=legacyEditorFixture({id:74,title:'Legacy odd date',date,done:false,catKey:'study',custom:{keep:date}});
  assert.equal(f.field('Date').value,'');
  f.field('Description').value='New description';
  f.form.dispatch('submit');
  assert.equal(f.get().tasksList[0].date,date);
  assert.equal(Object.hasOwn(f.get().tasksList[0],'dueAssigned'),false);
  assert.deepEqual(f.get().tasksList[0].custom,{keep:date});
  assert.equal(f.commits(),1);f.studio.destroy();
 }
});

test('explicitly assigning a date updates the legacy task without changing its numeric ID',()=>{
 const f=legacyEditorFixture({id:75,title:'Add a date',done:false,catKey:'study',v21Extension:{keep:1}});
 f.field('Has due date').checked=true;
 f.field('Date').value='2026-10-30';
 f.form.dispatch('submit');
 const task=f.get().tasksList[0];
 assert.equal(task.date,'2026-10-30');assert.equal(task.dueAssigned,true);
 assert.equal(task.id,75);assert.deepEqual(task.v21Extension,{keep:1});
 assert.equal(f.commits(),1);f.studio.destroy();
});

test('title-only editing preserves original recurring rule, no-op Save and duplicate-submit safety',()=>{
 const original={id:76,title:'Repeat unchanged',date:'2026-10-21',done:false,catKey:'study',
  repeat:{frequency:'weekly',interval:3,until:'2026-12-30'},extension:'keep'};
 const f=legacyEditorFixture(original);
 f.form.dispatch('submit');
 assert.equal(f.commits(),0,'Unchanged editor must not persist a synthetic revision');
 f.studio.destroy();
 const g=legacyEditorFixture(original);
 g.field('Task title').value='Repeat edited';
 g.form.dispatch('submit');
 g.form.dispatch('submit');
 assert.equal(g.commits(),1,'Detached editor must not submit twice');
 assert.deepEqual(g.get().tasksList[0].repeat,original.repeat);
 assert.equal(g.get().tasksList[0].extension,'keep');
 g.studio.destroy();
});

test('rejected durable ACK retains undated editor draft and does not change stored data',()=>{
 const original={id:77,title:'Draft title',done:false,catKey:'study',custom:{keep:'yes'}};
 const f=legacyEditorFixture(original,false);
 f.field('Task title').value='Unsaved draft';
 f.form.dispatch('submit');
 assert.equal(f.commits(),0);assert.equal(f.attempts(),1);
 assert.deepEqual(f.get().tasksList[0],original);
 assert.equal(Object.hasOwn(f.get().tasksList[0],'date'),false);
 assert.ok(f.root.descendants.some(x=>x.tagName==='FORM'&&x.className==='df-form'));
 assert.equal(f.field('Task title').value,'Unsaved draft');
 f.studio.destroy();
});


test('Tasks Studio mounts a thousand undated tasks without inventing dates or overflowing its DOM',()=>{
 let state={cfg:{sessionHistory:[],extension:{keep:'config'}},tasksList:Array.from({length:1000},(_,i)=>({
  id:1000+i,title:'Legacy bulk task '+i,done:false,catKey:'study',extension:{order:i}
 }))};
 const before=JSON.stringify(state),root=new FakeElement(fakeDoc,'main');let commits=0;
 const studio=Studio.mount(root,{locale:'en',now:()=>new Date(2026,9,21),
  readState:()=>JSON.parse(JSON.stringify(state)),commit(){commits++;return true;}});
 const titles=()=>root.descendants.filter(x=>x.className==='df-title').map(x=>x.textContent);
 assert.equal(titles().length,100,'Large results must be DOM bounded; storage remains complete');
 const search=root.descendants.find(x=>x.tagName==='INPUT'&&x.type==='search');
 assert.ok(search);
 search.value='Legacy bulk task 999';search.dispatch('input');
 assert.deepEqual(titles(),['Legacy bulk task 999']);
 assert.equal(state.tasksList.length,1000);
 assert.equal(JSON.stringify(state),before);
 assert.equal(Object.hasOwn(state.tasksList[999],'date'),false);
 assert.equal(commits,0);studio.destroy();
});
