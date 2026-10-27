'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const web=path.resolve(__dirname,'../../android/app/src/main/assets/web'),src=f=>fs.readFileSync(path.join(web,f),'utf8'),D=require('../../android/app/src/main/assets/web/data_compat_v21.js');
function rig({reject=false}={}){
 let disk=new Map(),checkpoint=null;
 const bridge={acknowledgeDurableV21(p){if(reject)return false;checkpoint=p;return true;},readDurableV21(){return checkpoint===null?'NONE':checkpoint;}};
 function boot(){
  const memory=new Map(disk),storage={getItem:k=>memory.get(k)??null,setItem(k,v){memory.set(k,String(v));},removeItem:k=>memory.delete(k)};
  const context=vm.createContext({localStorage:storage,ZenNative:bridge,cfg:{lang:'en',sessions:0,sessionHistory:[],unknownCfg:5},
   tasksList:[{id:1,title:'Root',done:false,other:{x:42},checklist:[{id:11,title:'Check',done:false}]}],
   notesList:[{id:2,title:'Note',body:'Unmodified',extra:'keep'}],Date,Map,Set});
  context.window=context;
  // Keep the contract in the SAME VM realm as application snapshots.
  vm.runInContext(src('data_compat_v21.js'),context);
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
test('native checkpoint replays over a matching interrupted journal',()=>{
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

test('checksum-valid but wrong-shaped task family cannot reach native durable ACK',()=>{
 const r=rig(),a=r.boot(),raw=D.encodePacket({id:71001,title:'signed but not a tasks array',done:false});
 a.storage.setItem(D.KEYS.tasks,raw);
 a.storage.setItem(D.KEYS.tasks+'_mirror',raw);
 const before=r.checkpoint();
 assert.equal(vm.runInContext('DF22Preflight.nativeAcknowledge(localStorage)',a.context),false);
 assert.equal(r.checkpoint(),before,'Invalid records must not advance native durable receipt');
});

test('first native receipt preserves loader-selected records when one companion is damaged, absent or divergent',()=>{
 for(const companion of ['damaged',null,D.encodePacket([{id:99,title:'stale',done:false}])]){
  for(const useMirror of [false,true]){
   const r=rig(),a=r.boot();
   const good=D.encodePacket([{id:81,title:'Recovered task',done:false,extra:{keep:'original'}}]);
   a.storage.setItem(D.KEYS.tasks+(useMirror?'_mirror':''),good);
   const other=D.KEYS.tasks+(useMirror?'':'_mirror');
   // A valid primary remains authoritative if both copies verify.
   if(useMirror&&companion!==null&&D.inspectPacket(companion).ok)continue;
   if(companion!==null)a.storage.setItem(other,companion);
   assert.equal(a.context.DF22Preflight.allowApp(a.storage,null),true);
   assert.equal(a.context.DF22Preflight.nativeAcknowledge(a.storage),true);
   const packets=JSON.parse(r.checkpoint()).packets;
   assert.equal(packets[D.KEYS.tasks],good);
   assert.equal(packets[D.KEYS.tasks+'_mirror'],good);
   assert.equal(r.boot().context.tasksList[0].extra.keep,'original');
  }
 }
});

test('newer acknowledged native receipt supersedes an older valid browser journal',()=>{
 const r=rig(),a=r.boot();assert.equal(r.toggle(a.context,true),true);
 const first=JSON.parse(r.checkpoint()).packets;
 const absent=Object.fromEntries(Object.keys(first).map(k=>[k,null]));
 assert.equal(r.toggle(a.context,false),true);
 const newest=r.checkpoint();
 // WebView persisted only the first transaction; the native file has the second.
 for(const [k,v] of Object.entries(first))a.storage.setItem(k,v);
 a.storage.setItem(D.JOURNAL_KEY,JSON.stringify({version:1,state:'committed',original:absent,expected:first}));
 r.flush(a.storage);
 const b=r.boot();assert.equal(b.started,true);
 assert.equal(b.context.tasksList[0].checklist[0].done,false);
 assert.equal(b.context.tasksList[0].other.x,42);
 assert.equal(b.storage.getItem(D.JOURNAL_KEY),null);
 assert.equal(r.checkpoint(),newest);
});

test('unacknowledged newer journal never replaces the last native receipt',()=>{
 const r=rig(),a=r.boot();assert.equal(r.toggle(a.context,true),true);
 const original=JSON.parse(r.checkpoint()).packets;
 const expected={...original};
 const edited=D.inspectPacket(expected[D.KEYS.tasks]).value;
 edited[0].checklist[0].done=false;
 expected[D.KEYS.tasks]=expected[D.KEYS.tasks+'_mirror']=D.encodePacket(edited);
 for(const [k,v] of Object.entries(expected))a.storage.setItem(k,v);
 a.storage.setItem(D.JOURNAL_KEY,JSON.stringify({version:1,state:'committed',original,expected}));
 r.flush(a.storage);
 const b=r.boot();assert.equal(b.started,true);
 assert.equal(b.context.tasksList[0].checklist[0].done,true);
 assert.equal(b.storage.getItem(D.JOURNAL_KEY),null);
});

test('native ACK is the commit point even when post-commit journal cleanup is unavailable',()=>{
 const r=rig(),a=r.boot(),remove=a.storage.removeItem.bind(a.storage);
 a.storage.removeItem=k=>{if(k===D.JOURNAL_KEY)throw Error('InjectedCleanup');remove(k);};
 assert.equal(r.toggle(a.context,true),true,'A durable accepted edit must report saved');
 assert.equal(a.context.tasksList[0].checklist[0].done,true);
 assert.notEqual(a.storage.getItem(D.JOURNAL_KEY),null,'Keep recovery evidence until cleanup is available');
 r.flush(a.storage);
 const b=r.boot();assert.equal(b.started,true);
 assert.equal(b.context.tasksList[0].checklist[0].done,true);
 assert.equal(b.storage.getItem(D.JOURNAL_KEY),null);
});
