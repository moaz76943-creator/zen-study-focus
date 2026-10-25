'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const file=path.resolve(__dirname,'../../../android/app/src/main/assets/web/app.js');
const source=fs.readFileSync(file,'utf8');
const start=source.indexOf('function selectTimerModeFromUser(');
const end=source.indexOf('\nfunction selectTimerMode(',start);
assert.ok(start>=0&&end>start,'Production timer consent wrapper must exist');
const wrapper=source.slice(start,end);

function rig({lang='tr',active=true,allow=false,training=false}={}){
 const calls={messages:[],lookups:[],changes:0};
 const ctx={
   cfg:{lang},quickTraining:training?{active:true}:null,
   timerRunning:active,timerSessionId:active?'session-1':null,timerActiveMs:active?123:0,
   window:{confirm(message){calls.messages.push(message);return allow;}},
   quickText(key){calls.lookups.push(key);return 'localized:'+lang+':'+key;},
   selectTimerMode(){calls.changes++;return true;}
 };
 vm.createContext(ctx);vm.runInContext(wrapper,ctx);
 return {calls,run:()=>vm.runInContext("selectTimerModeFromUser(5,'short',null)",ctx)};
}

test('20-locale legacy mode confirmation uses existing Quick Training translation key',()=>{
 for(const lang of ['tr','ru','de','fa','hi','ar','en','ur']){
   const r=rig({lang,allow:false});
   assert.equal(r.run(),false,lang);
   assert.deepEqual(r.calls.lookups,['replacePrompt'],lang);
   assert.deepEqual(r.calls.messages,['localized:'+lang+':replacePrompt'],lang);
   assert.equal(r.calls.changes,0,lang);
 }
});

test('mode cancellation cannot select or discard the active focus session',()=>{
 const r=rig({lang:'bn',allow:false});
 assert.equal(r.run(),false);
 assert.equal(r.calls.changes,0);
});

test('idle sessions do not demand consent and still select a mode',()=>{
 const r=rig({active:false,allow:false});
 assert.equal(r.run(),true);
 assert.equal(r.calls.messages.length,0);
 assert.equal(r.calls.changes,1);
});

test('Quick Training retains its own confirmation inside selectTimerMode',()=>{
 const r=rig({active:true,training:true,allow:false});
 assert.equal(r.run(),true);
 assert.equal(r.calls.messages.length,0);
 assert.equal(r.calls.changes,1);
});
