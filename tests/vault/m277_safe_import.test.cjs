'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const app=fs.readFileSync(path.join(__dirname,'../../android/app/src/main/assets/web/app.js'),'utf8');
const start=app.indexOf('/* === M277_FULL_VAULT_BACKUP_EXPORT_IMPORT_AND_CODE97_V1 === */');
const next=app.indexOf('/* === M278_',start);
assert.ok(start>=0&&next>start);
const moduleText=app.slice(start,next);
function fixture(seed={},failureAt=Infinity){
 const map=new Map(Object.entries(seed)),before=()=>Object.fromEntries(map);
 let counter=0;
 const storage={
  getItem:k=>map.has(k)?map.get(k):null,
  setItem(k,v){if(++counter===failureAt)throw Error('disk failure');map.set(k,String(v))},
  removeItem:k=>map.delete(k)
 };
 const sandbox={window:{},localStorage:storage,console,JSON,Date,Blob,URL};
 vm.runInNewContext(moduleText,sandbox,{filename:'M277 actual source'});
 const payload=(vocab=[{id:'new'}],hist=[{id:'review'}])=>JSON.stringify({app:'Deep Focus',packageId:'com.deepfocus.study',schemaVersion:'v4.0.7',vault:{vocabBank:vocab,studyHistory:hist,dailyGoal:5,settings:{oledTrueBlack:true,halfwayChime:false}}});
 return {w:sandbox.window,store:storage,before,payload,map};
}
test('rejects missing lists without clearing existing vocabulary',()=>{
 const f=fixture({'df_vocab_bank_v1':'[{"id":"old"}]'}),before=f.before();
 const result=f.w.dfValidateAndImportVaultJson(JSON.stringify({app:'Deep Focus',schemaVersion:'v4.0.7',vault:{}}));
 assert.equal(result.success,false);assert.deepEqual(f.before(),before);
});
test('refuses empty replacement of populated vocabulary',()=>{
 const f=fixture({'df_vocab_bank_v1':'[{"id":"old"}]'});
 const r=f.w.dfValidateAndImportVaultJson(f.payload([],[]));
 assert.equal(r.success,false);assert.equal(f.store.getItem('df_vocab_bank_v1'),'[{"id":"old"}]');
});
test('successful valid import updates the intended vocabulary keys only',()=>{
 const f=fixture({'user-notes-private':'keep'}),r=f.w.dfValidateAndImportVaultJson(f.payload());
 assert.equal(r.success,true);assert.equal(f.store.getItem('user-notes-private'),'keep');
 assert.equal(JSON.parse(f.store.getItem('df_vocab_bank_v1')).length,1);
 assert.equal(f.store.getItem('df_vocab_daily_goal_v1'),'5');
 assert.equal(f.store.getItem('df_vocab_import_journal_v2'),null);
});
test('failed partial write rolls all modified values back',()=>{
 const old={'df_vocab_bank_v1':'[{"id":"old"}]','df_vocab_study_history_v1':'[{"id":"old-history"}]','df_vocab_daily_goal_v1':'8','user-notes-private':'keep'};
 const f=fixture(old,3),r=f.w.dfValidateAndImportVaultJson(f.payload());
 assert.equal(r.success,false);assert.deepEqual(f.before(),old);
});
test('unfinished journal is recovered on next startup',()=>{
 const old={'df_vocab_bank_v1':'[{"id":"old"}]','df_vocab_study_history_v1':'[]'};
 const journal={schema:'DF_M277_SAFE_JOURNAL_IMPORT_V2',before:old,keys:Object.keys(old)};
 const f=fixture({...old,'df_vocab_bank_v1':'[{"id":"partial"}]','df_vocab_import_journal_v2':JSON.stringify(journal)});
 assert.equal(f.store.getItem('df_vocab_bank_v1'),'[{"id":"old"}]');
 assert.equal(f.store.getItem('df_vocab_import_journal_v2'),null);
});
