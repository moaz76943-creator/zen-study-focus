'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

// Count real production Date construction in an isolated VM: this checks
// O(distinct dates) work, not a noisy millisecond threshold on a CI runner.
test('analytics report does not parse calendar dates for every row of the same day',()=>{
  const file=path.resolve(__dirname,'../../android/app/src/main/assets/web/analytics_recovery_core.js');
  let dateConstructions=0;
  class CountedDate extends Date {
    constructor(...args){super(...args);dateConstructions++;}
  }
  const root={};
  vm.runInNewContext(fs.readFileSync(file,'utf8'),{globalThis:root,Date:CountedDate},{filename:file,timeout:1000});
  const core=root.DeepFocusAnalyticsRecovery;
  assert.ok(core&&typeof core.buildReport==='function','Use the actual bundled recovery implementation');
  const rows=Array.from({length:1000},(_,i)=>({
    id:'performance-parity-'+i,date:'2026-10-20',minutes:25,domain:'study',
    mode:'focus',completed:true
  }));
  const report=core.buildReport({sessionHistory:rows},{today:'2026-10-22',
    startDate:'2026-10-19',endDate:'2026-10-22'});
  assert.equal(report.totals.sessions,1000);
  assert.equal(report.totals.minutes,25000);
  assert.ok(dateConstructions<200,
    'Calendar work should be bounded by distinct dates; observed '+dateConstructions+' Date constructions');
});
