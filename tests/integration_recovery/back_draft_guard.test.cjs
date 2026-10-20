'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/assets/web/app.js'),'utf8');
function rig(allowClose){
 const note={id:'noteModal',open:true,classList:{remove(){note.open=false;}}};
 let guarded=0;const events={};
 const c=vm.createContext({window:{},document:{addEventListener:(name,fn)=>events[name]=fn,
  getElementById:id=>id==='deskClockOverlay'?{classList:{contains:()=>false}}:null,
  querySelectorAll:()=>note.open?[note]:[]},nsCloseEditor(){guarded++;if(allowClose)note.open=false;return allowClose;}});
 const start=source.indexOf('window.handleAndroidBack ='),end=source.indexOf('\nlet timerTotal',start);
 vm.runInContext(source.slice(start,end),c);
 return {note,events,back:()=>c.window.handleAndroidBack(),get guarded(){return guarded;}};
}
test('DF-077/080 Android Back consumes the event but honors refused draft-loss confirmation',()=>{
 const h=rig(false);assert.equal(h.back(),true);assert.equal(h.guarded,1);assert.equal(h.note.open,true);
});
test('DF-077 confirmed or safely saved draft can close through Android Back',()=>{
 const h=rig(true);assert.equal(h.back(),true);assert.equal(h.note.open,false);
});
test('DF-077 Escape uses the same draft-loss guard',()=>{
 const h=rig(false);let prevented=false;
 assert.equal(typeof h.events.keydown,'function');h.events.keydown({key:'Escape',preventDefault(){prevented=true;}});
 assert.equal(h.note.open,true);assert.equal(h.guarded,1);assert.equal(prevented,true);
});
