#!/usr/bin/env node
'use strict';
// Review evidence, not permission to modify app source or release builds.
const SHA=/^[a-f0-9]{40}$/i;
const HASH=/^[a-f0-9]{64}$/i;
const ID=/^[a-z][a-z0-9_-]{1,39}$/;
const UTC=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const VALID_STATUS=new Set(['SOURCE_TESTED','SOURCE_PARTIAL','NOT_TESTED','BLOCKED','NOT_RUN']);
const TTL_MS=6*60*60*1000;
const OPEN='<!-- DF_AGENT_LEDGER_V1\n',CLOSE='\nEND_DF_AGENT_LEDGER_V1 -->';
function validDate(s){return typeof s==='string'&&UTC.test(s)&&Number.isFinite(Date.parse(s));}
function validateCycle(r){
 if(!r||r.schema_version!==1||!SHA.test(r.source_sha||''))throw Error('Invalid source SHA or schema');
 if(!HASH.test(r.manifest_sha256||''))throw Error('Invalid manifest checksum');
 if(!validDate(r.checked_at))throw Error('Invalid UTC checkpoint timestamp');
 if(!Array.isArray(r.agent_ids)||r.agent_ids.length<1||r.agent_ids.length>30||r.agent_ids.some(x=>typeof x!=='string'||!ID.test(x))||new Set(r.agent_ids).size!==r.agent_ids.length)throw Error('Invalid registered specialists');
 if(!Number.isInteger(r.total_agents)||r.total_agents!==r.agent_ids.length)throw Error('Inconsistent agent inventory');
 if(!Array.isArray(r.agents)||r.agents.length<1||r.agents.length>6||r.agents.length!==r.selected_agents)throw Error('Invalid selected cohort');
 const ids=new Set(),registered=new Set(r.agent_ids);
 for(const a of r.agents){
  if(!a||typeof a.id!=='string'||!registered.has(a.id))throw Error('Unknown specialist in cycle');
  if(ids.has(a.id))throw Error('Duplicate selected specialist');
  ids.add(a.id);
  if(!VALID_STATUS.has(a.status)||!Number.isInteger(a.tests)||a.tests<0||a.tests>350)throw Error('Untrusted agent result');
 }
 if(!r.coverage||!Array.isArray(r.coverage.unmapped)||!Array.isArray(r.coverage.duplicates)||
   ![...r.coverage.unmapped,...r.coverage.duplicates].every(x=>typeof x==='string'&&x.startsWith('tests/')&&x.length<350))throw Error('Invalid coverage inventory');
 return r;
}
function validPrevious(p){
 if(!p||p.schema_version!==1||!SHA.test(p.source_sha||'')||!HASH.test(p.manifest_sha256||'')||!validDate(p.checked_at)||
   !Array.isArray(p.agent_ids)||p.agent_ids.length<1||p.agent_ids.length>30||new Set(p.agent_ids).size!==p.agent_ids.length||
   p.agent_ids.some(x=>typeof x!=='string'||!ID.test(x))||!p.records||typeof p.records!=='object'||Array.isArray(p.records))return false;
 for(const [key,v] of Object.entries(p.records))if(!p.agent_ids.includes(key)||!v||!VALID_STATUS.has(v.status)||!validDate(v.checked_at)||!Number.isInteger(v.tests)||v.tests<0)return false;
 return true;
}
function aggregate(previous,raw,{ttlMs=TTL_MS}={}){
 const r=validateCycle(raw),now=Date.parse(r.checked_at);
 if(!Number.isInteger(ttlMs)||ttlMs<60*60*1000||ttlMs>24*60*60*1000)throw Error('Invalid evidence TTL');
 const compatible=validPrevious(previous)&&previous.source_sha===r.source_sha&&previous.manifest_sha256===r.manifest_sha256&&JSON.stringify(previous.agent_ids)===JSON.stringify(r.agent_ids);
 if(compatible&&Date.parse(previous.checked_at)>now)throw Error('Out-of-order agent cycle cannot overwrite newer evidence');
 const records={};
 if(compatible)for(const id of r.agent_ids){
  const saved=previous.records[id];
  if(saved&&now>=Date.parse(saved.checked_at)&&now-Date.parse(saved.checked_at)<=ttlMs)
   records[id]={status:saved.status,tests:saved.tests,checked_at:saved.checked_at};
 }
 for(const a of r.agents)records[a.id]={status:a.status,tests:a.tests,checked_at:r.checked_at};
 const missing=r.agent_ids.filter(id=>!records[id]);
 const blocked=r.agent_ids.filter(id=>records[id]&&records[id].status!=='SOURCE_TESTED');
 const coverage={unmapped:[...new Set(r.coverage.unmapped)].sort(),duplicates:[...new Set(r.coverage.duplicates)].sort()};
 const overall=blocked.length?'BLOCKED':coverage.unmapped.length||coverage.duplicates.length?'COVERAGE_GAP':missing.length?'INCOMPLETE':'FULL_SOURCE_CYCLE_PASS';
 return {schema_version:1,source_sha:r.source_sha,manifest_sha256:r.manifest_sha256,checked_at:r.checked_at,
  agent_ids:[...r.agent_ids],records,missing,blocked,coverage,overall,full_source_cycle_pass:overall==='FULL_SOURCE_CYCLE_PASS',
  android_e2e:'NOT_TESTED',nature_audio_provenance:'NOT_APPROVED',release_approved:false};
}
function safe(s){return String(s??'').replace(/[\r\n|`<>]/g,' ').slice(0,180);}
function toMarkdown(s){
 const lines=['# Deep Focus hourly QA — evidence across all specialists','',
  '**'+s.overall+'** — source only; does not prove Android E2E, visual/audio quality, translation naturalness, or release readiness.','',
  'Exact source SHA: `'+s.source_sha+'`',
  'Agent manifest checksum: `'+s.manifest_sha256+'`',
  'Last checked at: '+s.checked_at,
  'Verified specialists: '+(s.agent_ids.length-s.missing.length)+'/'+s.agent_ids.length,
  'Blocked or partial: '+s.blocked.length,
  'Missing / stale: '+s.missing.length,'',
  '| Agent | Evidence at exact SHA | Timestamp (UTC) |','|---|---|---|'];
 for(const id of s.agent_ids){const a=s.records[id];lines.push('| '+safe(id)+' | '+(a?safe(a.status):'NOT_TESTED')+' | '+(a?safe(a.checked_at):'missing / stale')+' |');}
 lines.push('','New test files without an owning agent: '+s.coverage.unmapped.length,
  'Duplicate test ownership: '+s.coverage.duplicates.length,
  ...s.coverage.unmapped.slice(0,12).map(f=>'- Unmapped: `'+safe(f)+'`'),
  ...s.coverage.duplicates.slice(0,12).map(f=>'- Overlap: `'+safe(f)+'`'),'',
  '**No auto-merge, app source edits, APK release, or modification of user data.**','');
 return lines.join('\n');
}
function serialize(state){if(!validPrevious(state))throw Error('Invalid ledger state');return OPEN+JSON.stringify(state)+CLOSE;}
function parseIssueLedger(body){
 if(typeof body!=='string'||body.length>90000)return null;
 const from=body.lastIndexOf(OPEN);
 if(from<0)return null;
 const to=body.indexOf(CLOSE,from+OPEN.length);
 if(to<0||to-from>25000)return null;
 try{
  const state=JSON.parse(body.slice(from+OPEN.length,to));
  return validPrevious(state)?state:null;
 }catch{return null;}
}
module.exports={TTL_MS,validateCycle,aggregate,toMarkdown,serialize,parseIssueLedger};
