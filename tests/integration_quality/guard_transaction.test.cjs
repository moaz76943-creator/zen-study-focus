'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const dir=path.resolve(__dirname,'../../android/app/src/main/assets/web');
const compat=require(path.join(dir,'data_compat_v21.js'));
const code=fs.readFileSync(path.join(dir,'data_write_guard_v21.js'),'utf8');
function fixture(seed={}){
 const data=new Map(Object.entries(seed));let failKey=null;
 const storage={
  getItem:k=>data.has(k)?data.get(k):null,
  setItem:(k,v)=>{if(k===failKey){failKey=null;throw new Error('QuotaExceededError');}data.set(k,String(v));},
  removeItem:k=>data.delete(k)
 };
 const ctx={localStorage:storage,DeepFocusDataCompatV21:compat,confirm:()=>true,alert:()=>{}};
 ctx.window=ctx;vm.runInNewContext(code,ctx,{filename:'data_write_guard_v21.js',timeout:2000});
 return {storage,guard:ctx.DeepFocusV21StorageGuard,data,failOn:k=>failKey=k};
}
const k=compat.KEYS;
test('canonical primary and mirror receive the same valid packet',()=>{
 const f=fixture(),items=[{id:7,title:'Read',body:'Content',catKey:'quick'}];
 assert.equal(f.guard.write(k.notes,items),true);
 assert.equal(f.data.get(k.notes),f.data.get(k.notes+'_mirror'));
 assert.deepEqual(compat.inspectPacket(f.data.get(k.notes)).value,items);
 assert.equal(f.data.has(compat.JOURNAL_KEY),false);
});
test('multi-family write is rolled back if second mirror fails',()=>{
 const f=fixture(),n=[{id:3,title:'Notes',body:'Before'}],t=[{id:4,title:'Task',done:false}];
 f.guard.write(k.notes,n);f.guard.write(k.tasks,t);
 const baseline=Object.fromEntries([...f.data]);
 f.failOn(k.tasks+'_mirror');
 assert.throws(()=>f.guard.writeCanonical({[k.notes]:[{...n[0],body:'After'}],[k.tasks]:[{...t[0],done:true}]},
  {[k.notes]:n,[k.tasks]:t}),/QuotaExceededError/);
 assert.deepEqual(Object.fromEntries([...f.data]),baseline);
 assert.equal(f.guard.blocked,false);
});
test('stale editor cannot overwrite a concurrent valid note update',()=>{
 const f=fixture(),original=[{id:1,title:'Note',body:'First'}];
 f.guard.write(k.notes,original);f.guard.write(k.notes,[{...original[0],body:'Fresh'}]);
 assert.throws(()=>f.guard.writeCanonical({[k.notes]:[{...original[0],body:'Stale'}]},
  {[k.notes]:original}),/STALE_EDITOR_SNAPSHOT/);
 assert.equal(compat.inspectPacket(f.data.get(k.notes)).value[0].body,'Fresh');
});
test('pending migration recovery requires explicit choice before any writer proceeds',()=>{
 const first=fixture(),original=compat.captureRaw(first.storage);
 const journal={version:1,state:'pending',original,expected:{[k.notes]:compat.encodePacket([{id:1,title:'X',body:'Y'}])}};
 first.storage.setItem(compat.JOURNAL_KEY,JSON.stringify(journal));
 const ctx={localStorage:first.storage,DeepFocusDataCompatV21:compat,confirm:()=>false,alert:()=>{}};
 ctx.window=ctx;vm.runInNewContext(code,ctx,{filename:'data_write_guard_v21.js',timeout:2000});
 assert.equal(ctx.DeepFocusV21StorageGuard.blocked,true);
 assert.throws(()=>ctx.DeepFocusV21StorageGuard.write(k.notes,[]),/STORAGE_RECOVERY_REQUIRED/);
 assert.equal(first.storage.getItem(compat.JOURNAL_KEY),JSON.stringify(journal));
});
