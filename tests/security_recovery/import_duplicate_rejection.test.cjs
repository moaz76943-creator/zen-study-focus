'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../../android/app/src/main/assets/web/data_compat_v21.js');
const snapshot=()=>({cfg:{lang:'en',todayMins:25,sessions:1,sessionHistory:[]},
 tasksList:[{id:100,title:'Synthetic task',done:false}],
 notesList:[{id:200,title:'Synthetic note',body:'Inert text'}]});
const backup=x=>{const bundle=JSON.stringify({...x,v:21});return 'ZEN21::'+Buffer.from(JSON.stringify({bundle,sig:C.computeHash(bundle)}),'utf8').toString('base64');};
test('existing local duplicate records remain inspectable without changes',()=>{
 const value=snapshot();value.tasksList.push({...value.tasksList[0]});
 const raw=JSON.stringify(value),report=C.inspectRecords(value);
 assert.equal(report.ok,true);assert.ok(report.issues.some(x=>x.code==='DUPLICATE_ID'&&x.severity==='warning'));
 assert.equal(JSON.stringify(value),raw);
});
test('new imported backup rejects duplicate task IDs',()=>{
 const value=snapshot();value.tasksList.push({...value.tasksList[0],title:'Different'});
 const report=C.inspectBackup(backup(value));
 assert.equal(report.ok,false);assert.equal(report.snapshot,null);
 assert.ok(report.issues.some(x=>x.code==='DUPLICATE_IMPORT_ID'&&x.severity==='error'));
});
test('new imported backup rejects duplicate note IDs',()=>{
 const value=snapshot();value.notesList.push({...value.notesList[0],body:'Different'});
 const report=C.inspectBackup(backup(value));
 assert.equal(report.ok,false);assert.equal(report.snapshot,null);
 assert.ok(report.issues.some(x=>x.code==='DUPLICATE_IMPORT_ID'&&x.severity==='error'));
});
test('valid backup preserves unknown v21 fields and ID types',()=>{
 const value=snapshot();value.notesList[0].historicField={keep:1};
 const report=C.inspectBackup(backup(value));
 assert.equal(report.ok,true);assert.deepEqual(report.snapshot,value);
});
test('numeric string new-import IDs remain incompatible',()=>{
 const value=snapshot();value.tasksList[0].id='100';
 assert.equal(C.inspectBackup(backup(value)).ok,false);
});