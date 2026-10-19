#!/usr/bin/env node
'use strict';
/* Offline, non-mutating repository quality audit. No v21 user data is opened. */
const STATUSES=['TODO','BLOCKED','IN_PROGRESS','TESTED','DEFERRED'];
function parseLedger(markdown) {
  const tasks=[], duplicates=[], seen=new Set();
  for (const line of String(markdown||'').split(/\r?\n/)) {
    const parts=line.split('|').map(s=>s.trim());
    if (parts.length<7 || !/^DF-\d{3}$/.test(parts[1]||'')) continue;
    const [id,status,area,title,evidence]=parts.slice(1,6);
    if(seen.has(id)){ duplicates.push(id); continue; }
    seen.add(id); tasks.push({id,status,area,title:title.replace(/<[^>]*>/g,''),evidence});
  }
  return {tasks,duplicates};
}
function analyze(input) {
  const parsed=parseLedger(input.ledger),tasks=parsed.tasks;
  const summary=Object.fromEntries(STATUSES.map(s=>[s,0]));
  for(const t of tasks) if(Object.prototype.hasOwnProperty.call(summary,t.status))summary[t.status]++;
  const set=new Set(tasks.map(x=>x.id));
  const missing=Array.from({length:161},(_,i)=>'DF-'+String(i+1).padStart(3,'0')).filter(x=>!set.has(x));
  const invalid=tasks.filter(t=>!STATUSES.includes(t.status));
  const media=Array.isArray(input.media)?input.media:[];
  const licenses=String(input.licenseText||'');
  const findings=[];
  function add(id,severity,title,detail,remediation,paths) {findings.push({id,severity,title,detail,remediation,paths});}
  if(missing.length||parsed.duplicates.length||invalid.length) add('LEDGER_INTEGRITY','critical',
    'Recovery ledger inconsistent',
    'Missing: '+missing.join(', ')+'; duplicate: '+parsed.duplicates.join(', ')+'; invalid: '+invalid.map(x=>x.id).join(', '),
    'Reconcile with issue #13; do not mark a task TESTED without evidence.',
    ['docs/recovery_integration/FINAL_MATRIX_161.md']);
  const undocumented=media.filter(f=>!licenses.includes(String(f.path).split('/').pop()));
  if(undocumented.length) add('MEDIA_UNDOCUMENTED','critical',
    'Nature sound files lack individual documentation',
    undocumented.map(f=>f.path).join(', '),
    'Collect verified individual URLs, license, author, original and conversion hashes and Android listening evidence before activation.',
    ['docs/MEDIA_LICENSES.md']);
  const hashes=new Map();
  for(const f of media) {
    if(!/^[a-f0-9]{64}$/i.test(f.sha256||''))continue;
    if(!hashes.has(f.sha256))hashes.set(f.sha256,[]);
    hashes.get(f.sha256).push(f.path);
  }
  const dup=[...hashes.values()].filter(group=>group.length>1);
  if(dup.length)add('MEDIA_IDENTICAL','warning','Different audio names have identical bytes',
    dup.map(x=>x.join(' = ')).join('; '),
    'Review intentional aliases; do not replace with synthesized audio.', ['android/app/src/main/assets/web/sounds/']);
  if(summary.BLOCKED)add('RELEASE_BLOCKERS','warning','Blocked recovery tasks remain',
    summary.BLOCKED+' tasks are BLOCKED by the ledger; this is not device QA evidence.',
    'Complete evidence, on-device E2E, v21 backup/restore and licensing before release.',
    ['docs/recovery_integration/FINAL_MATRIX_161.md']);
  findings.sort((a,b)=>({critical:0,warning:1,info:2}[a.severity]-{critical:0,warning:1,info:2}[b.severity])||a.id.localeCompare(b.id));
  return {schema_version:1,repository:'moaz76943-creator/zen-study-focus',
    generated_at:input.generatedAt||new Date().toISOString(),
    inspected_ref:/^[0-9a-f]{40}$/i.test(input.headSha||'')?input.headSha:null,
    verification:'STATIC_SOURCE_ONLY',device_qa:'NOT_TESTED',ready_for_release:false,
    totals:{tasks:tasks.length,media:media.length,findings:findings.length,...summary},findings,tasks};
}
function toMarkdown(report){
  const lines=['# Deep Focus — Control Center static audit','',
    'Generated: '+report.generated_at,
    'Source SHA: '+(report.inspected_ref||'unavailable'),
    '**Static source audit only. Android device QA NOT_TESTED. Release NOT APPROVED.**','',
    'Tasks: '+report.totals.tasks+' | Blocked: '+report.totals.BLOCKED+' | Findings: '+report.findings.length,''];
  for(const finding of report.findings)lines.push('## '+finding.severity.toUpperCase()+': '+finding.id+' — '+finding.title,
    finding.detail,'','Remediation: '+finding.remediation,'');
  return lines.join('\n')+'\n';
}
function scan(root,env){
  const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
  const read=file=>fs.readFileSync(path.join(root,file),'utf8');
  const folder='android/app/src/main/assets/web/sounds';
  const media=fs.readdirSync(path.join(root,folder)).filter(n=>/\.ogg$/i.test(n)).sort().map(name=>{
    const p=folder+'/'+name;
    return {path:p,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')};
  });
  return analyze({ledger:read('docs/recovery_integration/FINAL_MATRIX_161.md'),
    licenseText:read('docs/MEDIA_LICENSES.md'),media,headSha:env.GITHUB_SHA||''});
}
function main(argv,env) {
  const fs=require('node:fs'),path=require('node:path');
  const a=argv.indexOf('--json'),b=argv.indexOf('--markdown');
  if(a<0||b<0||!argv[a+1]||!argv[b+1])throw Error('Usage: audit.cjs --json OUTPUT --markdown OUTPUT');
  const report=scan(path.resolve(__dirname,'../..'),env);
  for(const [i,content] of [[a,JSON.stringify(report,null,2)+'\n'],[b,toMarkdown(report)]]) {
    const dest=path.resolve(argv[i+1]);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,content);
  }
  process.stdout.write('Source audit: '+report.totals.tasks+' tasks; '+report.findings.length+' findings; device NOT_TESTED\n');
}
if(typeof module==='object')module.exports={parseLedger,analyze,toMarkdown,scan};
if(typeof require==='function'&&require.main===module){
  try{main(process.argv.slice(2),process.env);}catch(e){console.error(e.message);process.exitCode=1;}
}
