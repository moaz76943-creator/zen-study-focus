'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const agent=require('../../tools/daily_maintenance/hourly_orchestrator.cjs');
const manifest={schema_version:1,agents:Array.from({length:12},(_,i)=>({id:'agent_'+i,lane:'lane_'+i,purpose:'test',test_dirs:['tests/suite_'+i]}))};
const sha='a'.repeat(40);
test('a four-hour rolling cycle covers all 12 specialists without duplicate execution',()=>{
 const seen=[];
 for(let hour=0;hour<4;hour++){
  const plan=agent.planCohort(manifest,'2026-10-20T'+String(hour).padStart(2,'0')+':23:00Z');
  assert.equal(plan.selected.length,3);
  seen.push(...plan.selected.map(a=>a.id));
 }
 assert.equal(new Set(seen).size,12);
});
test('adding a specialist increases the rotation without dropping existing agents',()=>{
 const expanded={...manifest,agents:manifest.agents.concat([{id:'new_screen',lane:'new_screen',purpose:'test',test_dirs:['tests/new_screen']}])};
 const seen=[];
 for(let hour=0;hour<5;hour++)seen.push(...agent.planCohort(expanded,'2026-10-20T'+String(hour).padStart(2,'0')+':23:00Z').selected.map(a=>a.id));
 assert.equal(new Set(seen).size,13);
});
test('reports preserve source SHA and fail closed on skipped or unverified checks',()=>{
 const report=agent.runCycle(manifest,{sourceSha:sha,now:'2026-10-20T02:23:00Z',run:a=>({id:a.id,lane:a.lane,status:a.id==='agent_7'?'SOURCE_PARTIAL':'SOURCE_TESTED',tests:2}),coverage:()=>({unmapped:['tests/new_feature/flow.test.cjs'],duplicates:[]})});
 assert.equal(report.source_sha,sha);
 assert.equal(report.status,'BLOCKED');
 assert.equal(report.agents.length,3);
 assert.deepEqual(report.coverage.unmapped,['tests/new_feature/flow.test.cjs']);
 assert.equal(report.release_approved,false);
 assert.equal(report.android_e2e,'NOT_TESTED');
});
test('fresh source commits are never labelled covered if tests are unmapped',()=>{
 const report=agent.runCycle(manifest,{sourceSha:sha,now:'2026-10-20T00:23:00Z',run:a=>({id:a.id,status:'SOURCE_TESTED',tests:1}),coverage:()=>({unmapped:['tests/new/one.test.cjs'],duplicates:[]})});
 assert.equal(report.status,'COVERAGE_GAP');
});
test('unexpected runner exceptions and missing checks are not green',()=>{
 const report=agent.runCycle(manifest,{sourceSha:sha,now:'2026-10-20T00:23:00Z',run:()=>{throw Error('broken')},coverage:()=>({unmapped:[],duplicates:[]})});
 assert.equal(report.status,'BLOCKED');
 assert.ok(report.agents.every(x=>x.status==='BLOCKED'));
});
test('bad SHA, bad timestamp, invalid manifest or untrusted coverage are rejected',()=>{
 assert.throws(()=>agent.runCycle(manifest,{sourceSha:'main'}),/SHA/);
 assert.throws(()=>agent.planCohort(manifest,'yesterday'),/UTC/);
 assert.throws(()=>agent.planCohort({...manifest,agents:[]},'2026-10-20T00:23:00Z'),/agents/);
 assert.throws(()=>agent.runCycle(manifest,{sourceSha:sha,now:'2026-10-20T00:23:00Z',run:()=>({status:'SOURCE_TESTED'}),coverage:()=>({unmapped:null,duplicates:[]})}),/coverage/);
});
test('markdown is a clear review artifact rather than claimed device validation',()=>{
 const report=agent.runCycle(manifest,{sourceSha:sha,now:'2026-10-20T00:23:00Z',run:a=>({id:a.id,status:'SOURCE_TESTED',tests:1}),coverage:()=>({unmapped:[],duplicates:[]})});
 assert.match(agent.toMarkdown(report),/Android E2E: NOT_TESTED/);
 assert.match(agent.toMarkdown(report),/RELEASE NOT APPROVED/);
 assert.match(agent.toMarkdown(report),/source SHA/);
});

test('cohorts include full agent inventory and SHA256 manifest fingerprint for cross-hour verification',()=>{
 const report=agent.runCycle(manifest,{sourceSha:sha,now:'2026-10-20T00:23:00Z',run:a=>({id:a.id,status:'SOURCE_TESTED',tests:1}),coverage:()=>({unmapped:[],duplicates:[]})});
 assert.deepEqual(report.agent_ids,manifest.agents.map(a=>a.id));
 assert.match(report.manifest_sha256,/^[a-f0-9]{64}$/);
 const changed={...manifest,agents:[...manifest.agents,{id:'agent_12',lane:'qa',purpose:'future feature',test_dirs:['tests/feature']}]};
 const changedReport=agent.runCycle(changed,{sourceSha:sha,now:'2026-10-20T00:23:00Z',run:a=>({id:a.id,status:'SOURCE_TESTED',tests:1}),coverage:()=>({unmapped:[],duplicates:[]})});
 assert.notEqual(changedReport.manifest_sha256,report.manifest_sha256);
});
