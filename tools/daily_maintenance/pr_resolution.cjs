'use strict';
// Deterministic, fail-closed PR coordinator. NO arbitrary code, secrets, releases or runtime edits.
const SHA=/^[0-9a-f]{40}$/i;
const REPO='moaz76943-creator/zen-study-focus';
const INTEGRATION='integration/deep-focus-recovery-00-final-20261019';
const CI_NAMES=new Set([
 'Deep Focus Control Center Quality Audit',
 'Deep Focus exact-SHA Android verification (release locked)',
 'Verify Android APK and Play Bundle',
 'Deep Focus Scoped QA Agents'
]);
function labelSet(p){return new Set((p.labels||[]).map(x=>typeof x==='string'?x:x.name));}
function sanitize(s){return String(s||'').replace(/[\x00-\x1f|<>]/g,' ').split(String.fromCharCode(96)).join(' ').replace(/\s+/g,' ').slice(0,135);}
function result(code,reason){return {code,reason};}
function classify(p,anchor,contained=new Set()){
 if(!p||!anchor||!SHA.test(anchor.head?.sha||''))return result('NOT_VERIFIED','Integration head is missing');
 if(p.number===anchor.number)return result('INTEGRATION_ANCHOR','Main recovery integration (no automatic release)');
 if(p.state && p.state!=='open')return result('CLOSED','No action');
 if(contained.has(p.number))return result('ALREADY_INTEGRATED','Exact PR head is already in integration history');
 if(!SHA.test(p.head?.sha||''))return result('NOT_VERIFIED','PR head is not a full SHA');
 if(p.base?.ref!==INTEGRATION)return result('DEPENDENT_BRANCH','Different base: reconcile dependency chain first');
 if(p.draft)return result('DRAFT','Author still marks draft: do not merge');
 if(p.mergeable!==true)return result('MERGE_CONFLICT','Mergeability is false or not yet verified');
 if(!labelSet(p).has('agent-safe-merge'))return result('REVIEW_REQUIRED','Owner has not approved docs-only safe merging');
 return result('VERIFY_CANDIDATE','Run exact-SHA, source and risk gates');
}
function safeDocs(files){
 return Array.isArray(files)&&files.length>0&&files.length<=10&&files.every(f=>{
  if(!f||!/^docs\/[a-zA-Z0-9_./-]+\.md$/.test(f.filename||'')||f.filename.includes('..'))return false;
  if(!['added','modified'].includes(f.status))return false;
  if((f.additions||0)+(f.deletions||0)>400)return false;
  if(/^docs\/(?:MEDIA_LICENSES|contracts\/|release\/|security\/)/i.test(f.filename))return false;
  return true;
 });
}
function ciEvidence(runs,sha){
 const head=(Array.isArray(runs)?runs:[]).filter(r=>r.head_sha===sha);
 if(head.some(r=>['failure','cancelled','timed_out','action_required'].includes(r.conclusion)))return result('CI_FAILED','A workflow run failed/cancelled at exact SHA');
 if(head.some(r=>r.status!=='completed'||!r.conclusion))return result('CI_NOT_VERIFIED','At least one workflow is pending at exact SHA');
 if(!head.some(r=>CI_NAMES.has(r.name)&&r.conclusion==='success'))
  return result('CI_NOT_VERIFIED','No recognized successful exact-SHA source/Android workflow');
 return result('GREEN_SOURCE_ONLY','GitHub source CI succeeded, not Android/device acceptance');
}
function decideMerge(p,{anchorSha,files,runs}={}){
 if(!SHA.test(p?.head?.sha||'')||!SHA.test(anchorSha||''))return result('INVALID_SHA','Cannot pin exact SHA');
 if(p.number===25||p.base?.ref!==INTEGRATION)return result('DEPENDENT_BRANCH','Never merge into another base');
 if(p.base?.sha!==anchorSha)return result('STALE_BASE','Integration changed; re-fetch and reconcile first');
 if(p.state&&p.state!=='open')return result('CLOSED','Already closed');
 if(p.draft)return result('DRAFT','Draft cannot be merged');
 if(p.mergeable!==true)return result('MERGE_CONFLICT','Conflict or unknown mergeability');
 if(p.user?.login!=='moaz76943-creator'||p.head?.repo?.full_name!==REPO)
  return result('UNTRUSTED_SOURCE','No fork or unexpected PR author');
 if(!labelSet(p).has('agent-safe-merge'))return result('NO_OWNER_OPT_IN','Owner label required');
 if(!safeDocs(files))return result('FILE_SCOPE_BLOCKED','Only bounded, non-destructive docs/*.md allowed');
 const ci=ciEvidence(runs,p.head.sha);
 if(ci.code!=='GREEN_SOURCE_ONLY')return ci;
 return result('READY_DOCS_ONLY','May merge to integration only; NOT production/release approved');
}
function summarize(pulls,anchor,contained=new Set()){
 const rows=(Array.isArray(pulls)?pulls:[]).map(p=>({
  number:p.number,title:sanitize(p.title),head:p.head?.sha||'NOT_VERIFIED',
  base:p.base?.ref||'UNKNOWN',...classify(p,anchor,contained)
 })).sort((a,b)=>a.number-b.number);
 const counts={total:rows.length,blocked:rows.filter(x=>!['ALREADY_INTEGRATED','CLOSED','INTEGRATION_ANCHOR'].includes(x.code)).length};
 return {schema_version:1,anchor_sha:anchor?.head?.sha||'NOT_VERIFIED',
  integration:INTEGRATION,checked_at:new Date().toISOString(),rows,counts,
  release_approved:false,android_e2e:'NOT_VERIFIED',media_rights:'NOT_APPROVED'};
}
function toMarkdown(plan){
 const lines=['# Deep Focus — PR resolution agent','',
  'Integration SHA: '+sanitize(plan.anchor_sha),
  'PRs inspected: '+plan.counts.total+', unresolved/review required: '+plan.counts.blocked,
  'Android device E2E: NOT_VERIFIED; Nature audio: NOT APPROVED; RELEASE NOT APPROVED',
  '',
  '| PR | Classification | Safe next action |','|---|---|---|'];
 for(const x of plan.rows)
  lines.push('| [#'+x.number+'](https://github.com/'+REPO+'/pull/'+x.number+') '+sanitize(x.title)+
   ' | '+x.code+' | '+sanitize(x.reason)+' |');
 lines.push('','## Merge policy','',
  'One bounded docs-only PR per run at most: current exact-SHA source CI, no failing/pending checks, '+
  'non-draft, owner opt-in label, verified same-repo author, no destructive file or main write.',
  'Other fixes require their own tests, full review and a separate integration decision. '+
  'Never auto-approve Android E2E, licenses, v21 data migration or a production release.');
 return lines.join('\n')+'\n';
}
module.exports={REPO,INTEGRATION,CI_NAMES,classify,safeDocs,ciEvidence,decideMerge,summarize,toMarkdown};
