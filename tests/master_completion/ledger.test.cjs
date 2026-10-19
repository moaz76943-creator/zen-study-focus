'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),ledger=require('../../docs/master_completion/LEDGER_197.json');
test('all original 161 and additional 36 tasks exist exactly once with accountable fields',()=>{
 const expected=[...Array.from({length:161},(_,i)=>'DF-'+String(i+1).padStart(3,'0')),...Array.from({length:36},(_,i)=>'DF4-'+String(i+1).padStart(3,'0'))];
 assert.deepEqual(ledger.tasks.map(t=>t.TASK_ID).sort(),expected.sort());
 for(const t of ledger.tasks)for(const key of ['PRIORITY','PREVIOUS_STATUS','CURRENT_STATUS','FILES_CHANGED','COMMIT_SHA','TEST_COMMAND','TEST_RESULT','ANDROID_RESULT','EVIDENCE','BLOCKER','NEXT_ACTION','OWNER_ROLE'])assert.ok(Object.hasOwn(t,key),t.TASK_ID+' '+key);
});
test('current states separate source and Android evidence and never grant unsupported release approval',()=>{
 const allowed=['TODO','IN_PROGRESS','IMPLEMENTED','SOURCE_TESTED','CI_TESTED','ANDROID_TESTED','BLOCKED','RELEASE_APPROVED'];
 assert.equal(ledger.release_approved,false);
 for(const t of ledger.tasks){
  assert.ok(allowed.includes(t.CURRENT_STATUS),t.TASK_ID);
  assert.ok(['PASS','FAIL','NOT_TESTED'].includes(t.TEST_RESULT));assert.ok(['PASS','FAIL','NOT_TESTED'].includes(t.ANDROID_RESULT));
  assert.notEqual(t.CURRENT_STATUS,'RELEASE_APPROVED');
  if(t.CURRENT_STATUS==='SOURCE_TESTED'){assert.equal(t.TEST_RESULT,'PASS');assert.ok(t.COMMIT_SHA.length>0&&t.EVIDENCE.length>0);}
  if(t.CURRENT_STATUS==='ANDROID_TESTED')assert.equal(t.ANDROID_RESULT,'PASS');
 }
});
test('changed-file and scoped evidence links refer to actual source files and commits',()=>{
 for(const t of ledger.tasks){
  for(const p of [...t.FILES_CHANGED,...t.EVIDENCE])assert.ok(fs.existsSync(path.join(root,p)),t.TASK_ID+': '+p);
  for(const sha of t.COMMIT_SHA)assert.match(sha,/^[a-f0-9]{40}$/);
  assert.ok(t.NEXT_ACTION.length>20);assert.ok(t.BLOCKER.length>15);
 }
});
