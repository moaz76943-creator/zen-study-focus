'use strict';
// Regression for PR #124: a JSON serialization optimization must not migrate v21 packets.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const app=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/assets/web/app.js'),'utf8');
const start=app.indexOf('const SECRET_SALT =');
const end=app.indexOf("document.addEventListener('contextmenu'",start);
assert.ok(start>=0&&end>start,'extract actual production v21 writer/reader');
const production=app.slice(start,end);

function harness(){
 const map=new Map();
 const store={
  setItem(key,value){map.set(key,String(value));},
  getItem(key){return map.has(key)?map.get(key):null;},
  removeItem(key){map.delete(key);}
 };
 const context=vm.createContext({localStorage:store,Date:{now:()=>123456789}});
 vm.runInContext(production,context,{filename:'app.js:v21-packet-code'});
 return {context,store};
}

test('v21 JSON optimization retains a string payload and original exact wire representation',()=>{
 const {context,store}=harness();
 const key='zen_fortress_tasks_v21';
 const records=[{id:91,title:'ملاحظة عربي "quoted"\\ newline\n',unknown:{personal:'kept'},done:false}];
 context.saveFortressData(key,records);
 const primary=store.getItem(key);
 const packet=JSON.parse(primary);
 assert.equal(typeof packet.payload,'string','v21 payload is a serialized JSON string, not a new object schema');
 const raw=JSON.stringify(records);
 const sig=vm.runInContext('computeHash('+JSON.stringify(raw)+')',context);
 assert.equal(primary,JSON.stringify({payload:raw,sig,ts:123456789}));
 assert.equal(store.getItem(key+'_mirror'),primary);
 assert.equal(JSON.stringify(context.loadFortressData(key,[])),raw,'restore IDs and unknown fields unchanged');
});

test('signed primary corruption still falls back to the unmodified mirror',()=>{
 const {context,store}=harness();
 const key='zen_fortress_notes_v21';
 const notes=[{id:77,body:'Keep 💾',extension:{x:12}}];
 context.saveFortressData(key,notes);
 const good=store.getItem(key);
 const packet=JSON.parse(good);
 packet.payload='[]';
 store.setItem(key,JSON.stringify(packet));
 assert.equal(JSON.stringify(context.loadFortressData(key,[])),JSON.stringify(notes));
 assert.equal(store.getItem(key+'_mirror'),good);
});
