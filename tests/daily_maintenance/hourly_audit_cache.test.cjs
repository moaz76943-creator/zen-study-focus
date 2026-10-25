'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {planKnownFailureSkip}=require('../../tools/daily_maintenance/hourly_audit_cache.cjs');
const sha='a'.repeat(40),hash='b'.repeat(64),now=Date.parse('2026-10-25T19:00:00Z');
const ledger={source_sha:sha,manifest_sha256:hash,checked_at:'2026-10-25T18:00:00Z',overall:'COVERAGE_GAP'};
test('unchanged exact source and manifest with recent known coverage gap avoids costly repeat',()=>{
 assert.equal(planKnownFailureSkip(ledger,sha,hash,now).skip,true);
 assert.equal(planKnownFailureSkip({...ledger,overall:'BLOCKED'},sha,hash,now).skip,true);
});
test('skip is forbidden when code, QA manifest, or clock validity differs',()=>{
 for(const state of [null,{...ledger,source_sha:'c'.repeat(40)},{...ledger,manifest_sha256:'d'.repeat(64)},
  {...ledger,checked_at:'garbage'},{...ledger,checked_at:'2026-10-25T20:00:00Z'},
  {...ledger,checked_at:'2026-10-25T06:00:00Z'},{...ledger,overall:'FULL_SOURCE_CYCLE_PASS'},
  {...ledger,overall:'INCOMPLETE'}])
   assert.equal(planKnownFailureSkip(state,sha,hash,now).skip,false);
});
test('hourly schedule may reuse only a blocked source on schedule, never assert cached PASS',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const yml=fs.readFileSync(path.resolve(__dirname,'../../.github/workflows/hourly_agent_orchestrator.yml'),'utf8');
 assert.match(yml,/hourly_audit_cache\.cjs/);
 assert.match(yml,/github\.event_name === 'schedule'/);
 assert.match(yml,/steps\.cachecheck\.outputs\.skip != 'true'/);
 assert.match(yml,/KNOWN_FAILURE_UNCHANGED_SOURCE/);
});
