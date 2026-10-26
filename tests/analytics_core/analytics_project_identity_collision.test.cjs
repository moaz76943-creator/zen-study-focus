'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const A=require('../../android/app/src/main/assets/web/analytics_core_v21.js');

test('Ambiguous real project IDs never attribute task progress to whichever record appears first',()=>{
 const tasks=[
  {id:101,title:'real task with ambiguous project',done:true,projectId:70},
  {id:102,title:'real task with good project',done:false,projectId:71}
 ];
 const projects=[
  {id:70,name:'Project A'},
  {id:70,name:'Project B'},
  {id:71,name:'Genuine unique'}
 ];
 const input=JSON.stringify({tasks,projects});
 const result=A.taskReport(tasks,projects,'2026-10-26');
 assert.equal(result.total,2);
 assert.equal(result.completed,1);
 assert.deepEqual(result.projects,[{id:71,name:'Genuine unique',total:1,completed:0}]);
 assert.equal(JSON.stringify({tasks,projects}),input);
});

test('Project identity is typed and demo IDs do not obscure legitimate project links',()=>{
 const tasks=[{id:1,title:'task',done:true,projectId:20}];
 const projects=[
  {id:'20',name:'String project, a separate identity'},
  {id:20,name:'Numeric original'},
  {id:20,name:'Synthetic duplicate to ignore',isDemo:true}
 ];
 const result=A.taskReport(tasks,projects,'2026-10-26');
 assert.deepEqual(result.projects,[
  {id:'20',name:'String project, a separate identity',total:0,completed:0},
  {id:20,name:'Numeric original',total:1,completed:1}
 ]);
});

test('Identical repeated project IDs also fail closed rather than inventing project attribution',()=>{
 const p=A.taskReport([{id:1,title:'real task',done:false,projectId:6}],
  [{id:6,name:'Duplicated'}, {id:6,name:'Duplicated'}],'2026-10-26');
 assert.equal(p.total,1);
 assert.deepEqual(p.projects,[]);
});
