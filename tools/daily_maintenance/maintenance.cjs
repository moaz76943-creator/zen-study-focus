#!/usr/bin/env node
'use strict';
// Local-only daily maintenance. Does not read private v21 records, deploy, sign or merge.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const ALLOWED_GENERATED=Object.freeze(['android/app/src/main/assets/web/control_center_overrides.css']);
const STATUSES=Object.freeze(['TODO','BLOCKED','IN_PROGRESS','TESTED','DEFERRED']);
const isSha=x=>typeof x==='string'&&/^[a-f0-9]{40}$/i.test(x);
function readMatrix(md){
 const rows=[],duplicate=[],invalid=[],ids=new Set(),status=Object.fromEntries(STATUSES.map(x=>[x,0]));
 for(const line of String(md).split(/\r?\n/)){
  const cells=line.split('|').map(s=>s.trim());
  if(!/^DF-\d{3}$/.test(cells[1]||''))continue;
  const id=cells[1],state=cells[2];
  if(ids.has(id)){duplicate.push(id);continue;}
  ids.add(id);rows.push({id,status:state});
  if(!STATUSES.includes(state))invalid.push(id);else status[state]++;
 }
 const missing=Array.from({length:161},(_,i)=>'DF-'+String(i+1).padStart(3,'0')).filter(id=>!ids.has(id));
 return {rows,status,duplicate,invalid,missing};
}
function assertMatrix(m){
 if(m.duplicate.length)throw Error('Recovery ledger duplicate IDs: '+m.duplicate.join(','));
 if(m.invalid.length)throw Error('Recovery ledger invalid statuses: '+m.invalid.join(','));
 if(m.rows.length!==161||m.missing.length)throw Error('Expected all 161 tasks; missing: '+m.missing.join(','));
 return m;
}
function queue(ledger, limit = 20) {
  const rank = { BLOCKED: 0, TODO: 1, IN_PROGRESS: 2, IMPLEMENTED: 3, SOURCE_TESTED: 4, CI_TESTED: 5 };
  const tasks = ledger?.tasks || [];
  const excludedStatuses = ['ANDROID_TESTED', 'RELEASE_APPROVED', 'CI_TESTED', 'SOURCE_TESTED'];

  const activeTasks = tasks.filter(x => x && !excludedStatuses.includes(x.CURRENT_STATUS));

  const getPriorityScore = p => (p === 'P0' ? 0 : p === 'P1' ? 1 : 2);

  const sortedTasks = activeTasks.slice().sort((a, b) => {
    const priorityDiff = getPriorityScore(a.PRIORITY) - getPriorityScore(b.PRIORITY);
    if (priorityDiff !== 0) return priorityDiff;

    const rankA = rank[a.CURRENT_STATUS] ?? 9;
    const rankB = rank[b.CURRENT_STATUS] ?? 9;
    const rankDiff = rankA - rankB;
    if (rankDiff !== 0) return rankDiff;

    return String(a.TASK_ID).localeCompare(String(b.TASK_ID), 'en', { numeric: true });
  });

  const limitedTasks = sortedTasks.slice(0, limit);

  return limitedTasks.map(x => ({
    TASK_ID: x.TASK_ID,
    PRIORITY: x.PRIORITY,
    CURRENT_STATUS: x.CURRENT_STATUS,
    ANDROID_RESULT: x.ANDROID_RESULT || 'NOT_TESTED',
    NEXT_ACTION: String(x.NEXT_ACTION || '').slice(0, 300)
  }));
}
function validateChanges(paths){
 if(!Array.isArray(paths))throw Error('unsafe change list');
 const unique=[...new Set(paths.map(x=>String(x).trim()).filter(Boolean))];
 for(const f of unique)if(!ALLOWED_GENERATED.includes(f))throw Error('unsafe automatic edit: '+f);
 return unique;
}
function applySafeFix(root,execute=cp.spawnSync){
 const r=execute(process.execPath,['tools/control_center/generate_style.cjs','--write'],
 {cwd:root,shell:false,encoding:'utf8',timeout:25000,maxBuffer:1024*1024});
 if(r.error||r.status!==0)throw Error('Safe generator failed: '+(r.error?.message||r.stderr||r.stdout||r.status));
 return {scope:ALLOWED_GENERATED.slice(),review_required:true};
}
function readOverlay(root){
 const filename=path.join(root,'docs/master_completion/LEDGER_197.json');
 try{const r=JSON.parse(fs.readFileSync(filename,'utf8'));return Array.isArray(r.tasks)?r:null;}
 catch(e){if(e.code==='ENOENT')return null;throw e;}
}
function buildReport(root,{sourceSha,mode='audit',now=new Date().toISOString()}={}){
 if(!isSha(sourceSha))throw Error('Exact 40-character source SHA required');
 const matrix=assertMatrix(readMatrix(fs.readFileSync(path.join(root,'docs/recovery_integration/FINAL_MATRIX_161.md'),'utf8')));
 const overlay=readOverlay(root);
 const fallback={tasks:matrix.rows.map(r=>({TASK_ID:r.id,PRIORITY:/^DF-(0[0-8]|1[2-6])/.test(r.id)?'P0':'P1',CURRENT_STATUS:r.status,ANDROID_RESULT:'NOT_TESTED',NEXT_ACTION:'Re-evaluate original Issue #13 item and device evidence'}))};
 return {schema_version:1,generated_at:now,source_sha:sourceSha,mode,verification:'CHECKED_OUT_SOURCE_ONLY',
  device_qa:'NOT_TESTED',release_approved:false,
  tasks:{total:matrix.rows.length,...matrix.status,expanded_total:overlay?.tasks?.length||null},
  next_work:queue(overlay||fallback),automation_scope:{automatic_changes:ALLOWED_GENERATED,requires_review:true,production_deploy:false},
  blockers:['Nature recording sources/licenses and Android playback unverified','Physical v21 backup/restore and WebView interactions unverified','20-language rendered UI coverage incomplete','Production requires human review']};
}
function toMarkdown(r){
 return ['# Deep Focus daily engineering QA','',
 'Source SHA: '+r.source_sha,'Mode: '+r.mode,'Generated: '+r.generated_at,'',
 '**Release: NOT APPROVED; Android acceptance: NOT_TESTED.**','',
 'Tasks: '+r.tasks.total+' / BLOCKED '+r.tasks.BLOCKED+' / IN_PROGRESS '+r.tasks.IN_PROGRESS+' / TESTED '+r.tasks.TESTED,
 'Extended inventory: '+(r.tasks.expanded_total??'unavailable'),'', '## Next tasks','',
 ...r.next_work.map(x=>'- '+x.TASK_ID+' ['+x.PRIORITY+' / '+x.CURRENT_STATUS+']: '+x.NEXT_ACTION),
 '', '## Release blockers','',...r.blockers.map(x=>'- '+x),'',
 'Only generated appearance CSS may change automatically; application code needs reviewed PR.',''].join('\n');
}
function parseArgs(argv){
 const a={};for(let i=0;i<argv.length;i+=2){
 if(!['--root','--mode','--out'].includes(argv[i])||!argv[i+1])throw Error('Usage: --root DIR --mode audit|safe-fix --out DIRECTORY');
 a[argv[i].slice(2)]=argv[i+1];}
 if(!a.root||!a.out||!['audit','safe-fix'].includes(a.mode))throw Error('Invalid mode or missing root/output');
 return a;
}
function main(argv=process.argv.slice(2)){
 const a=parseArgs(argv),root=path.resolve(a.root),out=path.resolve(a.out);
 if(root===out||out.startsWith(root+path.sep))throw Error('Output must stay outside source checkout');
 const sha=cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',timeout:5000}).trim();
 buildReport(root,{sourceSha:sha,mode:a.mode}); // fail before changes on malformed ledger
 if(a.mode==='safe-fix')applySafeFix(root);
 const report=buildReport(root,{sourceSha:sha,mode:a.mode});
 fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,'daily-health.json'),JSON.stringify(report,null,2)+'\n');
 fs.writeFileSync(path.join(out,'daily-health.md'),toMarkdown(report)+'\n');
 process.stdout.write('Daily QA: '+report.tasks.total+' source tasks at '+sha+'\n');
}
if(require.main===module){try{main();}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={ALLOWED_GENERATED,readMatrix,assertMatrix,queue,validateChanges,applySafeFix,readOverlay,buildReport,toMarkdown,parseArgs,main};