'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/assets/web/app.js'),'utf8');
const start=src.indexOf('const SECRET_SALT = '),end=src.indexOf('function loadFortressData(',start);
assert.ok(start>=0&&end>start,'Extract exactly the shipped legacy packet functions');
const saveCode=src.slice(start,end);
function fixture(){
 const map=new Map(),control={failKey:null,noOpKey:null};
 const store={
  getItem:key=>map.has(key)?map.get(key):null,
  setItem(key,value){
   if(key===control.failKey){control.failKey=null;throw new Error('QuotaExceededError');}
   if(key===control.noOpKey)return;
   map.set(key,String(value));
  },
  removeItem:key=>{
   if(key===control.rollbackFailKey)throw new Error('Rollback failure');
   map.delete(key);
  }
 };
 const ctx=vm.createContext({localStorage:store,Date,JSON});
 ctx.window = {}; // Ensure window object is defined in the VM context.
 vm.runInContext(saveCode,ctx,{timeout:1000});
 return {save:(v,k="zen_fortress_notes_v21")=>vm.runInContext(`saveFortressData("${k}",`+JSON.stringify(v)+')',ctx),
  map,control,ctx,decode:key=>JSON.parse(map.get(key))};
}
const key='zen_fortress_notes_v21',mirror=key+'_mirror';
test('legacy save confirms both copies, preserving v21 payload and checksum packet',()=>{
 const f=fixture();
 assert.equal(f.save([{id:2,title:'عنوان',body:'النص'}]),true);
 assert.equal(f.map.get(key),f.map.get(mirror));
 assert.match(f.decode(key).sig,/^[0-9a-f]+$/);
 assert.equal(JSON.parse(f.decode(key).payload)[0].body,'النص');
});
test('legacy quota failure on mirror restores original primary+mirror byte for byte',()=>{
 const f=fixture(),base=[{id:2,title:'Original',body:'Intact'}];
 f.save(base);
 const original=[f.map.get(key),f.map.get(mirror)];
 f.control.failKey=mirror;
 assert.throws(()=>f.save([{id:2,title:'Changed',body:'New'}]),/QuotaExceededError/);
 assert.deepEqual([f.map.get(key),f.map.get(mirror)],original);
});
test('legacy storage silent no-op must fail instead of claiming save succeeded',()=>{
 const f=fixture();
 f.save([{id:2,title:'Old',body:'Old body'}]);
 const original=[f.map.get(key),f.map.get(mirror)];
 f.control.noOpKey=mirror;
 assert.throws(()=>f.save([{id:2,title:'New',body:'New body'}]),/STORAGE_WRITE_NOT_VERIFIED/);
 assert.deepEqual([f.map.get(key),f.map.get(mirror)],original);
});

test('saveFortressData rejects un-serializable values', () => {
 const f = fixture();
 // Use a circular structure which JSON.stringify cannot serialize
 const obj = {};
 obj.self = obj;
 assert.throws(() => f.save(obj), TypeError);
});

test('saveFortressData STORAGE_WRITE_FAILED_ROLLBACK_UNVERIFIED: failure during rollback', () => {
 const f = fixture();
 const key = 'zen_fortress_notes_v21';
 const mirrorKey = key + '_mirror';

 f.control.failKey = mirrorKey;
 f.control.rollbackFailKey = key;

 assert.throws(() => {
   f.save([{ id: 1 }]);
 }, /STORAGE_WRITE_FAILED_ROLLBACK_UNVERIFIED:zen_fortress_notes_v21/);
});

test('saveFortressData NATIVE_DURABLE_ACK_FAILED: throws when native sync fails for protected keys', () => {
 const f = fixture();
 const key = 'zen_fortress_cfg_v21'; // Ensure it's one of the protected keys

 // Mock native sync failure in the VM context
 vm.runInContext(`
   window.ZenNative = {};
   window.DF22Preflight = {
     nativeAcknowledge: () => false
   };
 `, f.ctx);

 assert.throws(() => {
   f.save([{ setting: true }], key);
 }, /NATIVE_DURABLE_ACK_FAILED/);
});
