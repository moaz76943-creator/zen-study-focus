'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const web = path.resolve(__dirname,'../../android/app/src/main/assets/web');
function storage() {
  const packets = new Map();let failed = null;
  return {
    packets, failWhen(fn) { failed=fn; },
    getItem(k){return packets.has(k)?packets.get(k):null;},
    setItem(k,v){if(failed && failed(k)) throw new Error('simulated full storage');packets.set(k,String(v));},
    removeItem(k){packets.delete(k);}
  };
}
function rig() {
  const localStorage=storage();
  const context = vm.createContext({
    localStorage,cfg:{lang:'ar',sessionHistory:[]},
    tasksList:[{id:1,title:'Historical task',done:false,unknown:7}],
    notesList:[{id:1,title:'ملاحظة قديمة',body:'Text',isStarter:false,extra:true}]
  });
  // An Android WebView has globalThis === window, unlike a default Node vm context.
  context.window = context;
  for(const file of ['data_compat_v21.js','preflight_v22.js','integration_v22.js'])
    vm.runInContext(fs.readFileSync(path.join(web,file),'utf8'),context,{filename:file,timeout:2000});
  const api=context.window.DF22Integration, D=context.window.DeepFocusDataCompatV21;
  const snapshot=()=>vm.runInContext('window.DF22Integration.getSnapshot()',context);
  const edited=change=>{const base=snapshot(),after=vm.runInContext('JSON.parse(JSON.stringify(window.DF22Integration.getSnapshot()))',context);change(after);return {base,after};};
  return {localStorage,api,D,snapshot,edited,context};
}
test('first explicit save atomically initializes verified v21 primary and mirror records',()=>{
  const x=rig();const {base,after}=x.edited(s=>{s.notesList[0].body='الْعِلْمُ نُورٌ';});
  assert.equal(x.localStorage.packets.size,0,'Opening app must not create storage packets');
  assert.equal(x.api.write(base,after),true);
  const report=x.D.inspectStorage(x.localStorage);
  assert.equal(report.ok,true);
  assert.equal(report.snapshot.notesList[0].body,'الْعِلْمُ نُورٌ');
  assert.equal(report.snapshot.tasksList[0].id,1);
  assert.equal(x.localStorage.getItem(x.D.JOURNAL_KEY),null);
});
test('failed second mirror write rolls back exact bytes and memory without a false success',()=>{
  const x=rig();let a=x.edited(s=>{s.notesList[0].body='First';});x.api.write(a.base,a.after);
  const previous=[...x.localStorage.packets];let once=true;
  x.localStorage.failWhen(k=>k===x.D.KEYS.notes+'_mirror'&&once?(once=false,true):false);
  a=x.edited(s=>{s.notesList[0].body='Unsaved';});
  assert.throws(()=>x.api.write(a.base,a.after),/simulated full storage/);
  x.localStorage.failWhen(null);
  assert.deepEqual([...x.localStorage.packets],previous);
  assert.equal(x.snapshot().notesList[0].body,'First');
});
test('an active v21 recovery journal blocks startup without mutating storage',()=>{
  const x=rig();const key=x.D.JOURNAL_KEY;
  x.localStorage.setItem(key,'{"version":1,"state":"pending","original":{},"expected":{}}');
  const before=[...x.localStorage.packets];
  const status=x.context.window.DF22Preflight.inspect(x.localStorage);
  assert.equal(status.ok,false);
  assert.equal(status.kind,'journal');
  assert.deepEqual([...x.localStorage.packets],before);
});
test('rejects string note IDs and stale snapshots without data mutation',()=>{
  const x=rig();let p=x.edited(s=>{s.notesList[0].id='note_1';});
  assert.throws(()=>x.api.write(p.base,p.after));
  p=x.edited(s=>{s.notesList[0].body='Safe';});x.api.write(p.base,p.after);
  const previous=[...x.localStorage.packets];
  assert.throws(()=>x.api.write(p.base,p.after),/changed/);
  assert.deepEqual([...x.localStorage.packets],previous);
});
test('language-rendered starter titles cannot break a verified user-requested save',()=>{
  const x=rig();let a=x.edited(s=>{s.tasksList[0].title='Starter';s.tasksList[0].isStarter=true;s.notesList[0].title='Starter note';s.notesList[0].body='Demo';s.notesList[0].isStarter=true;});
  x.api.write(a.base,a.after);
  vm.runInContext("tasksList[0].title='مثال';notesList[0].title='مثال';notesList[0].body='ترجمة';",x.context);
  a=x.edited(s=>{s.notesList.push(vm.runInContext('({id:2,title:"User",body:"Real"})',x.context));});
  assert.equal(x.api.write(a.base,a.after),true);
  assert.equal(x.D.inspectStorage(x.localStorage).snapshot.notesList[1].title,'User');
});
