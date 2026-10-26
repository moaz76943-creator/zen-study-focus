import test from 'node:test';
import assert from 'node:assert/strict';
import {eligible, validateChangedFiles, TARGET, stagedChanges} from '../../tools/ai_agents/guard.mjs';

const ok = {state:'open', number:22, labels:[{name:'agent-ready'},{name:'agent-safe'}]};
const changes = [
 {status:'M',path:'tools/daily_maintenance/evidence_integrity_guard.cjs',added:8,deleted:2},
 {status:'A',path:'tests/integration_quality/new_regression.test.cjs',added:20,deleted:0}
];

test('requires two opt-in labels on an open issue',()=>{
 assert.equal(eligible(ok),true);
 assert.equal(eligible({...ok,labels:[{name:'agent-ready'}]}),false);
 assert.equal(eligible({...ok,pull_request:{url:'x'}}),false);
 assert.equal(eligible({...ok,state:'closed'}),false);
});
test('excludes unsafe issue labels',()=>{
 for(const name of ['p0','security','release','privacy','data-loss','native-android','saf','blocked'])
  assert.equal(eligible({...ok,labels:[...ok.labels,{name}]}),false,name);
});
test('accepts small test-first source changes only',()=>{
 assert.deepEqual(validateChangedFiles(changes),{files:2,changed:30});
 assert.equal(TARGET,'integration/master-qa-verified-v21');
});
test('rejects app/workflow/binary/rename/deletion/oversize/testless changes',()=>{
 for(const item of [
  {status:'M',path:'android/app/src/main/assets/web/app.js',added:1,deleted:1},
  {status:'M',path:'.github/workflows/a.yml',added:1,deleted:1},
  {status:'R',path:'tools/daily_maintenance/a.cjs',added:1,deleted:1},
  {status:'D',path:'tools/daily_maintenance/a.cjs',added:0,deleted:1},
  {status:'A',path:'tools/daily_maintenance/../../android/a',added:1,deleted:0},
  {status:'A',path:'tools/daily_maintenance/binary',added:NaN,deleted:0}
 ]) assert.throws(()=>validateChangedFiles([...changes,item]));
 assert.throws(()=>validateChangedFiles(changes.slice(0,1)));
 assert.throws(()=>validateChangedFiles(changes.map(x=>({...x,added:151}))));
 assert.throws(()=>validateChangedFiles([...changes,...Array(5).fill(changes[0])]));
});

test('parses real staged Git -z diff output',async()=>{
 const {mkdtempSync,mkdirSync,writeFileSync,rmSync}=await import('node:fs');
 const {tmpdir}=await import('node:os');
 const {join}=await import('node:path');
 const {execFileSync}=await import('node:child_process');
 const cwd=mkdtempSync(join(tmpdir(),'df-agent-test-'));
 try {
  const git=(...args)=>execFileSync('git',args,{cwd});
  git('init','-q');git('config','user.email','bot@example.invalid');git('config','user.name','Bot');
  mkdirSync(join(cwd,'tools/daily_maintenance'),{recursive:true});
  mkdirSync(join(cwd,'tests/integration_quality'),{recursive:true});
  writeFileSync(join(cwd,'tools/daily_maintenance/demo.cjs'),'const a=1;\n');
  git('add','.');git('commit','-qm','baseline');
  writeFileSync(join(cwd,'tools/daily_maintenance/demo.cjs'),'const a=2;\n');
  writeFileSync(join(cwd,'tests/integration_quality/demo.test.cjs'),'import assert from "node:assert";\n');
  git('add','-A');
  assert.deepEqual(validateChangedFiles(stagedChanges(cwd)),{files:2,changed:3});
 }finally{rmSync(cwd,{recursive:true,force:true});}
});
