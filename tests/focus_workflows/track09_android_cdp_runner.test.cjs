'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const runner=fs.readFileSync(path.join(__dirname,'track09_android_cdp.sh'),'utf8');
test('TRACK09 RED: own goal-calendar CDP evidence is not blocked by earlier global timer smoke',()=>{
 const goal=runner.indexOf('node tests/focus_workflows/track09_android_cdp.cjs');
 const legacy=runner.indexOf('node tests/android_e2e_recovery/cdp_dom_smoke.cjs');
 assert.ok(goal>=0,'The Track09-specific read-only CDP probe must run');
 assert.ok(legacy<0 || goal<legacy,
  'An unrelated timer CDP probe must not fail before Goals/Calendar inspection can run');
});
test('TRACK09 RED: no legacy CDP timeout can silently turn a failing probe into PASS',()=>{
 assert.match(runner,/set -euo pipefail/);
 assert.doesNotMatch(runner,/node tests\/focus_workflows\/track09_android_cdp\.cjs[^\n]*\|\| true/);
 assert.match(runner,/TRACK09_SOURCE_SHA=.*git rev-parse HEAD/);
});
