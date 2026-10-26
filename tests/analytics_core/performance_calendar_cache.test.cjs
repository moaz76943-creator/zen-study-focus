'use strict';
// Track 17: deterministic work-bound performance regression on the current v21 core.
// Node/source evidence only; it is not an Android speed measurement.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const source=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/assets/web/analytics_core_v21.js'),'utf8');
function instrumentedCore(){
  let dateConstructions=0;
  class CountedDate extends Date {
    constructor(...args){super(...args);dateConstructions++;}
    static parse(...args){return Date.parse(...args);}
  }
  const moduleObj={exports:{}};
  new Function('Date','module','exports',source)(CountedDate,moduleObj,moduleObj.exports);
  return {core:moduleObj.exports,getDateConstructions:()=>dateConstructions};
}
test('10,000 sessions with 30 credited dates require bounded calendar parsing',()=>{
  const {core,getDateConstructions}=instrumentedCore();
  const history=Array.from({length:10000},(_,i)=>({
    id:i+1,
    date:'2026-09-'+String(i%30+1).padStart(2,'0'),
    minutes:i%50+1,
    domain:['study','work','read','sport'][i%4]
  }));
  const initial=JSON.stringify(history);
  const report=core.buildReport({sessionHistory:history},{
    today:'2026-10-19',startDate:'2026-09-01',endDate:'2026-09-30'
  });
  assert.deepEqual(report.totals,{minutes:255000,sessions:10000,averageMinutes:25.5});
  assert.deepEqual(report.weekly.map(w=>w.sessions),[2004,2335,2331,2331,999]);
  assert.equal(report.daily.length,30);
  assert.equal(report.quality.excluded,0);
  assert.equal(JSON.stringify(history),initial,'read-only report must not mutate v21 data');
  assert.ok(getDateConstructions()<1000,
    'repeated credited dates must be validated and bucketed once per report, not once per session');
  const csv=core.toCSV(report,'sessions');
  assert.equal(csv.split('\r\n').length,10002);
});
test('cached validation preserves invalid-date rejection and duplicate semantics',()=>{
  const {core}=instrumentedCore();
  const history=[
    {id:'a',date:'2026-02-30',minutes:4,domain:'study'},
    {id:'a',date:'2026-10-18',minutes:8,domain:'study'},
    {id:'a',date:'2026-10-18',minutes:8,domain:'study'},
    {id:'b',date:'2026-10-19',minutes:0,domain:'read'},
    {id:'c',date:null,minutes:9,domain:'work'},
    {id:'d',date:'2026-10-18',minutes:15,domain:'work'}
  ];
  const report=core.buildReport({sessionHistory:history},{
    today:'2026-10-19',startDate:'2026-10-17',endDate:'2026-10-19'
  });
  assert.equal(report.totals.minutes,23);
  assert.equal(report.totals.sessions,3);
  assert.equal(report.quality.duplicates,1);
  assert.equal(report.quality.invalid,2);
});
