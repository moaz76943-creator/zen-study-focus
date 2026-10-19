'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const app=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/assets/web/app.js'),'utf8');
const begin=app.indexOf('function validateImportedBackup(');
const end=app.indexOf('function verifyAndRestoreBackupCode(',begin);
if(begin<0||end<0)throw new Error('Legacy import boundary changed; review test harness before approval');
const validator=vm.runInNewContext(
  app.slice(begin,end)+'\nvalidateImportedBackup;',
  {cfg:{lang:'en',sessions:0,streak:0,water:0,todayMins:0},LANG_CATALOG:[{code:'en'}]},
  {timeout:2000}
);
const sample=()=>({
  v:21,cfg:{lang:'en',sessions:0,streak:0,water:0,todayMins:0},
  tasksList:[{id:100,title:'Synthetic task',done:false}],
  notesList:[{id:200,title:'Synthetic note',body:'Synthetic body'}]
});
test('legacy importer still accepts valid numeric v21 IDs',()=>{
  const result=validator(sample());
  assert.ok(result);
  assert.equal(result.notesList[0].id,200);
});
test('SEC-P1 reject numeric-string IDs before importing untrusted backup',()=>{
  const value=sample();value.notesList[0].id='200';
  assert.equal(validator(value),null,'Numeric-string IDs must not enter v21 records');
});
test('SEC-P1 reject duplicated record IDs before replacing notes or tasks',()=>{
  const value=sample();value.tasksList.push({...value.tasksList[0],title:'ambiguous'});
  assert.equal(validator(value),null,'Imported duplicate tasks cannot be safely edited by ID');
});
test('malformed JSON/object shape is rejected without calling any storage API',()=>{
  for(const bad of [null,{},[],{...sample(),notesList:{}},{...sample(),v:20}])
    assert.equal(validator(bad),null);
});
