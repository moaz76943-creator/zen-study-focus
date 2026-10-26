'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const A=require('../../android/app/src/main/assets/web/analytics_core_v21.js');

const snapshot={sessionHistory:[
 {id:'study-real',date:'2026-10-26',domain:'study',minutes:20},
 {id:'read-real',date:'2026-10-26',domain:'read',minutes:35}
]};
const dates={today:'2026-10-26',startDate:'2026-10-26',endDate:'2026-10-26'};
const goals={study:30,read:50};

test('A study-only filter cannot misrepresent read goals as 0 percent progress',()=>{
 const before=JSON.stringify(snapshot);
 const r=A.buildReport(snapshot,{...dates,domain:'study',goals});
 assert.deepEqual(r.goals.byDomain,[{
  domain:'study',actualMinutes:20,targetMinutes:30,progress:66.67
 }]);
 assert.equal(r.goals.available,true);
 assert.equal(r.totals.sessions,1);
 assert.equal(r.totals.minutes,20);
 assert.equal(JSON.stringify(snapshot),before,'Original v21 history is untouched');
});

test('No goal for the selected domain means unavailable, not an unrelated zero progress target',()=>{
 const r=A.buildReport(snapshot,{...dates,domain:'sport',goals});
 assert.equal(r.goals.available,false);
 assert.deepEqual(r.goals.byDomain,[]);
 assert.equal(r.totals.sessions,0);
});

test('All-domain view and machine CSV remain unchanged',()=>{
 const r=A.buildReport(snapshot,{...dates,domain:'all',goals});
 assert.deepEqual(r.goals.byDomain,[
  {domain:'study',actualMinutes:20,targetMinutes:30,progress:66.67},
  {domain:'read',actualMinutes:35,targetMinutes:50,progress:70}
 ]);
 assert.equal(r.totals.minutes,55);
 assert.equal(A.toCSV(r).split(String.fromCharCode(13,10))[0],
  '"id","date","domain","minutes","startedAt","endedAt","timingVerified"');
});
