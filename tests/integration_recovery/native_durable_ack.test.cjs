'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const web=path.resolve(__dirname,'../../android/app/src/main/assets/web'),src=f=>fs.readFileSync(path.join(web,f),'utf8'),D=require('../../android/app/src/main/assets/web/data_compat_v21.js');
function rig({reject=false}={}){
 let disk=new Map(),checkpoint=null;
 const bridge={acknowledgeDurableV21(p){if(reject)return false;checkpoint=p;return true;},readDurableV21(){return checkpoint===null?'NONE':checkpoint;}};
 function boot(){
  const memory=new Map(disk),storage={getItem:k=>memory.get(k)??null,setItem(k,v){memory.set(k,String(v));},removeItem:k=>memory.delete(k)};
  const context=vm.createContext({localStorage:storage,ZenNative:bridge,DeepFocusDataCompatV21:D,
   cfg:{lang:'en',sessions:0,sessionHistory:[],unknownCfg:5},
   tasksList:[{id:1,title:'Root',done:false,other:{x:42},checklist:[{id:11,title:'Check',done:false}]}],
   notesList:[{id:2,title:'Note',body:'Unmodified',extra:'keep'}],Date,Map,Set});
  context.window=context;
  vm.runInContext(src('preflight_v22.js'),context);
  if(!context.DF22Preflight.allowApp(storage,null))return {context,storage,started:false};
  for(const [slot,field] of [['cfg','cfg'],['tasks','tasksList'],['notes','notesList']]){
   const raw=storage.getItem(D.KEYS[slot]);if(raw)context[field]=D.inspectPacket(raw).value;
  }
  vm.runInContext(src('integration_v22.js'),context);
  return {context,storage,started:true};
 }
 const flush=s=>{disk=new Map();for(const k of [...Object.values(D.KEYS).flatMap(k=>[k,k+'_mirror']),D.JOURNAL_KEY]){const v=s.getItem(k);if(v!==null)disk.set(k,v);}};
 const toggle=(c,value)=>vm.runInContext('(()=>{const before=DF22Integration.getSnapshot(),after=JSON.parse(JSON.stringify(before));after.tasksList[0].checklist[0].done='+value+';return DF22Integration.write(before,after)})()',c);
 return {boot,flush,toggle,bridge,checkpoint:()=>checkpoint};
}
test('newest acknowledged checklist survives a process kill even when WebView disk has older packets',()=>{
 const r=rig(),a=r.boot();assert.equal(r.toggle(a.context,true),true);
 assert.equal(D.inspectPacket(a.storage.getItem(D.KEYS.tasks)).value[0].checklist[0].done,true);
 const b=r.boot();assert.equal(b.started,true);
 assert.equal(b.context.tasksList[0].checklist[0].done,true);
 assert.equal(b.context.tasksList[0].checklist[0].id,11);
 assert.equal(b.context.tasksList[0].other.x,42);
 assert.equal(b.context.notesList[0].extra,'keep');
 assert.equal(b.context.cfg.unknownCfg,5);
 assert.equal(b.storage.getItem(D.KEYS.tasks),b.storage.getItem(D.KEYS.tasks+'_mirror'));
});
test('rapid checklist edits keep only the final acknowledged state after immediate kill',()=>{
 const r=rig(),a=r.boot();assert.equal(r.toggle(a.context,true),true);
 assert.equal(r.toggle(a.context,false),true);
 assert.equal(r.toggle(a.context,true),true);
 assert.equal(r.boot().context.tasksList[0].checklist[0].done,true);
});
test('native ACK failure blocks publish and preserves old records and journal cleanup',()=>{
 const r=rig({reject:true}),a=r.boot();
 assert.throws(()=>r.toggle(a.context,true),/NATIVE_DURABLE_ACK_FAILED/);
 assert.equal(a.context.tasksList[0].checklist[0].done,false);
 assert.equal(a.storage.getItem(D.KEYS.tasks),null);
 assert.equal(a.storage.getItem(D.JOURNAL_KEY),null);
});
test('interrupted journal is replayed only when native checkpoint matches a journal side',()=>{
 const r=rig(),a=r.boot();assert.equal(r.toggle(a.context,true),true);
 const expected=JSON.parse(r.checkpoint()).packets;
 const original=Object.fromEntries(Object.values(D.KEYS).flatMap(k=>[[k,null],[k+'_mirror',null]]));
 a.storage.setItem(D.JOURNAL_KEY,JSON.stringify({version:1,state:'committed',original,expected}));
 r.flush(a.storage);
 const b=r.boot();assert.equal(b.started,true);
 assert.equal(b.context.tasksList[0].checklist[0].done,true);
 assert.equal(b.storage.getItem(D.JOURNAL_KEY),null);
});
test('corrupt native checkpoint fails closed without deleting valid local storage',()=>{
 const r=rig(),a=r.boot();assert.equal(r.toggle(a.context,true),true);r.flush(a.storage);
 const original=a.storage.getItem(D.KEYS.tasks);r.bridge.readDurableV21=()=>'{not-json';
 const b=r.boot();assert.equal(b.started,false);assert.equal(b.storage.getItem(D.KEYS.tasks),original);
});
test('a failed mirror write cannot advance the native checkpoint',()=>{
 const r=rig(),a=r.boot();assert.equal(r.toggle(a.context,true),true);r.flush(a.storage);
 const b=r.boot(),original=r.checkpoint(),set=b.storage.setItem.bind(b.storage);
 let once=true;b.storage.setItem=(k,v)=>{if(k===D.KEYS.tasks+'_mirror'&&once){once=false;throw Error('InjectedMirror');}set(k,v);};
 assert.throws(()=>r.toggle(b.context,false),/InjectedMirror/);
 assert.equal(r.checkpoint(),original);
 assert.equal(r.boot().context.tasksList[0].checklist[0].done,true);
});
