'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const hourly=require('../../tools/daily_maintenance/hourly_orchestrator.cjs');
const ledger=require('../../tools/daily_maintenance/cohort_ledger.cjs');

const sha='a'.repeat(40), newer='b'.repeat(40), hash='c'.repeat(64);
const manifest={schema_version:1,agents:[
 {id:'agent_zero',lane:'qa',purpose:'contract',test_dirs:['tests/zero']},
 {id:'agent_one',lane:'qa',purpose:'contract',test_dirs:['tests/one']},
 {id:'agent_two',lane:'qa',purpose:'contract',test_dirs:['tests/two']}
]};
const good=()=>({status:'SOURCE_TESTED',tests:1,cases:1,passed:1,skipped:0,todo:0});
const inventory=()=>({unmapped:[],duplicates:[]});
function cycle({sourceSha=sha,now='2026-10-22T00:23:00.000Z',run=good,coverage=inventory}={}){
 return hourly.runCycle(manifest,{sourceSha,now,run,coverage});
}

test('falsely green agent without passing TAP cases must block hourly cohort',()=>{
 const r=cycle({run:()=>({status:'SOURCE_TESTED',tests:1,cases:0,passed:0,skipped:0,todo:0})});
 assert.notEqual(r.status,'COHORT_PASS');
 assert.ok(r.agents.every(a=>a.status!=='SOURCE_TESTED'));
});
test('falsely green agent with skipped TAP cases must block hourly cohort',()=>{
 const r=cycle({run:()=>({status:'SOURCE_TESTED',tests:1,cases:2,passed:1,skipped:1,todo:0})});
 assert.equal(r.status,'BLOCKED');
});
test('missing TAP metadata must not count as verified source PASS',()=>{
 const r=cycle({run:()=>({status:'SOURCE_TESTED',tests:1})});
 assert.equal(r.status,'BLOCKED');
});
test('hourly cohort reports verified tests separately from Android checks',()=>{
 const r=cycle();
 assert.equal(r.status,'COHORT_PASS');
 assert.equal(r.android_e2e,'NOT_TESTED');
 assert.equal(r.release_approved,false);
 assert.equal(ledger.aggregate(null,r).overall,'FULL_SOURCE_CYCLE_PASS');
 assert.equal(ledger.aggregate(null,r).android_e2e,'NOT_TESTED');
});

test('ledger refuses contradicted overall status even with green agent rows',()=>{
 const altered={...cycle(),status:'BLOCKED'};
 assert.throws(()=>ledger.aggregate(null,altered),/status|inconsistent|cohort/i);
});
test('ledger refuses all-pass claim with zero tested source files',()=>{
 const altered=cycle();
 altered.agents[0]={...altered.agents[0],tests:0};
 assert.throws(()=>ledger.aggregate(null,altered),/test|evidence|TAP/i);
});
test('ledger refuses old or partial evidence being silently promoted to full pass',()=>{
 const stale={...cycle(),status:'COHORT_PASS'};
 stale.agents[0]={...stale.agents[0],status:'SOURCE_PARTIAL'};
 assert.throws(()=>ledger.aggregate(null,stale),/status|inconsistent/i);
});
test('after interruption no previous exact-SHA PASS can be reused for a new SHA',()=>{
 const first=ledger.aggregate(null,cycle());
 const partial=cycle({sourceSha:newer,run:()=>({status:'BLOCKED',tests:0,reason:'interrupted'})});
 const result=ledger.aggregate(first,partial);
 assert.equal(result.source_sha,newer);
 assert.equal(result.full_source_cycle_pass,false);
 assert.equal(result.overall,'BLOCKED');
 assert.equal(result.android_e2e,'NOT_TESTED');
});
test('workflow QA contract gate includes manifest ledger and integrity tests, preserves exact-SHA verification',()=>{
 const workflow=fs.readFileSync(path.resolve(__dirname,'../../.github/workflows/hourly_agent_orchestrator.yml'),'utf8');
 assert.match(workflow,/qa\/hourly-agent-recovery-20261022/);
 assert.match(workflow,/tools\/daily_maintenance\/agents\.json/);
 assert.match(workflow,/tools\/daily_maintenance\/cohort_ledger\.cjs/);
 assert.match(workflow,/tests\/daily_maintenance\/hourly_evidence_integrity\.test\.cjs/);
 assert.match(workflow,/report\.source_sha !== sha/);
 assert.match(workflow,/policy\.verifyCanonicalPr\(data,owner\+'\/'\+repo,process\.env\.SOURCE_REF,sha\)/);
 assert.match(workflow,/NOT_VERIFIED/);
});
