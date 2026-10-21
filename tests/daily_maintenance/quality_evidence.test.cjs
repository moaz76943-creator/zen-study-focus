'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {measure}=require('../../tools/daily_maintenance/quality_evidence.cjs');
const sha='a'.repeat(40);
const manifest={schema_version:1,agents:[{id:'timer'},{id:'nature_audio'},{id:'privacy_security'}]};
const healthy={schema_version:1,source_sha:sha,scope:'SOURCE_CODE_ONLY',unmapped_tests:[],agents:manifest.agents.map((a,i)=>({id:a.id,status:'SOURCE_TESTED',tests:i+1,cases:i+3,passed:i+3,skipped:0,todo:0}))};
test('quality measures executed TAP cases and uniquely owned source files, not reports',()=>{
 const m=measure(healthy,manifest,sha);
 assert.equal(m.specialists_passed,3);
 assert.equal(m.source_test_files,6);
 assert.equal(m.executed_cases,12);
 assert.equal(m.passed_cases,12);
 assert.match(m.manifest_sha256,/^[0-9a-f]{64}$/);
 assert.equal(m.release_approved,false);
 assert.equal(m.android_e2e,'NOT_TESTED');
});
test('stale candidate SHA never counts',()=>assert.throws(()=>measure(healthy,manifest,'b'.repeat(40)),/SHA/));
test('partial or empty TAP cases cannot inflate quality',()=>{
 for(const patch of [{status:'NOT_RUN'},{passed:0},{cases:0},{skipped:1},{todo:1},{tests:0}]){
  const r={...healthy,agents:[{...healthy.agents[0],...patch},...healthy.agents.slice(1)]};
  assert.throws(()=>measure(r,manifest,sha),/unverified|partial|invalid/i);
 }
});
test('missing or duplicate agents are rejected',()=>{
 assert.throws(()=>measure({...healthy,agents:healthy.agents.slice(1)},manifest,sha),/agents|inventory|missing/i);
 assert.throws(()=>measure({...healthy,agents:[healthy.agents[0],healthy.agents[0],healthy.agents[2]]},manifest,sha),/agents|duplicate|missing/i);
});
test('unowned tests and forged scope are blocked',()=>{
 assert.throws(()=>measure({...healthy,unmapped_tests:['tests/feature/new.test.cjs']},manifest,sha),/unowned|coverage/i);
 assert.throws(()=>measure({...healthy,scope:'ANDROID_E2E'},manifest,sha),/scope/i);
});
