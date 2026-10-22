'use strict';
// Exact JSON semantics guard across original PR #138 and performance patch.
// CLI: node tests/performance_recovery/track17_analytics_parity.cjs <baseline-root> <candidate-root>
const assert=require('node:assert/strict');
const path=require('node:path');
const roots=process.argv.slice(2,4);
assert.equal(roots.length,2,'Provide immutable baseline and candidate checkout directories');
const modulePath=root=>path.resolve(root,'android/app/src/main/assets/web/analytics_recovery_core.js');
const baseline=require(modulePath(roots[0]));
const candidate=require(modulePath(roots[1]));
let comparisons=0;
for(const size of [0,1,10,500,10000]){
  const sessions=Array.from({length:size},(_,i)=>({
    id:'verified-'+i,date:['2026-10-19','2026-10-18','2026-10-12','2026-09-20'][i%4],
    minutes:[25,10,60,0][i%4],domain:['study','read','work','sport'][i%4],
    mode:'focus',completed:true,taskId:i%7===0?7:null
  }));
  if(size>10){
    sessions[2]={...sessions[1],id:sessions[1].id,minutes:90}; // Conflicting duplicate ID.
    sessions[3]={...sessions[3],isStarter:true}; // Excluded sample.
    sessions[4]={...sessions[4],date:'2026-02-30'}; // Calendar-invalid date.
  }
  const state={
    sessionHistory:sessions,
    tasksList:[{id:7,title:'Owned project'}, {id:8,title:'Unused'}],
    goalSnapshots:[{date:'2026-10-19',domain:'study',targetMinutes:90}],
    cfg:{}
  };
  const original=JSON.stringify(state);
  for(const domain of ['all','study','work']){
    for(const startDate of ['2026-10-19','2026-10-01','2026-09-01']){
      const options={today:'2026-10-19',startDate,endDate:'2026-10-19',domain};
      const b=baseline.buildReport(state,options),c=candidate.buildReport(state,options);
      assert.deepEqual(c,b,'Exact analytics output differs for '+JSON.stringify({size,domain,startDate}));
      for(const format of ['sessions','daily','weekly','monthly']){
        assert.equal(candidate.toCSV(c,format),baseline.toCSV(b,format));
      }
      assert.equal(JSON.stringify(state),original,'Analytics must not write any source record');
      comparisons++;
    }
  }
}
console.log(JSON.stringify({status:'PASS',kind:'track17-exact-json-and-csv-parity',comparisons,
  sizes:[0,1,10,500,10000],categories:['all','study','work'],
  results:'outputs and CSV byte-for-byte match baseline; input data unchanged',
  baselineRoot:path.resolve(roots[0]),candidateRoot:path.resolve(roots[1])}));
