'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const web=path.resolve(__dirname,'../../android/app/src/main/assets/web');
function rig(legacy=false){
 const packets=new Map(),writes=[];let acknowledgements=0;
 const context=vm.createContext({localStorage:{getItem:key=>packets.get(key)??null,setItem(key,value){writes.push(key);packets.set(key,value);},removeItem:key=>packets.delete(key)},
  ZenNative:{},DF22Preflight:{nativeAcknowledge(){acknowledgements++;return true;}},Date,Map,Set});
 context.window=context;
 vm.runInContext(`var cfg={lang:'en',unknown:7},tasksList=[{id:1,title:'First',done:false,unknown:'keep'},{id:${legacy?1:2},title:'Second',done:false,unknown:'also keep'}],notesList=[{id:3,title:'First note',body:'One'},{id:4,title:'Second note',body:'Two'}];`,context);
 for(const file of ['data_compat_v21.js','integration_v22.js'])vm.runInContext(fs.readFileSync(path.join(web,file),'utf8'),context);
 vm.runInContext(`for(const [slot,field] of [['cfg','cfg'],['tasks','tasksList'],['notes','notesList']]){const key=DeepFocusDataCompatV21.KEYS[slot],packet=DeepFocusDataCompatV21.encodePacket(DF22Integration.getSnapshot()[field]);localStorage.setItem(key,packet);localStorage.setItem(key+'_mirror',packet);}`,context);
 writes.length=0;
 return {run:code=>vm.runInContext(code,context),packets,writes,acks:()=>acknowledgements};
}
for(const field of ['tasksList','notesList'])test('new duplicate '+field+' IDs fail before storage/native publication',()=>{
 const r=rig(),bytes=[...r.packets],before=r.run('JSON.stringify(DF22Integration.getSnapshot())');
 assert.throws(()=>r.run(`(()=>{const before=DF22Integration.getSnapshot(),after=JSON.parse(JSON.stringify(before));after.${field}[1].id=after.${field}[0].id;return DF22Integration.write(before,after);})()`),/Record validation failed: DUPLICATE_ID/);
 assert.deepEqual([...r.packets],bytes);assert.deepEqual(r.writes,[]);assert.equal(r.acks(),0);
 assert.equal(r.run('JSON.stringify(DF22Integration.getSnapshot())'),before);
});
test('existing duplicate records retain their numeric IDs, order and unknown fields during an edit',()=>{
 const r=rig(true);
 assert.equal(r.run(`(()=>{const before=DF22Integration.getSnapshot(),after=JSON.parse(JSON.stringify(before));after.tasksList[0].title='Edited';return DF22Integration.write(before,after);})()`),true);
 assert.equal(r.run('JSON.stringify(tasksList.map(row=>row.id))'),'[1,1]');
 assert.equal(r.run('tasksList[0].unknown'),'keep');assert.equal(r.run('tasksList[1].unknown'),'also keep');
 assert.equal(r.run('tasksList[1].title'),'Second');assert.equal(r.acks(),1);
});
test('removing an existing duplicate does not require an ID migration',()=>{
 const r=rig(true);
 assert.equal(r.run(`(()=>{const before=DF22Integration.getSnapshot(),after=JSON.parse(JSON.stringify(before));after.tasksList.pop();return DF22Integration.write(before,after);})()`),true);
 assert.equal(r.run('JSON.stringify(tasksList.map(row=>row.id))'),'[1]');
});
