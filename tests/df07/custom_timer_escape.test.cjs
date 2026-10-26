'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/assets/web/timer_settings.js'),'utf8');

function rig({openCustom=true,topmost=true}={}) {
 const custom={classList:{contains(name){return name==='open'&&openCustom;}}};
 const another={classList:{contains(){return true;}}};
 const listeners={},writes=[],closed=[];
 const elements=new Map();
 function element(id){if(id==='customTimerModal')return custom;if(!elements.has(id))elements.set(id,{textContent:''});return elements.get(id);}
 const s={
  cfg:{lang:'en',shortMin:5,longMin:15},
  document:{
   getElementById:element,
   addEventListener(type,listener){listeners[type]=listener;},
   querySelectorAll(selector){assert.equal(selector,'.modal-overlay.open');return topmost?[custom]:[custom,another];}
  },
  toWest:String,
  closeModal(id){closed.push(id);if(id==='customTimerModal')openCustom=false;},
  saveFortressData(...args){writes.push(args)}
 };
 s.globalThis=s;
 vm.createContext(s);
 vm.runInContext(source,s);
 const fire=(key,{alreadyHandled=false}={})=>{
  let prevented=false;
  listeners.keydown({key,defaultPrevented:alreadyHandled,preventDefault(){prevented=true;}});
  return prevented;
 };
 return {fire,closed,writes,isOpen:()=>openCustom};
}
test('Escape closes active topmost Custom Timer without saving, confirming, or resetting',()=>{
 const r=rig();
 assert.equal(r.fire('Escape'),true);
 assert.deepEqual(r.closed,['customTimerModal']);
 assert.deepEqual(r.writes,[]);
 assert.equal(r.isOpen(),false);
});
test('Other keys and previously-handled Escape do not close Custom Timer',()=>{
 const r=rig();
 assert.equal(r.fire('Enter'),false);
 assert.equal(r.fire('Escape',{alreadyHandled:true}),false);
 assert.equal(r.closed.length,0);
 assert.equal(r.isOpen(),true);
});
test('Escape must not close a background Custom Timer under another modal',()=>{
 const r=rig({topmost:false});
 assert.equal(r.fire('Escape'),false);
 assert.equal(r.closed.length,0);
 assert.equal(r.isOpen(),true);
});
test('Closing an already closed Custom Timer is a no-op',()=>{
 const r=rig({openCustom:false});
 assert.equal(r.fire('Escape'),false);
 assert.equal(r.closed.length,0);
});