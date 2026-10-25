'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const Studio=require('../../android/app/src/main/assets/web/tasks_studio.js');
class FakeElement {
 constructor(doc,tag){this.ownerDocument=doc;this.tagName=tag.toUpperCase();this.children=[];this.listeners={};this.attributes={};this.value='';this.textContent='';this.checked=false;this.style={};}
 appendChild(n){this.children.push(n);n.parent=this;return n;}
 replaceChildren(...nodes){this.children=[];nodes.forEach(n=>this.appendChild(n));}
 setAttribute(k,v){this.attributes[k]=v;}
 addEventListener(k,cb){this.listeners[k]=cb;}
 dispatch(k){this.listeners[k]?.({target:this,preventDefault(){}});}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);}
 get descendants(){return this.children.flatMap(c=>[c,...c.descendants]);}
}
const fakeDoc={createElement(tag){return new FakeElement(this,tag);}};
function fixture(){let state={cfg:{sessionHistory:[],taskProjectsV21:[]},tasksList:[{id:7,title:'Write',date:'2026-10-19',catKey:'study',done:false,isStarter:false}]};
 let commits=0;
 const root=new FakeElement(fakeDoc,'main'),studio=Studio.mount(root,{locale:'en',now:()=>new Date(2026,9,19),readState:()=>JSON.parse(JSON.stringify(state)),
  commit(before,after){assert.deepEqual(before,state);state=JSON.parse(JSON.stringify(after));commits++;},linkTaskToTimer:()=>true});
 return {root,studio,get:()=>state,commits:()=>commits,set:x=>{state=x;}};}
test('UI mounts into supplied root and respects isolated style',()=>{
 const f=fixture();assert.ok(f.root.descendants.some(x=>x.tagName==='STYLE'));
 assert.ok(f.root.descendants.some(x=>x.textContent==='Tasks Studio'));
 assert.equal(f.commits(),0);f.studio.destroy();assert.equal(f.root.descendants.length,0);
});
test('complete then undo/redo uses only injected commit adapter',()=>{
 const f=fixture();
 const find=s=>f.root.descendants.find(x=>x.tagName==='BUTTON'&&x.textContent===s);
 find('Complete').dispatch('click');assert.equal(f.get().tasksList[0].done,true);
 find('Undo').dispatch('click');assert.equal(f.get().tasksList[0].done,false);
 find('Redo').dispatch('click');assert.equal(f.get().tasksList[0].done,true);
 assert.equal(f.commits(),3);
});
test('external timer state revision invalidates undo instead of erasing sessions',()=>{
 const f=fixture(),find=s=>f.root.descendants.find(x=>x.tagName==='BUTTON'&&x.textContent===s);
 find('Complete').dispatch('click');
 const external=f.get();external.cfg.sessionHistory.push({id:'new',taskId:7,completed:true,mode:'focus',minutes:12,date:'2026-10-19'});
 f.set(external);find('Undo').dispatch('click');
 assert.equal(f.get().tasksList[0].done,true);
 assert.equal(f.get().cfg.sessionHistory.length,1);
});
