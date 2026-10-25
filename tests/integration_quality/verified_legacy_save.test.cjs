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
  removeItem:key=>map.delete(key)
 };
 const ctx=vm.createContext({localStorage:store,Date,JSON});
 vm.runInContext(saveCode,ctx,{timeout:1000});
 return {save:v=>vm.runInContext('saveFortressData("zen_fortress_notes_v21",'+JSON.stringify(v)+')',ctx),
  map,control,decode:key=>JSON.parse(map.get(key))};
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
