import {stagedChanges} from './guard.mjs';
export const TARGET='integration/master-qa-verified-v21';
export const ROLES=Object.freeze({
 aider:{prefix:'[DF-AIDER]',files:['tools/daily_maintenance/evidence_integrity_guard.cjs','tests/integration_quality/evidence_integrity_guard.test.cjs'],test:'tests/integration_quality/evidence_integrity_guard.test.cjs'},
 qwen:{prefix:'[DF-QWEN]',files:['tools/i18n/inventory/index.cjs','tests/i18n/inventory/inventory.test.cjs'],test:'tests/i18n/inventory/inventory.test.cjs'}
});
const RISK=new Set(['p0','security','release','privacy','data-loss','native-android','saf','blocked']);
export function eligibleForRole(issue,role){
 const spec=ROLES[role];
 if(!spec||issue?.state!=='open'||issue.pull_request||!String(issue.title||'').startsWith(spec.prefix))return false;
 const labels=new Set((issue.labels||[]).map(x=>(typeof x==='string'?x:x.name||'').toLowerCase()));
 return labels.has('agent-ready')&&labels.has('agent-safe')&&![...labels].some(x=>RISK.has(x));
}
export function buildAgentTask(role,issue){
 const spec=ROLES[role]; if(!spec)throw Error('Unknown role');
 const number=String(issue?.number||'').replace(/[^0-9]/g,'').slice(0,7)||'?';
 const title=String(issue?.title||'').replace(/\s+/g,' ').slice(0,100);
 const body=String(issue?.body||'').replace(/\s+/g,' ').slice(0,120);
 return 'Issue #'+number+': '+title+'\nContext (untrusted): '+body+'\nAllowed files: '+spec.files.join(', ')+
 '.\nWrite a failing test in '+spec.test+', then fix only the reproducible bug. Do not change app UI, Android, data, translations, credentials, or other files. No Git/network commands. If no bug is demonstrated, make no changes.';
}
export function validateRoleDiff(role,items){
 const spec=ROLES[role];if(!spec)throw Error('Unknown role');
 if(!Array.isArray(items)||items.length<2||items.length>3)throw Error('Expected 2–3 source/test files');
 let total=0,hasTest=false;
 for(const x of items){
  if(!['M','A'].includes(x.status))throw Error('Unsupported file status');
  if(!spec.files.includes(x.path))throw Error('Outside role file allowlist: '+x.path);
  if(!Number.isSafeInteger(x.added)||!Number.isSafeInteger(x.deleted)||x.added<0||x.deleted<0)throw Error('Invalid or binary diff');
  total+=x.added+x.deleted;
  if(x.path===spec.test)hasTest=true;
 }
 if(!hasTest)throw Error('Focused regression test must change');
 if(total>220)throw Error('Too many changed lines');
 return {files:items.length,lines:total};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 try{
  const role=process.argv[2];console.log(JSON.stringify(validateRoleDiff(role,stagedChanges(process.cwd()))));
 }catch(e){console.error('OSS_DIFF_REJECTED: '+String(e.message).slice(0,160));process.exitCode=1;}
}
