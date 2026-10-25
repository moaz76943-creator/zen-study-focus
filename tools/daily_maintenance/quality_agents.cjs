#!/usr/bin/env node
'use strict';
// Deep Focus QA agents: finite, deterministic, read-only source tests. Not an autonomous deployer.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const SHA=/^[a-f0-9]{40}$/i;
const ID=/^[a-z][a-z0-9_-]{1,39}$/;
const DIR=/^tests\/[a-z][a-z0-9_-]*(?:\/[a-z][a-z0-9_-]*)*$/;
const LANES=new Set(['all','ui','audio','locale','numerals','analytics','data','qa','performance','notes','tasks','security','timer']);
// The real-media legal release gate runs separately and MUST remain BLOCKED until licensed.
// Only this exact test is excluded from source-pass cohorts; do not use wildcards.
const SEPARATE_RELEASE_TEST='tests/master_recovery_qa/media_provenance_gate.test.cjs';
function validateManifest(manifest){
 if(!manifest||manifest.schema_version!==1)throw Error('Unsupported agent manifest schema');
 if(!Array.isArray(manifest.agents)||manifest.agents.length===0||manifest.agents.length>30)throw Error('Invalid agents');
 const seen=new Set(),ownedDirs=[];
 for(const a of manifest.agents){
  if(!a||typeof a.id!=='string'||!ID.test(a.id)||!LANES.has(a.lane)||typeof a.purpose!=='string'||!a.purpose.trim()||a.purpose.length>160)
   throw Error('Invalid agent id, lane or purpose');
  if(seen.has(a.id))throw Error('Duplicate agent: '+a.id);
  seen.add(a.id);
  if(!Array.isArray(a.test_dirs)||a.test_dirs.length<1||a.test_dirs.length>8||!a.test_dirs.every(d=>typeof d==='string'&&DIR.test(d)))
   throw Error('Unsafe test_dirs for '+a.id);
  for(const d of a.test_dirs){
   for(const previous of ownedDirs)
    if(d===previous.dir||d.startsWith(previous.dir+'/')||previous.dir.startsWith(d+'/'))
     throw Error('Overlapping test ownership: '+previous.agent+' and '+a.id+' claim '+d);
   ownedDirs.push({dir:d,agent:a.id});
  }
 }
 return manifest.agents;
}
function discoverTests(root,dirs,{inventory=false}={}){
 const rootTests=path.resolve(root,'tests');
 const found=new Set();
 function scan(current){
  const st=fs.lstatSync(current);
  if(st.isSymbolicLink())throw Error('Unsafe symlink in QA suite: '+current);
  if(st.isFile()){
   const rel=path.relative(root,current).split(path.sep).join('/');
   if(/\.test\.cjs$/.test(current)&&rel!==SEPARATE_RELEASE_TEST)found.add(rel);
   return;
  }
  if(!st.isDirectory())return;
  for(const name of fs.readdirSync(current)){
   if(name.startsWith('.'))continue;
   scan(path.join(current,name));
   if(found.size>350)throw Error('QA test inventory too large');
  }
 }
 for(const dir of dirs){
  if(!DIR.test(dir)&&!(inventory&&dir==='tests'))throw Error('Unsafe test_dirs: '+dir);
  const resolved=path.resolve(root,dir);
  if(resolved!==rootTests&&!resolved.startsWith(rootTests+path.sep))
   throw Error('Unsafe test_dirs outside tests: '+dir);
  if(!fs.existsSync(resolved))continue;
  scan(resolved);
 }
 return [...found].sort();
}
function readLocaleAudit(output){
 const file=path.join(output,'locales','coverage.json');
 if(!fs.existsSync(file))return {status:'NOT_TESTED',reason:'Language audit report not generated'};
 try {
  const o=JSON.parse(fs.readFileSync(file,'utf8'));
  if(!Array.isArray(o.languages)||o.languages.length!==20||!Array.isArray(o.missing)||!Array.isArray(o.staticCandidates)||!Array.isArray(o.markup?.unknown))
   return {status:'NOT_TESTED',reason:'Language report schema mismatch'};
  const result={missing:o.missing.length,unmarked:o.markup.unknown.length,staticCandidates:o.staticCandidates.length,
   englishIdentical:Array.isArray(o.englishIdentical)?o.englishIdentical.length:0,
   directionWarnings:Array.isArray(o.warnings)?o.warnings.length:0};
  result.status=(result.missing||result.unmarked||result.staticCandidates||result.directionWarnings)?'GAPS_FOUND':'SOURCE_AUDITED';
  return result;
 }catch(e){return {status:'NOT_TESTED',reason:'Unable to parse locale report: '+String(e.message).slice(0,140)};}
}
function parseNodeTap(output){
 const data=String(output||'');
 if(!/^TAP version [0-9]+/m.test(data))return null;
 const summary={};
 for(const line of data.split(/\r?\n/)){
  const m=/^# (tests|pass|fail|skipped|todo|cancelled) ([0-9]+)$/.exec(line);
  if(m)summary[m[1]]=Number(m[2]);
 }
 for(const key of ['tests','pass','fail','skipped','todo','cancelled'])
  if(!Number.isSafeInteger(summary[key]))return null;
 if(summary.pass+summary.fail>summary.tests||summary.skipped+summary.todo>summary.tests)
  return null;
 return summary;
}
function runAgents(root,manifest,{sourceSha,lane='all',execute=cp.spawnSync}={}){
 if(typeof sourceSha!=='string'||!SHA.test(sourceSha))throw Error('Exact source SHA required');
 if(!LANES.has(lane))throw Error('Unknown QA lane');
 const agents=validateManifest(manifest),rows=[];
 for(const agent of agents){
  const result={id:agent.id,lane:agent.lane,purpose:agent.purpose,status:'NOT_RUN',tests:0};
  if(lane!=='all'&&lane!==agent.lane){rows.push(result);continue;}
  try {
   const tests=discoverTests(root,agent.test_dirs);
   result.tests=tests.length;
   if(!tests.length){result.status='NOT_TESTED';result.reason='No matching source tests; never assume pass';}
   else {
    const proc=execute(process.execPath,['--test',...tests],
     {cwd:root,encoding:'utf8',shell:false,timeout:120000,maxBuffer:3*1024*1024});
    if(proc.status===0&&!proc.error){
     const tap=parseNodeTap(proc.stdout);
     result.cases=tap?.tests??0;
     result.passed=tap?.pass??0;
     result.skipped=tap?.skipped??0;
     result.todo=tap?.todo??0;
     if(!tap||tap.tests===0||tap.pass===0){
      result.status='NOT_TESTED';
      result.reason='No verifiable passing Node TAP test cases';
     }else if(tap.fail>0||tap.cancelled>0){
      result.status='BLOCKED';
      result.reason='Node TAP reported failed or cancelled cases';
     }else if(tap.skipped>0||tap.todo>0||tap.pass!==tap.tests){
      result.status='SOURCE_PARTIAL';
      result.reason='Suite includes skipped, todo or unaccounted test cases';
     }else result.status='SOURCE_TESTED';
    }
    else {
     result.status='BLOCKED';
     result.reason=proc.error?.code==='ETIMEDOUT'?'Finite source test timeout':
      ('Source test failed ('+(proc.status===null?'no exit':proc.status)+'): '+String(proc.stderr||proc.stdout||proc.error?.message||'No output').slice(-500));
    }
   }
  }catch(e){result.status='BLOCKED';result.reason=String(e.message).slice(0,500);}
  rows.push(result);
 }
 let unmapped=[];
 if(lane==='all'){
  try{
   const all=discoverTests(root,['tests'],{inventory:true});
   const mapped=new Set(agents.flatMap(a=>discoverTests(root,a.test_dirs)));
   unmapped=all.filter(file=>!mapped.has(file));
  }catch(e){
   rows.push({id:'suite_inventory',lane:'qa',status:'BLOCKED',tests:0,
    reason:'Cannot inventory tests: '+String(e.message).slice(0,180)});
  }
  if(unmapped.length)rows.push({id:'unmapped_tests',lane:'qa',status:'NOT_TESTED',
   tests:unmapped.length,reason:'Unassigned test files: '+unmapped.slice(0,8).join(', ')});
 }
 return {schema_version:1,source_sha:sourceSha,verified_at:new Date().toISOString(),scope:'SOURCE_CODE_ONLY',
  unmapped_tests:unmapped,separate_release_gate:SEPARATE_RELEASE_TEST,
  device_qa:'NOT_TESTED',production_ready:false,autofix:'DISABLED_FOR_APP_SOURCE',lane,agents:rows};
}
function hasHardFailure(report){return report.agents.some(a=>['BLOCKED','NOT_TESTED','SOURCE_PARTIAL'].includes(a.status));}
function toMarkdown(report,language){
 const lines=['# Deep Focus specialist QA agents','',
  'Exact source SHA: `'+report.source_sha+'`','Selected lane: '+report.lane,
  '**No Android E2E, translation naturalness, actual device audio or release approval is implied.**','',
  '| Agent | Source result | Files tested |','|---|---|---:|'];
 for(const a of report.agents)lines.push('| '+a.id+' | '+a.status+' | '+a.tests+' |');
 lines.push('','## Translation coverage','',
  'Source analysis: '+language.status,
  'Missing translations: '+(language.missing??'NOT_TESTED'),
  'Unresolved markup keys: '+(language.unmarked??'NOT_TESTED'),
  'Unmarked UI strings requiring review: '+(language.staticCandidates??'NOT_TESTED'),
  'English-identical candidates: '+(language.englishIdentical??'NOT_TESTED'),'',
  '## Failed / missing checks','');
 for(const a of report.agents.filter(x=>x.reason))lines.push('- '+a.id+': '+a.reason.replace(/[\r\n|]+/g,' ').slice(0,240));
 lines.push('','No automatic source-code replacement, locale guesswork, stored-data modification, force push, signing, merge, or release.','');
 return lines.join('\n');
}
function main(argv=process.argv.slice(2)){
 const params={};
 if(argv.length%2)throw Error('Usage: --root PATH --out PATH [--lane NAME]');
 for(let i=0;i<argv.length;i+=2){
  if(!['--root','--out','--lane'].includes(argv[i])||!argv[i+1])throw Error('Unknown argument');
  params[argv[i].slice(2)]=argv[i+1];
 }
 if(!params.root||!params.out)throw Error('Root and output required');
 const root=path.resolve(params.root),out=path.resolve(params.out);
 if(out===root||out.startsWith(root+path.sep))throw Error('QA reports must remain outside app checkout');
 const sourceSha=cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',timeout:5000}).trim();
 const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'agents.json'),'utf8'));
 const report=runAgents(root,manifest,{sourceSha,lane:params.lane||'all'});
 const language=readLocaleAudit(out);
 fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,'quality-agents.json'),JSON.stringify({...report,translation_audit:language},null,2)+'\n');
 fs.writeFileSync(path.join(out,'quality-agents.md'),toMarkdown(report,language)+'\n');
 console.log(report.agents.map(a=>a.id+'='+a.status).join(' '));
 if(hasHardFailure(report))process.exitCode=1;
}
if(require.main===module){try{main();}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={validateManifest,discoverTests,parseNodeTap,runAgents,readLocaleAudit,hasHardFailure,toMarkdown,main};
