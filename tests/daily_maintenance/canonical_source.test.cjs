'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {verifyCanonicalPr}=require('../../tools/daily_maintenance/canonical_source.cjs');
const repo='moaz76943-creator/zen-study-focus';
const ref='integration/master-recovery-20261021';
const sha='a'.repeat(40);
const pr={number:138,state:'open',head:{sha,ref,repo:{full_name:repo}}};
test('exact canonical PR head is accepted',()=>assert.equal(verifyCanonicalPr(pr,repo,ref),sha));
test('stale checked-out SHA blocks green evidence',()=>assert.throws(()=>verifyCanonicalPr(pr,repo,ref,'b'.repeat(40)),/advanced|mismatch/i));
test('wrong head repo or branch is rejected',()=>{
 assert.throws(()=>verifyCanonicalPr({...pr,head:{...pr.head,ref:'old'}},repo,ref),/branch|ref/i);
 assert.throws(()=>verifyCanonicalPr({...pr,head:{...pr.head,repo:{full_name:'other/repo'}}},repo,ref),/repo/i);
});
test('closed PR or bad SHA does not count as active source',()=>{
 assert.throws(()=>verifyCanonicalPr({...pr,state:'closed'},repo,ref),/open/i);
 assert.throws(()=>verifyCanonicalPr({...pr,head:{...pr.head,sha:'branch'}},repo,ref),/SHA/i);
});
test('missing or unexpected PR is fail-closed',()=>{
 assert.throws(()=>verifyCanonicalPr(null,repo,ref),/canonical|PR/i);
 assert.throws(()=>verifyCanonicalPr({...pr,number:137},repo,ref),/canonical|PR/i);
});
test('scheduled QA flows pin and re-validate official integration HEAD without relying on PR #138',()=>{
 const root=path.resolve(__dirname,'../..');
 for(const filename of ['.github/workflows/hourly_agent_orchestrator.yml','.github/workflows/daily_maintenance.yml']){
  const workflow=fs.readFileSync(path.join(root,filename),'utf8');
  assert.match(workflow,/integration\/master-qa-verified-v21/);
  assert.match(workflow,/steps\.resolve\.outputs\.sha/);
  assert.match(workflow,/official_source_guard\.cjs/);
  assert.doesNotMatch(workflow,/integration\/master-recovery-20261021/);
  assert.doesNotMatch(workflow,/pull_number:policy\.CANONICAL_PR/);
  assert.doesNotMatch(workflow,/steps\.resolve\.outputs\.sha \|\| env\.SOURCE_REF/);
 }
});
