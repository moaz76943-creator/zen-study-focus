'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const Analytics=require('../../android/app/src/main/assets/web/analytics_core_v21.js');

const dates={today:'2026-10-26',startDate:'2026-10-26',endDate:'2026-10-26'};
test('Historical goals must never count sample/demo/fixture snapshots as real targets',()=>{
  const history=[{id:42,date:'2026-10-26',domain:'study',minutes:22,source:'user'}];
  const goalSnapshots=[
    {date:'2026-10-26',domain:'study',targetMinutes:990,source:' SAMPLE '},
    {date:'2026-10-26',domain:'study',targetMinutes:800,source:' dEmO '},
    {date:'2026-10-26',domain:'study',targetMinutes:600,source:' Fixture '},
    {date:'2026-10-26',domain:'study',targetMinutes:500,isStarter:true},
    {date:'2026-10-26',domain:'study',targetMinutes:400,isDemo:true},
    {date:'2026-10-26',domain:'study',targetMinutes:300,synthetic:true},
    {date:'2026-10-26',domain:'study',targetMinutes:44,source:'user'}
  ];
  const snapshot={sessionHistory:history,goalSnapshots};
  const original=JSON.stringify(snapshot);
  const report=Analytics.buildReport(snapshot,dates);
  assert.deepEqual(report.historicalGoals.byDomain,[{
    domain:'study',actualMinutes:22,targetMinutes:44,coverageDays:1,progress:50
  }]);
  assert.equal(report.historicalGoals.snapshotDays,1);
  assert.equal(report.totals.minutes,22);
  assert.equal(report.totals.sessions,1);
  assert.equal(Analytics.toCSV(report,'sessions').split('\r\n').length,3);
  assert.equal(JSON.stringify(snapshot),original,'Must not rewrite owner history or original goal snapshots');
});
test('Only synthetic historical targets means goal history unavailable, not fabricated 0% or 100%',()=>{
  const history=[{id:7,date:'2026-10-26',domain:'read',minutes:15}];
  const report=Analytics.buildReport({sessionHistory:history,goalSnapshots:[
    {date:'2026-10-26',domain:'read',targetMinutes:30,source:' Demo '},
    {date:'2026-10-26',domain:'study',targetMinutes:60,isDemo:true}
  ]},dates);
  assert.equal(report.historicalGoals.available,false);
  assert.deepEqual(report.historicalGoals.byDomain,[]);
  assert.equal(report.historicalGoals.snapshotDays,0);
  assert.equal(report.totals.minutes,15);
});
