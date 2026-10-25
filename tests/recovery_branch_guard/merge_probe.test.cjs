'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const probe=require('../../tools/recovery_branch_guard/merge_probe.cjs');
const git=(dir,...args)=>cp.execFileSync('git',args,{cwd:dir,encoding:'utf8'}).trim();
function newRepo(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'df-merge-'));
 git(dir,'init','-q','-b','main');git(dir,'config','user.name','Test');
 git(dir,'config','user.email','test@example.com');
 fs.writeFileSync(path.join(dir,'base.txt'),'base\n');
 git(dir,'add','.');git(dir,'commit','-qm','base');return dir;
}
test('independent additions are mergeable but are never release approval',()=>{
 const dir=newRepo();try{
  git(dir,'branch','a');git(dir,'branch','b');
  git(dir,'checkout','-q','a');fs.writeFileSync(path.join(dir,'a.txt'),'a');git(dir,'add','.');git(dir,'commit','-qm','a');
  git(dir,'checkout','-q','b');fs.writeFileSync(path.join(dir,'b.txt'),'b');git(dir,'add','.');git(dir,'commit','-qm','b');
  const x=probe.probe(dir,git(dir,'rev-parse','a'),git(dir,'rev-parse','b'));
  assert.equal(x.merge_status,'AUTO_MERGE_POSSIBLE');assert.deepEqual(x.overlapping_files,[]);
  assert.equal(x.release_approved,false);assert.equal(x.android_accepted,false);
  assert.equal(x.ahead_recovery,1);assert.equal(x.ahead_android,1);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('conflict is reported, neither branch nor worktree is modified',()=>{
 const dir=newRepo();try{
  git(dir,'branch','a');git(dir,'branch','b');
  git(dir,'checkout','-q','a');fs.writeFileSync(path.join(dir,'base.txt'),'one\n');git(dir,'commit','-qam','a');
  git(dir,'checkout','-q','b');fs.writeFileSync(path.join(dir,'base.txt'),'two\n');git(dir,'commit','-qam','b');
  const a=git(dir,'rev-parse','a'),b=git(dir,'rev-parse','b');
  const x=probe.probe(dir,a,b);
  assert.equal(x.merge_status,'CONFLICTS_DETECTED');assert.deepEqual(x.overlapping_files,['base.txt']);
  assert.equal(git(dir,'rev-parse','a'),a);assert.equal(git(dir,'rev-parse','b'),b);
  assert.equal(git(dir,'status','--porcelain'),'');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('ref injection and non-SHA inputs fail closed',()=>{
 assert.equal(probe.validSha('a'.repeat(40)),true);
 assert.equal(probe.validSha('HEAD'),false);
 assert.throws(()=>probe.probe('.', 'HEAD', 'main'),/SHA/i);
});
test('overlap is stable and deduplicated',()=>{
 assert.deepEqual(probe.overlap(['a','b','b'],['b','c']),['b']);
});
