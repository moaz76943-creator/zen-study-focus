'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const A=require('../../android/app/src/main/assets/web/analytics_core_v21.js');

const history=[
 {id:'today',date:'2026-10-26',domain:'study',minutes:12},
 {id:'yesterday',date:'2026-10-25',domain:'study',minutes:8},
 {id:'this-week',date:'2026-10-20',domain:'read',minutes:5},
 {id:'prior',date:'2026-10-19',domain:'study',minutes:30},
 {id:'prior-2',date:'2026-10-18',domain:'study',minutes:9},
 {id:'prior-3',date:'2026-10-13',domain:'study',minutes:10},
 {id:'older',date:'2026-10-12',domain:'study',minutes:2},
 {id:'yesterday',date:'2026-10-25',domain:'study',minutes:800},
 {id:'cancelled',date:'2026-10-26',domain:'study',minutes:900,status:'cancelled'},
 {id:'rest',date:'2026-10-26',domain:'study',minutes:700,mode:'rest'},
 {id:'demo',date:'2026-10-26',domain:'study',minutes:600,isDemo:true}
];
const params={today:'2026-10-26',startDate:'2026-10-10',endDate:'2026-10-26'};
test('Truthful 1/7/30-day dashboard and adjacent 7-day comparison use normalized real credited calendar dates',()=>{
 const before=JSON.stringify(history);
 const r=A.buildReport({sessionHistory:history},params);
 assert.deepEqual(r.dashboard.today,{minutes:12,sessions:1,averageMinutes:12});
 assert.deepEqual(r.dashboard.last7,{minutes:25,sessions:3,averageMinutes:8.33});
 assert.equal(r.dashboard.last30.minutes,76);
 assert.equal(r.comparison.current.minutes,25);
 assert.equal(r.comparison.previous.minutes,49);
 assert.equal(r.comparison.changeMinutes,-24);
 assert.equal(r.comparison.changePercent,-48.98);
 assert.equal(r.quality.duplicates,1);
 assert.equal(JSON.stringify(history),before);
});
test('Domain and selected report end control comparison while today-presets stay anchored to local today',()=>{
 const r=A.buildReport({sessionHistory:history},{...params,domain:'study',endDate:'2026-10-20'});
 assert.equal(r.comparison.current.minutes,39);
 assert.equal(r.comparison.previous.minutes,12);
 assert.equal(r.dashboard.last7.minutes,20);
 assert.equal(r.totals.minutes,51);
});
test('Zero previous week has no invented infinity growth percentage',()=>{
 const r=A.buildReport({sessionHistory:[{id:1,date:'2026-10-26',minutes:2,domain:'study'}]},{
   today:'2026-10-26',startDate:'2026-10-26',endDate:'2026-10-26'
 });
 assert.equal(r.comparison.previous.minutes,0);
 assert.equal(r.comparison.changeMinutes,2);
 assert.equal(r.comparison.changePercent,null);
});
test('Original dated goal snapshots count only covered dates, never extrapolate current mutable goals',()=>{
 const goalSnapshots=[
  {date:'2026-10-25',domain:'study',targetMinutes:20},
  {date:'2026-10-26',domain:'study',targetMinutes:15},
  {date:'2026-10-26',domain:'read',targetMinutes:10},
  {date:'2026-10-26',domain:'study',targetMinutes:900},
  {date:'2026-10-12',domain:'study',targetMinutes:22},
  {date:'2026-10-20',domain:'study',targetMinutes:0},
  {date:'fake',domain:'study',targetMinutes:900},
 ];
 const before=JSON.stringify(goalSnapshots);
 const r=A.buildReport({sessionHistory:history,goalSnapshots},{...params,startDate:'2026-10-25'});
 assert.equal(r.historicalGoals.available,true);
 assert.equal(r.historicalGoals.snapshotDays,2);
 assert.deepEqual(r.historicalGoals.byDomain,[{domain:'study',actualMinutes:20,targetMinutes:35,coverageDays:2,progress:57.14},
 {domain:'read',actualMinutes:0,targetMinutes:10,coverageDays:1,progress:0}]);
 assert.equal(JSON.stringify(goalSnapshots),before);
 const noHistory=A.buildReport({sessionHistory:history},{...params,goals:{study:999}});
 assert.equal(noHistory.historicalGoals.available,false);
 assert.equal(noHistory.historicalGoals.snapshotDays,0);
});
