'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const A=require('../../android/app/src/main/assets/web/analytics_core_v21.js');

const date='2026-10-26',domain='study';
const row=(id,minutes,other={})=>({id,date,domain,minutes,...other});
test('Analytics does not credit interrupted, cancelled or rest records, and a rejected ID never masks a genuine completion',()=>{
  const history=[
    row('same',90,{completed:false}),
    row('cancelled',50,{status:'cancelled'}),
    row('rest',30,{mode:'rest'}),
    row('paused',20,{status:'paused'}),
    row('break',25,{phase:'rest'}),
    row('sample',600,{isDemo:true}),
    row('same',15,{completed:true,status:'completed'}),
    row('legacy',4)
  ];
  const original=JSON.stringify(history);
  const report=A.buildReport({sessionHistory:history},{today:date,startDate:date,endDate:date});
  assert.deepEqual(report.sessions.map(x=>x.id),['same','legacy']);
  assert.deepEqual(report.totals,{minutes:19,sessions:2,averageMinutes:9.5});
  assert.equal(report.quality.duplicates,0);
  assert.equal(report.quality.excluded,6);
  assert.equal(report.quality.samples,1);
  assert.equal(A.toCSV(report).trim().split('\r\n').length,3);
  assert.equal(JSON.stringify(history),original);
});
test('Only explicit non-focus markers are removed; legacy completed records remain valid and genuine duplicate IDs count once',()=>{
  const h=[
    row(1,7),row('1',8),
    row('incomplete',44,{isComplete:false}),
    row('failed',50,{status:'failed'}),
    row('zero',0,{completed:true}),
    row(1,900,{completed:true})
  ];
  const r=A.normalizeSessions(h);
  assert.deepEqual(r.sessions.map(x=>x.id),[1,'1','zero']);
  assert.equal(r.duplicates,1);
  assert.equal(r.sessions.reduce((n,x)=>n+x.minutes,0),15);
});
