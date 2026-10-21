'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const core=require('../../docs/control-center/track15-core.js');
const HEAD='a'.repeat(40), OLD='b'.repeat(40);
const ledger=(sha)=>'<!-- DF_AGENT_LEDGER_V1\n'+JSON.stringify({
 schema_version:1,source_sha:sha,agent_ids:['timer','nature_audio','privacy_security'],
 records:{timer:{status:'SOURCE_TESTED',tests:2},nature_audio:{status:'SOURCE_TESTED',tests:3},privacy_security:{status:'SOURCE_TESTED',tests:4}}
})+'\nEND_DF_AGENT_LEDGER_V1 -->';
test('track15-01 previous-SHA source ledger is STALE and cannot certify master HEAD',()=>{
 const result=core.parseAgentLedger(ledger(OLD),HEAD);
 assert.equal(result.status,'STALE');
 assert.equal(result.agents[0].status,'STALE');
 assert.equal(result.sourceSha,OLD);
});
test('track15-02 exact-head agent results remain SOURCE_TESTED, never physical-device PASS',()=>{
 const result=core.parseAgentLedger(ledger(HEAD),HEAD);
 assert.equal(result.status,'SOURCE_TESTED');
 assert.equal(result.agents.length,3);
 assert.equal(result.agents[1].status,'SOURCE_TESTED');
 assert.equal(result.android,'NOT_TESTED');
 assert.equal(core.parseAgentLedger('garbage',HEAD).status,'NOT_TESTED');
});
test('track15-03 jobs from an exact-head run only; skipped jobs are NOT_TESTED',()=>{
 const jobs=[
  {name:'Node source tests',conclusion:'success',status:'completed'},
  {name:'Python regression',conclusion:'failure',status:'completed'},
  {name:'Android Gradle assemble',conclusion:'success',status:'completed'},
  {name:'Chromium smoke',conclusion:'skipped',status:'completed'}
 ];
 const result=core.classifyJobs(jobs,HEAD,HEAD);
 assert.equal(result.node,'PASS');assert.equal(result.python,'FAIL');
 assert.equal(result.androidBuild,'PASS');assert.equal(result.chromium,'NOT_TESTED');
 assert.equal(result.androidDevice,'NOT_TESTED');
 assert.equal(core.classifyJobs(jobs,OLD,HEAD).node,'NOT_TESTED');
});
test('track15-04 empty/unrecognized jobs cannot be elevated to PASS',()=>{
 const result=core.classifyJobs([{name:'Deploy site',conclusion:'success',status:'completed'}],HEAD,HEAD);
 for(const key of ['node','python','chromium','androidBuild','androidDevice'])assert.equal(result[key],'NOT_TESTED');
});
test('track15-05 API rate limits use Retry-After/Reset, avoid immediate retry loops',()=>{
 assert.equal(core.retryDelay(403,{'x-ratelimit-remaining':'0','x-ratelimit-reset':'1792580400'},1792580000000),400000);
 assert.equal(core.retryDelay(429,{'retry-after':'120'},0),120000);
 assert.ok(core.retryDelay(403,{},0)>=60000);
 assert.equal(core.retryDelay(500,{},0),0);
});
test('track15-06 artifacts do not fabricate APK binary fingerprints',()=>{
 const result=core.listArtifacts([{id:9,name:'android-debug-apk',size_in_bytes:128,expired:false,
  digest:'sha256:'+'c'.repeat(64)}],99,HEAD);
 assert.equal(result.length,1);assert.equal(result[0].kind,'APK_CANDIDATE');
 assert.equal(result[0].archiveSha256,'c'.repeat(64));
 assert.equal(result[0].binarySha256,null);
 assert.match(result[0].url,/actions\/runs\/99$/);
 assert.deepEqual(core.listArtifacts([{name:'fake',id:-1}],99,HEAD),[]);
});
test('track15-07 malformed SHA, injected body, and off-repo URLs are rejected',()=>{
 assert.equal(core.validSha('short'),null);
 assert.equal(core.parseAgentLedger('<script>bad</script>',HEAD).status,'NOT_TESTED');
 assert.equal(core.issueUrl(69),'https://github.com/moaz76943-creator/zen-study-focus/issues/69');
 assert.equal(core.issueUrl('https://evil.invalid'),null);
});
