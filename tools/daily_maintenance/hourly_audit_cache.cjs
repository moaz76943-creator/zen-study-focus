'use strict';
// A blocked exact-SHA audit is useful evidence; repeating it hourly without source
// or manifest changes consumes CI without improving certainty. Cached status NEVER PASS.
const SHA=/^[a-f0-9]{40}$/i,HASH=/^[a-f0-9]{64}$/i,MAX_AGE_MS=6*60*60*1000;
function planKnownFailureSkip(previous,sourceSha,manifestHash,now=Date.now()){
 if(!previous||!SHA.test(sourceSha||'')||!HASH.test(manifestHash||'')||
    !Number.isFinite(now)||!['COVERAGE_GAP','BLOCKED'].includes(previous.overall))
   return {skip:false,reason:'AUDIT_REQUIRED'};
 const age=now-Date.parse(previous.checked_at);
 if(previous.source_sha!==sourceSha||previous.manifest_sha256!==manifestHash||
    !Number.isFinite(age)||age<0||age>MAX_AGE_MS)
  return {skip:false,reason:'AUDIT_REQUIRED'};
 return {skip:true,reason:'KNOWN_FAILURE_UNCHANGED_SOURCE',source_sha:sourceSha,previous_status:previous.overall,previous_checked_at:previous.checked_at};
}
module.exports={planKnownFailureSkip,MAX_AGE_MS};
