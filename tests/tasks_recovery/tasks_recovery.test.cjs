'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../../android/app/src/main/assets/web/tasks_core_v21.js');
const base=()=>({cfg:{sessionHistory:[]},tasksList:[]});
const options={now:'2026-10-19T08:00:00.000Z',idSeed:100};
test('DF-105/109 quick capture keeps legacy fields and explicitly optional due date',()=>{
 const created=C.createTask(base(),{title:'  Write summary  '},options);
 assert.equal(created.task.title,'Write summary');
 assert.equal(created.task.date,'2026-10-19');
 assert.equal(created.task.dueAssigned,false);
 assert.deepEqual([created.task.id,created.task.catKey,created.task.done,created.task.isStarter],[100,'study',false,false]);
});
test('DF-111 explicit three picks have stable manual order and exclude starter/demo tasks',()=>{
 let state=base();
 for(const [id,title,isStarter] of [[1,'Alpha',false],[2,'Beta',false],[3,'Gamma',false],[4,'Demo',true]])state.tasksList.push({id,title,isStarter,date:'2026-10-19',catKey:'study',done:false});
 state=C.chooseTopThree(state,'2026-10-19',[3,1,2]);
 assert.deepEqual(C.topThree(state,'2026-10-19').map(t=>t.id),[3,1,2]);
 assert.throws(()=>C.chooseTopThree(state,'2026-10-19',[1,2,3,4]));
 assert.throws(()=>C.chooseTopThree(state,'2026-10-19',[1,1]));
});
test('DF-110 today/upcoming/overdue/completed are mutually exclusive',()=>{
 const state=base();
 state.tasksList=[
 {id:1,title:'no deadline',date:'2026-10-10',dueAssigned:false,done:false},
 {id:2,title:'today',date:'2026-10-19',done:false},
 {id:3,title:'future',date:'2026-10-20',done:false},
 {id:4,title:'late',date:'2026-10-18',done:false},
 {id:5,title:'finished',date:'2026-10-18',done:true},
 {id:6,title:'sample',date:'2026-10-18',done:false,isStarter:true},
 {id:7,title:'trash',date:'2026-10-18',done:false,deletedAt:'2026-10-18T00:00:00Z'}
 ];
 const r=C.taskSections(state,'2026-10-19');
 assert.deepEqual(Object.fromEntries(Object.entries(r).map(([k,v])=>[k,v.map(t=>t.id)])),{today:[1,2],upcoming:[3],overdue:[4],completed:[5]});
});
test('DF-114 weekdays recurrence skips Saturday/Sunday and is idempotent',()=>{
 let s=base();
 s.tasksList.push({id:3,title:'Weekday',date:'2026-10-23',catKey:'study',isStarter:false,done:false,repeat:{frequency:'weekdays',interval:1}});
 const once=C.setStatus(s,3,'completed',{now:'2026-10-23T12:00:00Z',idSeed:4});
 assert.equal(once.created.date,'2026-10-26');
 const twice=C.setStatus(once.state,3,'completed',{now:'2026-10-23T12:01:00Z',idSeed:5});
 assert.equal(twice.created,null);
 assert.equal(twice.state.tasksList.length,2);
});
test('DF-119 edit preserves opaque legacy keys, numeric id and v21 shape',()=>{
 const original={id:7,title:'Old',catKey:'review',date:'2026-10-19',done:false,isStarter:false,legacy:{deep:['keep']},opaqueKey:'keep'};
 const s={cfg:{odd:{x:1}},tasksList:[original]};
 const updated=C.updateTask(s,7,{title:'New'},options);
 assert.equal(updated.task.opaqueKey,'keep');
 assert.deepEqual(updated.task.legacy,{deep:['keep']});
 assert.equal(updated.task.id,7);
 assert.equal(updated.task.catKey,'review');
 assert.equal(updated.state.cfg.odd.x,1);
 assert.equal(s.tasksList[0].title,'Old');
});
test('DF-112/113/118 real focus totals dedupe replay and reject fake events',()=>{
 const s={cfg:{sessionHistory:[
  {id:'focus1',taskId:1,date:'2026-10-19',minutes:25,completed:true,mode:'focus'},
  {id:'focus1',taskId:1,date:'2026-10-19',minutes:25,completed:true,mode:'focus'},
  {id:'break1',taskId:1,date:'2026-10-19',minutes:30,completed:true,mode:'break'},
  {id:'unfinished',taskId:1,date:'2026-10-19',minutes:10,completed:false,mode:'focus'},
  {id:'focus2',taskId:2,date:'2026-10-19',minutes:40,completed:true,mode:'focus'}
 ]},tasksList:[{id:1,estimateMin:50},{id:2,estimateMin:0}]};
 assert.deepEqual(C.compareEstimate(s,1),{estimateMin:50,actualMin:25,deltaMin:-25});
});
test('DF-115 project progress excludes starter and trashed tasks',()=>{
 const s={cfg:{taskProjectsV21:[{id:99,name:'Work'}]},tasksList:[
  {id:1,projectId:99,title:'a',done:true},
  {id:2,projectId:99,title:'b',done:false},
  {id:3,projectId:99,title:'demo',done:true,isStarter:true},
  {id:4,projectId:99,title:'gone',done:true,deletedAt:'now'}]};
 assert.deepEqual(C.projectProgress(s,99),{total:2,completed:1,percent:50});
});
test('DF-120 handles 1000 legacy tasks without changing input',()=>{
 const s=base();for(let n=1;n<=1000;n++)s.tasksList.push({id:n,title:'Task '+n,date:'2026-10-19',catKey:'study',done:n%2===0,isStarter:false,unrecognized:{data:n}});
 const before=JSON.stringify(s);
 assert.equal(C.taskSections(s,'2026-10-19').completed.length,500);
 assert.equal(JSON.stringify(s),before);
});
test('DF-105 local calendar day remains correct around UTC midnight',()=>{
 const item=C.createTask(base(),{title:'Local day'},{now:'2026-10-18T22:10:00Z',today:'2026-10-19',idSeed:500}).task;
 assert.equal(item.date,'2026-10-19');
 assert.equal(item.dueAssigned,false);
 assert.equal(C.isOverdue(item,'2026-10-20'),false);
});
test('DF-114 weekday recurrence is safe across DST transition dates',()=>{
 const s={cfg:{},tasksList:[{id:1,title:'Weekday',date:'2026-03-27',done:false,isStarter:false,catKey:'study',repeat:{frequency:'weekdays',interval:1}}]};
 const result=C.setStatus(s,1,'completed',{now:'2026-03-27T10:00:00Z',idSeed:2});
 assert.equal(result.created.date,'2026-03-30');
 assert.equal(s.tasksList[0].done,false);
});
test('DF-113 excludes conflicting duplicate session IDs in calculated focus time',()=>{
 const s={cfg:{sessionHistory:[
  {id:'x',completed:true,mode:'focus',taskId:8,minutes:25,date:'2026-10-19'},
  {id:'x',completed:true,mode:'focus',taskId:8,minutes:30,date:'2026-10-19'}
 ]},tasksList:[{id:8,title:'Real'}]};
 assert.equal(C.actualFocusMinutes(s,8),0);
});
