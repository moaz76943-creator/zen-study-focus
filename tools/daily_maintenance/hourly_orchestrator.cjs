#!/usr/bin/env node
'use strict';
// Coordinated, finite and deterministic SOURCE-ONLY agent rotation.
// No app writes, deployment, credentials, guesses about device evidence or autonomous merge.
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const crypto=require('node:crypto');
const SHA=/^[0-9a-f]{40}$/i;
const UTC=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const GOOD='SOURCE_TESTED';
function planCohort(manifest,now=new Date().toISOString(),size=3){
 if(!manifest||manifest.schema_version!==1||!Array.isArray(manifest.agents)||manifest.agents.length<1||manifest.agents.length>30)
  throw Error('Invalid agents manifest');
 if(!Number.isInteger(size)||size<1||size>6)throw Error('Invalid bounded cohort size');
 if(!UTC.test(now)||Number.isNaN(Date.parse(now)))throw Error('Valid UTC time required');
 const ids=manifest.agents.map(a=>a?.id);
 if(ids.some(x=>typeof x!=='string'||!/^[a-z][a-z0-9_-]{1,39}$/.test(x))||new Set(ids).size!==ids.length)
  throw Error('Invalid or duplicate agent ids');
 const rounds=Math.ceil(manifest.agents.length/size);
 const slot=new Date(now).getUTCHours()%rounds;
 return {slot,rounds,size,selected:manifest.agents.slice(slot*size,slot*size+size),agent_total:manifest.agents.length};
}
function runCycle(manifest,{sourceSha,now=new Date().toISOString(),run,coverage}={}){
 if(!SHA.test(sourceSha||''))throw Error('Exact source SHA required');
 if(typeof run!=='function'||typeof coverage!=='function')throw Error('Runner and coverage functions required');
 const plan=planCohort(manifest,now);
 const manifest_sha256=crypto.createHash('sha256').update(JSON.stringify(manifest)).digest('hex');
 const rows=plan.selected.map(a=>{
  try{
   const r=run(a);
   if(!r||typeof r.status!=='string'||r.status.length>40)throw Error('Invalid agent result');
   return {...r,id:a.id,lane:a.lane,purpose:a.purpose};
  }catch(e){return {id:a.id,lane:a.lane,purpose:a.purpose,status:'BLOCKED',tests:0,reason:String(e.message).slice(0,180)};}
 });
 const gaps=coverage();
 if(!gaps||!Array.isArray(gaps.unmapped)||!Array.isArray(gaps.duplicates)||
    ![...gaps.unmapped,...gaps.duplicates].every(x=>typeof x==='string'&&x.startsWith('tests/')&&x.length<350))
  throw Error('Untrusted or incomplete coverage inventory');
 const blockers=rows.filter(x=>x.status!==GOOD);
 const status=blockers.length?'BLOCKED':gaps.unmapped.length||gaps.duplicates.length?'COVERAGE_GAP':'COHORT_PASS';
 return {schema_version:1,source_sha:sourceSha,manifest_sha256,agent_ids:manifest.agents.map(a=>a.id),checked_at:now,scope:'SOURCE_ONLY',status,
  cohort:plan.slot+1,cohorts:plan.rounds,selected_agents:rows.length,total_agents:plan.agent_total,
  agents:rows,coverage:gaps,android_e2e:'NOT_TESTED',audio_provenance:'NOT_APPROVED',release_approved:false,
  auto_merge:false,app_edits:false};
}
function toMarkdown(r){
 const safe=x=>String(x??'').replace(/[\r\n|`]/g,' ').slice(0,220);
 const lines=['# Deep Focus — hourly agent coordination','',
  'Exact source SHA: `'+r.source_sha+'`',
  'Checked at: '+r.checked_at,
  'Result: **'+r.status+'** (source cohort only)',
  'Cohort: '+r.cohort+' / '+r.cohorts+' — '+r.selected_agents+' of '+r.total_agents+' agents','',
  '| Specialist | Result | Test files |','|---|---|---:|'];
 for(const a of r.agents)lines.push('| '+safe(a.id)+' | '+safe(a.status)+' | '+(Number.isInteger(a.tests)?a.tests:0)+' |');
 lines.push('','## New feature / test coverage','',
  'Unmapped test files: '+r.coverage.unmapped.length,
  'Overlapping assignments: '+r.coverage.duplicates.length,
  ...r.coverage.unmapped.slice(0,12).map(x=>'- New test without reviewed owner: `'+safe(x)+'`'),
  ...r.coverage.duplicates.slice(0,12).map(x=>'- Duplicated ownership: `'+safe(x)+'`'),
  ...r.agents.filter(a=>a.status!==GOOD).map(a=>'- '+safe(a.id)+': '+safe(a.reason||a.status)),
  '','Android E2E: NOT_TESTED','Nature media / licenses: NOT APPROVED','RELEASE NOT APPROVED','',
  'Safe mode: no source modification, no automatic merge, no release. Existing features and saved user data untouched.','');
 return lines.join('\n');
}
function parseArgs(argv){
 const a={};
 if(argv.length%2)throw Error('Expected --root DIRECTORY --out DIRECTORY');
 for(let i=0;i<argv.length;i+=2){
  if(!['--root','--out'].includes(argv[i])||!argv[i+1])throw Error('Unsupported CLI argument');
  a[argv[i].slice(2)]=argv[i+1];
 }
 if(!a.root||!a.out)throw Error('Missing root or out');
 return a;
}
function main(argv=process.argv.slice(2)){
 const args=parseArgs(argv),root=path.resolve(args.root),out=path.resolve(args.out);
 if(root===out||out.startsWith(root+path.sep))throw Error('Output cannot modify source checkout');
 const quality=require('./quality_agents.cjs');
 const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'agents.json'),'utf8'));
 quality.validateManifest(manifest);
 const sourceSha=cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',timeout:5000}).trim();
 const coverage=()=>{
  const all=quality.discoverTests(root,['tests'],{inventory:true});
  const counts=new Map();
  for(const a of manifest.agents)
   for(const file of quality.discoverTests(root,a.test_dirs))counts.set(file,(counts.get(file)||0)+1);
  return {unmapped:all.filter(f=>!counts.has(f)),duplicates:all.filter(f=>(counts.get(f)||0)>1)};
 };
 const report=runCycle(manifest,{sourceSha,run:a=>quality.runAgents(root,{schema_version:1,agents:[a]},
  {sourceSha,lane:a.lane}).agents[0],coverage});
 fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,'hourly-agents.json'),JSON.stringify(report,null,2)+'\n');
 fs.writeFileSync(path.join(out,'hourly-agents.md'),toMarkdown(report)+'\n');
 process.stdout.write(report.status+' at '+sourceSha+' cohort '+report.cohort+'/'+report.cohorts+'\n');
 if(report.status!=='COHORT_PASS')process.exitCode=1;
}
if(require.main===module){try{main();}catch(e){console.error(String(e.message));process.exitCode=1;}}
module.exports={planCohort,runCycle,toMarkdown,parseArgs,main};
