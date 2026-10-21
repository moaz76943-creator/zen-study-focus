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
test('track15-02 partial agent evidence retains individual SOURCE_TESTED without certifying the cycle',()=>{
 const result=core.parseAgentLedger(ledger(HEAD),HEAD);
 assert.equal(result.status,'NOT_TESTED'); // only 3/12 agents were supplied
 assert.equal(result.agents.length,12);
 assert.equal(result.agents.find(x=>x.id==='nature_audio').status,'SOURCE_TESTED');
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

test('track15-08 generic GitHub job proves only its actually executed named test steps',()=>{
 const jobs=[{name:'Source QA and report',status:'completed',conclusion:'success',
  steps:[
   {name:'Node.js 22',status:'completed',conclusion:'success'},
   {name:'Control Center regression tests',status:'completed',conclusion:'success'},
   {name:'Desktop Chrome smoke test of portable file',status:'completed',conclusion:'success'},
   {name:'Python regression suite',status:'completed',conclusion:'skipped'}
  ]}];
 const status=core.classifyJobs(jobs,HEAD,HEAD);
 assert.equal(status.node,'PASS');
 assert.equal(status.chromium,'PASS');
 assert.equal(status.python,'NOT_TESTED');
 assert.equal(status.androidBuild,'NOT_TESTED');
});
test('track15-09 a named failing step overrides a generic completed job and setup is not proof',()=>{
 const fail=core.classifyJobs([{name:'Source QA and report',conclusion:'failure',status:'completed',
  steps:[{name:'Node.js 22',conclusion:'success',status:'completed'},
   {name:'Run node --test regression',conclusion:'failure',status:'completed'},
   {name:'Desktop Chromium smoke',conclusion:'skipped',status:'completed'}]}],HEAD,HEAD);
 assert.equal(fail.node,'FAIL');
 assert.equal(fail.chromium,'NOT_TESTED');
 const setup=core.classifyJobs([{name:'Setup',conclusion:'success',status:'completed',
  steps:[{name:'Set up Node.js 22',conclusion:'success',status:'completed'}]}],HEAD,HEAD);
 assert.equal(setup.node,'NOT_TESTED');
});
test('track15-10 runs with a foreign SHA never confer approval through step status',()=>{
 const rows=[{name:'CI',conclusion:'success',status:'completed',
 steps:[{name:'Control Center regression tests',conclusion:'success',status:'completed'}]}];
 assert.equal(core.classifyJobs(rows,OLD,HEAD).node,'NOT_TESTED');
});

test('track15-11 original supported language registry covers all 20 without unadmitted additions',()=>{
 const expected=['ar','en','es','fr','de','tr','ru','pt','zh','hi','ja','ko',
   'id','vi','it','bn','ur','fa','pl','nl'];
 assert.deepEqual([...core.LOCALES].sort(),[...expected].sort());
 assert.equal(new Set(core.LOCALES).size,20);
 assert.equal(core.LOCALES.includes('he'),false);
});
test('track15-12 missing per-language evidence cannot yield fabricated gap totals',()=>{
 const status=core.localeCounts(null,'a'.repeat(40));
 assert.equal(status.length,20);
 assert.ok(status.every(row=>row.gaps===null&&row.status==='NOT_TESTED'));
 const mismatched=core.localeCounts({source_sha:OLD,languages:[{code:'ar',missing:12}]},HEAD);
 assert.equal(mismatched.find(row=>row.code==='ar').status,'STALE');
 assert.equal(mismatched.find(row=>row.code==='ar').gaps,null);
});
test('track15-13 valid exact-SHA per-locale counts may display verified zeros independently',()=>{
 const data={source_sha:HEAD,languages:core.LOCALES.map(code=>({code,missing:code==='ar'?0:17}))};
 const result=core.localeCounts(data,HEAD);
 assert.equal(result.length,20);
 assert.deepEqual(result.find(row=>row.code==='ar'),{code:'ar',gaps:0,status:'GAPS_REPORTED'});
 assert.equal(result.find(row=>row.code==='de').gaps,17);
 const duplicate={...data,languages:[...data.languages,data.languages[0]]};
 assert.ok(core.localeCounts(duplicate,HEAD).every(row=>row.status==='NOT_TESTED'));
});
