import test from 'node:test';
import assert from 'node:assert/strict';
import {eligibleForRole,validateRoleDiff,ROLES} from '../../tools/ai_agents/oss_policy.mjs';
const task=(role='aider',extra={})=>({state:'open',title:ROLES[role].prefix+' improve focused parser',labels:['agent-ready','agent-safe'],...extra});
test('select only own role and eligible safe open issues',()=>{
 assert.equal(eligibleForRole(task(),'aider'),true);
 assert.equal(eligibleForRole(task('qwen'),'aider'),false);
 for(const diff of [{state:'closed'},{labels:['agent-ready']},{labels:['agent-ready','agent-safe','p0']},{pull_request:{url:'pr'}}]){
  assert.equal(eligibleForRole(task('aider',diff),'aider'),false);
 }
});
test('allow narrow source+test only, no external files, raw assets, Android or workflow',()=>{
 const a=[{status:'M',path:'tools/daily_maintenance/evidence_integrity_guard.cjs',added:12,deleted:7},{status:'M',path:'tests/integration_quality/evidence_integrity_guard.test.cjs',added:25,deleted:0}];
 assert.deepEqual(validateRoleDiff('aider',a),{files:2,lines:44});
 for(const path of ['android/app/src/main/assets/web/app.js','.github/workflows/ci.yml','tools/i18n/integrator/review_approvals.json','tools/i18n/integrator/../inventory/index.cjs']){
  assert.throws(()=>validateRoleDiff('aider',[a[1],{...a[0],path}]),/Outside/);
 }
 assert.throws(()=>validateRoleDiff('aider',[a[0]]),/2–3/);
 assert.throws(()=>validateRoleDiff('aider',[a[0],{...a[1],added:240}]),/Too many/);
 assert.throws(()=>validateRoleDiff('aider',[a[0],{...a[1],added:NaN}]),/Invalid/);
});
test('Qwen role independent from Aider files',()=>{
 assert.deepEqual(validateRoleDiff('qwen',[
 {status:'M',path:'tools/i18n/inventory/index.cjs',added:2,deleted:3},
 {status:'M',path:'tests/i18n/inventory/inventory.test.cjs',added:8,deleted:0}
 ]),{files:2,lines:13});
 assert.throws(()=>validateRoleDiff('qwen',[{status:'M',path:'tools/daily_maintenance/evidence_integrity_guard.cjs',added:1,deleted:0},{status:'M',path:ROLES.qwen.test,added:1,deleted:0}]),/Outside/);
});
