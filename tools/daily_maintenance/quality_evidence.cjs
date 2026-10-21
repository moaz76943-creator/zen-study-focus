'use strict';
// Evidence reducer; it cannot run tests, alter the repository, or approve a release.
const crypto=require('node:crypto');
const SHA=/^[0-9a-f]{40}$/i;
function measure(report,manifest,sourceSha){
 if(!SHA.test(sourceSha||'')||!report||report.schema_version!==1||report.source_sha!==sourceSha)
  throw Error('Invalid or stale source SHA evidence');
 if(report.scope!=='SOURCE_CODE_ONLY')throw Error('Only source-code QA scope is supported');
 if(!manifest||manifest.schema_version!==1||!Array.isArray(manifest.agents)||!manifest.agents.length)
  throw Error('Missing manifest inventory');
 if(!Array.isArray(report.unmapped_tests)||report.unmapped_tests.length)
  throw Error('Unowned test coverage is not verified');
 if(!Array.isArray(report.agents)||report.agents.length!==manifest.agents.length)
  throw Error('Missing or excess agents in source inventory');
 const registered=new Set(manifest.agents.map(a=>a.id)),seen=new Set();
 let files=0,cases=0,passed=0;
 for(const agent of report.agents){
  if(!agent||!registered.has(agent.id)||seen.has(agent.id))throw Error('Unknown or duplicate source agents');
  seen.add(agent.id);
  for(const key of ['tests','cases','passed','skipped','todo']){
   if(!Number.isSafeInteger(agent[key])||agent[key]<0)throw Error('Invalid or partial source counts');
  }
  if(agent.status!=='SOURCE_TESTED'||agent.tests<1||agent.cases<1||agent.cases!==agent.passed||agent.skipped!==0||agent.todo!==0)
   throw Error('Unverified or partial source agent: '+agent.id);
  files+=agent.tests; cases+=agent.cases; passed+=agent.passed;
 }
 if(seen.size!==registered.size||!Number.isSafeInteger(cases)||!Number.isSafeInteger(files))throw Error('Agent inventory incomplete');
 return {schema_version:1,source_sha:sourceSha,scope:'SOURCE_ONLY',manifest_sha256:crypto.createHash('sha256').update(JSON.stringify(manifest)).digest('hex'),specialists_passed:seen.size,specialists_total:registered.size,source_test_files:files,executed_cases:cases,passed_cases:passed,unowned_tests:0,android_e2e:'NOT_TESTED',media_rights:'NOT_APPROVED',release_approved:false};
}
module.exports={measure};
