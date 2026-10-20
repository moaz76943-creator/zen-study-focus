'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {summarizeRuns}=require('../../tools/daily_maintenance/ci_triage.cjs');
const SHA='a'.repeat(40),OLD='b'.repeat(40);
const run=(id,sha,conclusion,status='completed')=>({id,head_sha:sha,conclusion,status,name:'Recovery checks',html_url:'https://github.com/owner/repo/actions/runs/'+id});
test('current SHA failures remain BLOCKED with real run links and never counted as PASS',()=>{
 const r=summarizeRuns([run(1,SHA,'failure'),run(2,SHA,'success'),run(3,SHA,'timed_out')],SHA);
 assert.equal(r.current_failed.length,2);
 assert.equal(r.current_success.length,1);
 assert.equal(r.source_sha,SHA);
 assert.match(r.markdown,/runs\/1/);
 assert.match(r.markdown,/runs\/3/);
 assert.match(r.markdown,/SOURCE CI: BLOCKED/);
});
test('stale source SHA failures are separated from active source and cancelled runs are informational',()=>{
 const r=summarizeRuns([run(1,OLD,'failure'),run(2,SHA,'cancelled'),run(3,SHA,null,'queued')],SHA);
 assert.equal(r.current_failed.length,0);
 assert.equal(r.stale_failed.length,1);
 assert.equal(r.not_verified.length,2);
 assert.match(r.markdown,/NOT VERIFIED/);
 assert.doesNotMatch(r.markdown,/SOURCE CI: PASS/);
});
test('no GitHub Actions history cannot be interpreted as green or device success',()=>{
 const r=summarizeRuns([],SHA);
 assert.equal(r.verification,'NOT_TESTED');
 assert.match(r.markdown,/NOT TESTED/);
 assert.match(r.markdown,/Android E2E: NOT_TESTED/);
});
test('deduplicates workflow IDs, validates SHA and rejects malformed input safely',()=>{
 assert.throws(()=>summarizeRuns([], 'HEAD'),/sha/i);
 const r=summarizeRuns([run(8,SHA,'failure'),run(8,SHA,'success'),null,{id:9,head_sha:SHA,conclusion:'success',html_url:'javascript:alert(1)'}],SHA);
 assert.equal(r.current_failed.length,1);
 assert.equal(r.current_success.length,0);
 assert.doesNotMatch(r.markdown,/javascript:/);
});
