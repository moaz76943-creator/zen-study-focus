'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const A=require('../../android/app/src/main/assets/web/analytics_core_v21.js');

test('Demo, sample and synthetic projects cannot appear as real Analytics project progress',()=>{
 const data={
  sessionHistory:[{id:'session',date:'2026-10-26',domain:'study',minutes:15}],
  tasksList:[
   {id:1,title:'real task on a demo project',done:true,projectId:11},
   {id:2,title:'real task on a sample project',done:false,projectId:12},
   {id:3,title:'real task on a synthetic project',done:false,projectId:13},
   {id:4,title:'real task on a starter project',done:true,projectId:14},
   {id:5,title:'real task on a fixture project',done:true,projectId:15},
   {id:6,title:'genuine user task',done:true,projectId:16}
  ],
  projects:[
   {id:11,name:'fake demo',isDemo:true},
   {id:12,name:'fake sample',source:'sample'},
   {id:13,name:'fake synthetic',synthetic:true},
   {id:14,name:'fake starter',isStarter:true},
   {id:15,name:'fake fixture',source:'fixture'},
   {id:16,name:'genuine user project',source:'user'}
  ]
 };
 const frozen=JSON.stringify(data);
 const r=A.buildReport(data,{today:'2026-10-26',startDate:'2026-10-26',endDate:'2026-10-26'});
 assert.equal(r.tasks.total,6,'Valid authored tasks remain counted even when they reference demo projects');
 assert.deepEqual(r.tasks.projects,[{id:16,name:'genuine user project',total:1,completed:1}]);
 assert.deepEqual(r.totals,{minutes:15,sessions:1,averageMinutes:15});
 assert.equal(JSON.stringify(data),frozen,'Analytics must not mutate stored v21 data');
 assert.equal(A.toCSV(r).split(String.fromCharCode(13,10))[0],'"id","date","domain","minutes","startedAt","endedAt","timingVerified"');
});

test('Projects using source=demo are excluded even without legacy isDemo flag',()=>{
 const p=A.taskReport([{id:3,title:'real',done:false,projectId:30}],
   [{id:30,name:'old demo factory project',source:'demo'}],'2026-10-26');
 assert.equal(p.total,1);
 assert.deepEqual(p.projects,[]);
});
