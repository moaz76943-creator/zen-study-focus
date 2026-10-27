'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const app=fs.readFileSync(process.env.DF_CLIPBOARD_APP||path.resolve(__dirname,'../../android/app/src/main/assets/web/app.js'),'utf8');
function harness(clipboard){
 const notices=[],writes=[];
 const context=vm.createContext({navigator:{clipboard},window:{},cfg:{todayMins:12,sessions:2,streak:3},
  notesList:[{title:'ملحوظة ١٢',body:'Authored ۱۲ and ٣ text',calDate:'2026-10-27'}],
  toWest:x=>String(x),showToast:x=>notices.push(x),nsLabel:x=>x===34?'COPY_FAILED':'OTHER'});
 for(const name of ['shareAppWithFriends','exportAllNotes']){
  const match=app.match(new RegExp('(?:async )?function '+name+'\\(\\) \\{[\\s\\S]*?\\n\\}'));
  assert.ok(match,'actual production function required: '+name);vm.runInContext(match[0],context);
 }
 return {context,notices,writes};
}
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
for(const name of ['shareAppWithFriends','exportAllNotes']){
 test(name+' waits for clipboard receipt before reporting success',async()=>{
  const pending=deferred(),writes=[];const f=harness({writeText:value=>{writes.push(value);return pending.promise;}});
  const result=f.context[name]();assert.equal(writes.length,1);assert.deepEqual(f.notices,[]);
  pending.resolve();assert.equal(await result,true);assert.equal(f.notices.length,1);assert.notEqual(f.notices[0],'COPY_FAILED');
 });
 test(name+' rejected or unavailable clipboard never reports success',async()=>{
  for(const clipboard of [undefined,{}, {writeText:()=>{throw Error('synchronous denial');}}, {writeText:()=>Promise.reject(Error('private user text'))}]){
   const f=harness(clipboard);assert.equal(await f.context[name](),false);assert.deepEqual(f.notices,['COPY_FAILED']);
  }
 });
}
test('notes export preserves user-authored text and uses confirmed clipboard bytes',async()=>{
 const writes=[],f=harness({writeText:async value=>writes.push(value)});assert.equal(await f.context.exportAllNotes(),true);
 assert.equal(writes[0],'[ملحوظة ١٢ - 2026-10-27]\nAuthored ۱۲ and ٣ text');
});
test('native app sharing keeps its existing native route',async()=>{
 const native=[],f=harness({writeText:()=>{throw Error('must not use clipboard');}});
 f.context.window.ZenNative={shareAppInvite:value=>native.push(value)};
 await f.context.shareAppWithFriends();assert.equal(native.length,1);assert.deepEqual(f.notices,[]);
});
