#!/usr/bin/env node
'use strict';
// Read-only branch relationship probe. git merge-tree writes no worktree or refs.
const cp=require('node:child_process'),fs=require('node:fs'),path=require('node:path');
const SHA=/^[a-f0-9]{40}$/i;
const validSha=x=>typeof x==='string'&&SHA.test(x);
const overlap=(a,b)=>[...new Set(a)].filter(x=>new Set(b).has(x)).sort();
function cmd(dir,args,{allowConflict=false}={}){
 const r=cp.spawnSync('git',args,{cwd:dir,encoding:'utf8',shell:false,timeout:30000,maxBuffer:2*1024*1024});
 if(r.error || (r.status!==0&&!(allowConflict&&r.status===1)))
  throw Error('Git command failed: '+args[0]+' '+(r.error?.message||r.stderr||r.status));
 return r;
}
function probe(dir,recovery,android){
 if(!validSha(recovery)||!validSha(android))throw Error('Exact 40-character SHA required for both sources');
 const base=cmd(dir,['merge-base',recovery,android]).stdout.trim();
 if(!validSha(base))throw Error('Invalid Git merge base');
 const changed=ref=>cmd(dir,['diff','--name-only',base,ref]).stdout.trim().split('\n').filter(Boolean);
 const one=changed(recovery),two=changed(android);
 const merge=cmd(dir,['merge-tree','--write-tree',recovery,android],{allowConflict:true});
 const result={
  schema_version:1,recovery_sha:recovery,android_sha:android,merge_base:base,
  ahead_recovery:Number(cmd(dir,['rev-list','--count',base+'..'+recovery]).stdout.trim()),
  ahead_android:Number(cmd(dir,['rev-list','--count',base+'..'+android]).stdout.trim()),
  touched_recovery:one.length,touched_android:two.length,
  overlapping_files:overlap(one,two),
  merge_status:merge.status===0?'AUTO_MERGE_POSSIBLE':'CONFLICTS_DETECTED',
  merge_diagnostics:merge.status===0?'':(merge.stdout+'\n'+merge.stderr).slice(-16000),
  source_qa:'NOT_RUN',android_accepted:false,media_rights_approved:false,
  backup_restore_approved:false,release_approved:false,
  note:'3-way source probe only; a clean Git merge is not proof of working Android, rights, or production readiness.'
 };
 return result;
}
function markdown(x){
 return [
  '# Deep Focus source consolidation conflict probe','',
  'Recovery SHA: '+x.recovery_sha,
  'Android/Notes SHA: '+x.android_sha,
  'Common ancestor: '+x.merge_base,'',
  'Git 3-way outcome: **'+x.merge_status+'**',
  'Recovery-only commits since common ancestor: '+x.ahead_recovery,
  'Android-side commits since common ancestor: '+x.ahead_android,
  'Files touched on each side: '+x.touched_recovery+' / '+x.touched_android,
  'Files touched on BOTH sides: '+x.overlapping_files.length,'',
  '## Both-side file ownership / review required','',
  ...(x.overlapping_files.length?x.overlapping_files.map(y=>'- `'+y.replace(/`/g,'')+'`'):['No common filenames; still test the combined app.']),
  '', '## Merge-tree diagnostics', '',
  x.merge_diagnostics||'No 3-way text conflicts reported (NOT production approval).',
  '', '**Android, media, backup, full localization, human review and release remain NOT APPROVED.**',''
 ].join('\n');
}
function main(){
 const args=process.argv.slice(2);
 if(args.length!==3||!validSha(args[0])||!validSha(args[1]))throw Error('Usage: merge_probe.cjs RECOVERY_SHA ANDROID_SHA OUT_DIRECTORY');
 const out=path.resolve(args[2]),cwd=process.cwd();
 if(out===cwd||!out.startsWith(cwd+path.sep))throw Error('Reports must be in an isolated output subdirectory');
 const x=probe(cwd,args[0],args[1]);
 fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(x,null,2)+'\n');
 fs.writeFileSync(path.join(out,'report.md'),markdown(x));
 process.stdout.write('Deep Focus integration conflict status: '+x.merge_status+', files jointly touched: '+x.overlapping_files.length+'\n');
 // Never claim release approval; conflict is a required human review, not a GitHub Action failure.
}
if(require.main===module){try{main();}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={validSha,overlap,probe,markdown};
