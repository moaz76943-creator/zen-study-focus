#!/usr/bin/env node
'use strict';
// A source-only evidence gate. It never changes app files, user data, or release settings.
const fs=require('node:fs');
const SHA=/^[a-f0-9]{40}$/i;
function classifySource(checked,official) {
 if(typeof checked!=='string'||typeof official!=='string'||!SHA.test(checked)||!SHA.test(official))
  return {status:'OFFICIAL_SOURCE_NOT_VERIFIED',checked_sha:null,official_sha:null};
 const checked_sha=checked.toLowerCase(),official_sha=official.toLowerCase();
 return {status:checked_sha===official_sha?'EXACT_OFFICIAL_SOURCE':'OFFICIAL_SOURCE_STALE',checked_sha,official_sha};
}
function main(args=process.argv.slice(2),env=process.env) {
 const result=classifySource(args[0],args[1]);
 const message=result.status==='EXACT_OFFICIAL_SOURCE'
  ?'Official integration source SHA verified: '+result.official_sha
  :result.status==='OFFICIAL_SOURCE_STALE'
   ?'OFFICIAL_SOURCE_STALE: daily QA checked '+result.checked_sha+' but the official integration head is '+result.official_sha+'. Official integration remains NOT_TESTED by this workflow.'
   :'OFFICIAL_SOURCE_NOT_VERIFIED: missing or malformed checked/official SHA. No official integration PASS.';
 process.stdout.write(message+'\n');
 if(env.GITHUB_STEP_SUMMARY)fs.appendFileSync(env.GITHUB_STEP_SUMMARY,'\n'+message+'\n');
 if(result.status!=='EXACT_OFFICIAL_SOURCE')process.exitCode=1;
 return result;
}
if(require.main===module)main();
module.exports={classifySource,main};
