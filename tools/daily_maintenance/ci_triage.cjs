#!/usr/bin/env node
'use strict';
/* Pure, read-only classifier for the nightly source checks.
   Never treats cancelled, queued, missing or old-SHA runs as an Android PASS. */
const sha=x=>typeof x==='string'&&/^[0-9a-f]{40}$/i.test(x);
const unsafeLink=x=>typeof x!=='string'||!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/actions\/runs\/[0-9]+$/.test(x);
const failure=new Set(['failure','timed_out','action_required','startup_failure']);
function summarizeRuns(source,sourceSha){
 if(!sha(sourceSha))throw Error('Full checkout source sha is required');
 if(!Array.isArray(source))throw Error('GitHub Actions workflow_runs array required');
 const current_failed=[],current_success=[],stale_failed=[],not_verified=[],seen=new Set();
 for(const raw of source.slice(0,100)){
  if(!raw||!Number.isSafeInteger(raw.id)||raw.id<1||seen.has(raw.id)||!sha(raw.head_sha))continue;
  seen.add(raw.id);
  const row={id:raw.id,sha:raw.head_sha,name:String(raw.name||'Workflow').slice(0,110),
    state:String(raw.conclusion||raw.status||'unknown').slice(0,60),
    link:unsafeLink(raw.html_url)?null:raw.html_url};
  if(raw.head_sha!==sourceSha){if(failure.has(raw.conclusion))stale_failed.push(row);continue;}
  if(raw.status==='completed'&&failure.has(raw.conclusion))current_failed.push(row);
  else if(raw.status==='completed'&&raw.conclusion==='success')current_success.push(row);
  else not_verified.push(row);
 }
 const verification=current_failed.length?'BLOCKED':(current_success.length&&!not_verified.length?'SOURCE_TESTED_PARTIAL':'NOT_TESTED');
 const label=verification==='BLOCKED'?'BLOCKED':verification==='SOURCE_TESTED_PARTIAL'?'PARTIAL SOURCE PASS':(!seen.size?'NOT TESTED':'NOT VERIFIED');
 const lines=['## GitHub Actions — latest exact source','',
  'Source SHA: '+sourceSha,
  'SOURCE CI: '+label+' (does not establish Android or release readiness)','',
  'Current SHA: '+current_failed.length+' failed / '+current_success.length+' succeeded / '+not_verified.length+' pending, cancelled or unchecked.',
  'Older source failures (informational): '+stale_failed.length,''];
 for(const [heading,rows] of [['Current failures',current_failed],['Current unverified',not_verified],['Older failures',stale_failed]]){
  if(rows.length){lines.push('### '+heading);
   for(const r of rows.slice(0,12))lines.push('- '+r.name+' — '+r.state+(r.link?' — '+r.link:'')+' (SHA '+r.sha.slice(0,10)+')');
   lines.push('');
  }
 }
 lines.push('Android E2E: NOT_TESTED unless separately evidenced. Nature recording rights: BLOCKED. No auto-merge, signing or release.','');
 return {schema_version:1,source_sha:sourceSha,verification,current_failed,current_success,stale_failed,not_verified,markdown:lines.join('\n')};
}
if(typeof module==='object')module.exports={summarizeRuns};
