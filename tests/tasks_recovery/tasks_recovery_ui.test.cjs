'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const Core=require('../../android/app/src/main/assets/web/tasks_core_v21.js');
const UI=require('../../android/app/src/main/assets/web/tasks_studio.js');
class Node{
 constructor(tag,doc){this.tagName=tag;this.ownerDocument=doc;this.children=[];this.listeners={};this.style={};this.textContent='';this.className='';this.attributes={};this.value='';this.checked=false;}
 appendChild(x){this.children.push(x);x.parent=this;return x;}
 replaceChildren(...x){this.children=x;for(const a of x)a.parent=this;}
 setAttribute(k,v){this.attributes[k]=v;}
 addEventListener(k,fn){(this.listeners[k]??=[]).push(fn);}
 fire(k){for(const fn of this.listeners[k]||[])fn({preventDefault(){},target:this});}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);}
 find(fn){if(fn(this))return this;for(const ch of this.children){const r=ch.find(fn);if(r)return r;}return null;}
 findAll(fn){return (fn(this)?[this]:[]).concat(this.children.flatMap(ch=>ch.findAll(fn)));}
}
function setup(tasks=[],{failCommit=false,rejectCommit=false}={}){
 const doc={createElement(tag){return new Node(tag,doc);}},root=new Node('main',doc);
 let db={cfg:{sessionHistory:[]},tasksList:tasks},commits=0,links=[],errors=[];
 const controller=UI.mount(root,{
  readState:()=>JSON.parse(JSON.stringify(db)),
  commit:(_before,after)=>{if(failCommit)throw Error('Disk quota');if(rejectCommit)return false;db=JSON.parse(JSON.stringify(after));commits++;return true;},
  now:()=>new Date('2026-10-19T21:00:00+03:00'),
  locale:'en',linkTaskToTimer:id=>{links.push(id);return true;},onError:e=>errors.push(e.message)
 });
 return {root,controller,read:()=>db,commits:()=>commits,links,errors,externalChange:fn=>{db=fn(db);}};
}
function find(root,text){const x=root.find(el=>el.textContent===text);assert.ok(x,'Cannot find '+text);return x;}
function click(root,text){const x=root.find(el=>el.tagName==='button'&&el.textContent===text);assert.ok(x,'Cannot click '+text);return x;}
function quickCreate(ctx,title){
 const form=ctx.root.find(el=>el.className==='df-quick');assert.ok(form);
 form.find(el=>el.tagName==='input').value=title;form.fire('submit');
}
test('DF-105 quick form saves instantly with no due or synthetic focus',()=>{
 const a=setup();quickCreate(a,'Study one page');
 assert.equal(a.read().tasksList.length,1);
 assert.equal(a.read().tasksList[0].dueAssigned,false);
 assert.equal(a.commits(),1);
 assert.deepEqual(a.read().cfg.sessionHistory,[]);
});
test('DF-106 collapsed cards keep secondary actions hidden until expanded',()=>{
 const a=setup([{id:8,title:'Existing',date:'2026-10-19',catKey:'study',done:false,description:'Notes',isStarter:false}]);
 const card=a.root.find(el=>el.className==='df-task');assert.ok(card);
 const detail=card.find(el=>el.className==='df-task-more');
 assert.equal(detail.hidden,true);
 find(card,'Details').fire('click');assert.equal(detail.hidden,false);
 find(card,'Hide').fire('click');assert.equal(detail.hidden,true);
});
test('DF-107 complete/reopen and Undo restore the real task record',()=>{
 const a=setup([{id:9,title:'Real',date:'2026-10-19',catKey:'study',done:false,isStarter:false}]);
 click(a.root,'Complete').fire('click');assert.equal(a.read().tasksList[0].done,true);
 find(a.root,'Undo').fire('click');assert.equal(a.read().tasksList[0].done,false);
 click(a.root,'Complete').fire('click');
 click(a.root,'Completed').fire('click');
 click(a.root,'Reopen').fire('click');assert.equal(a.read().tasksList[0].done,false);
});
test('DF-111 user manually pins task and Undo removes its pin without removing task',()=>{
 const a=setup([{id:10,title:'Pin me',date:'2026-10-19',catKey:'study',done:false,isStarter:false}]);
 assert.equal(a.read().cfg.taskTopThreeV21,undefined);
 find(a.root,'Details').fire('click');
 find(a.root,'Top three').fire('click');
 assert.deepEqual(a.read().cfg.taskTopThreeV21['2026-10-19'],[10]);
 find(a.root,'Undo').fire('click');
 assert.equal(a.read().cfg.taskTopThreeV21,undefined);
 assert.equal(a.read().tasksList[0].id,10);
});
test('DF-110 future tasks appear in upcoming rather than today',()=>{
 const a=setup([{id:20,title:'Tomorrow',date:'2026-10-20',catKey:'study',done:false,isStarter:false}]);
 assert.equal(a.root.find(el=>el.className==='df-title'&&el.textContent==='Tomorrow'),null);
 find(a.root,'Upcoming').fire('click');
 assert.ok(a.root.find(el=>el.className==='df-title'&&el.textContent==='Tomorrow'));
});
test('DF-112/118 timer link does not fabricate focus minutes',()=>{
 const a=setup([{id:12,title:'Start focus',date:'2026-10-19',catKey:'study',done:false,isStarter:false}]);
 find(a.root,'Details').fire('click');click(a.root,'Start focus').fire('click');
 assert.deepEqual(a.links,[12]);
 assert.equal(Core.actualFocusMinutes(a.read(),12),0);
 assert.equal(a.commits(),0);
});
test('DF-120 failed durable save does not claim task creation or change state',()=>{
 const a=setup([],{failCommit:true});
 quickCreate(a,'Keep safely');
 assert.equal(a.read().tasksList.length,0);
 assert.equal(a.commits(),0);
 assert.deepEqual(a.errors,['Disk quota']);
});

test('DF-075 silent false commit cannot publish a task or an undo entry',()=>{
 const a=setup([],{rejectCommit:true});quickCreate(a,'Keep safely');
 assert.equal(a.read().tasksList.length,0);assert.equal(a.controller.getState().tasksList.length,0);
 assert.equal(a.commits(),0);assert.match(a.errors[0],/not confirmed/);
 const input=a.root.find(el=>el.className==='df-quick').find(el=>el.tagName==='input');
 assert.equal(input.value,'Keep safely');
});
test('DF-107 returning to the same task snapshot preserves Undo; external time credit invalidates it',()=>{
 const a=setup([{id:9,title:'Real',date:'2026-10-19',catKey:'study',done:false,isStarter:false}]);
 click(a.root,'Complete').fire('click');a.controller.refresh();click(a.root,'Undo').fire('click');
 assert.equal(a.read().tasksList[0].done,false);
 click(a.root,'Complete').fire('click');
 a.externalChange(db=>({...db,cfg:{...db.cfg,sessionHistory:[{id:'external',minutes:25,date:'2026-10-19',domain:'study'}]}}));
 a.controller.refresh();click(a.root,'Undo').fire('click');
 assert.equal(a.read().tasksList[0].done,true);assert.equal(a.read().cfg.sessionHistory.length,1);
});
test('DF-120 task pages bound DOM work and keep all matches available',()=>{
 const rows=Array.from({length:1001},(_,i)=>({id:10000+i,title:'Item '+i,date:'2026-10-19',catKey:'study',done:false,isStarter:false}));
 const a=setup(rows);assert.equal(a.root.findAll(el=>el.className==='df-task').length,100);
 click(a.root,'More (100/1001)').fire('click');assert.equal(a.root.findAll(el=>el.className==='df-task').length,200);
 const search=a.root.find(el=>el.className==='df-task-search');search.value='Item 1000';search.fire('input');
 assert.equal(a.root.findAll(el=>el.className==='df-task').length,1);assert.equal(a.read().tasksList.length,1001);
});
