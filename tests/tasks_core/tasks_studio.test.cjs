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

test('legacy undated tasks render and search remains read-only',()=>{
 let state={cfg:{sessions:4,sessionHistory:[],unknown:{keep:'cfg'}},tasksList:[
  {id:40,title:'Scheduled task',date:'2026-10-19',done:false,priority:'medium'},
  {id:12,title:'مهمة قديمة ١٢',done:false,priority:'medium'},
  {id:13,title:'Legacy null date',date:null,done:false,priority:'medium'},
  {id:14,title:'Legacy malformed date',date:'bad-date',done:false,priority:'medium'}].map(t=>({...t,unknown:{keep:'task'}}))};
 const before=JSON.parse(JSON.stringify(state));let commits=0;
 const root=new FakeElement(fakeDoc,'main');
 const studio=Studio.mount(root,{locale:'en',now:()=>new Date(2026,9,19),
  readState:()=>JSON.parse(JSON.stringify(state)),commit(){commits++;return true;}});
 const cardTitles=()=>root.descendants.find(x=>x.id==='df-task-results').descendants.filter(x=>x.className==='df-title').map(x=>x.textContent);
 assert.deepEqual(cardTitles(),['مهمة قديمة ١٢','Legacy null date','Legacy malformed date','Scheduled task']);
 assert.deepEqual(cardTitles(),['مهمة قديمة ١٢','Legacy null date','Legacy malformed date','Scheduled task']);
 const search=root.descendants.find(x=>x.tagName==='INPUT'&&x.type==='search');
 search.value='قديمة';search.dispatch('input');assert.deepEqual(cardTitles(),['مهمة قديمة ١٢']);
 assert.equal(commits,0);assert.deepEqual(state,before);assert.equal(Object.hasOwn(state.tasksList[1],'date'),false);
 studio.destroy();
});


test('PR160: failed durable task ACK preserves the editor draft and retries without double commit', () => {
 let state={cfg:{sessionHistory:[],taskProjectsV21:[]},tasksList:[
  {id:91,title:'Stored title',date:'2026-10-19',catKey:'study',done:false,custom:{keep:1}}
 ]};
 const before=JSON.parse(JSON.stringify(state));
 let attempts=0,commits=0,acknowledged=false,changed=0;
 const root=new FakeElement(fakeDoc,'main');
 const studio=Studio.mount(root,{locale:'en',now:()=>new Date(2026,9,19),
  readState:()=>JSON.parse(JSON.stringify(state)),
  commit(old,next){
   attempts++;
   assert.deepEqual(old,state);
   if(!acknowledged)return false;
   state=JSON.parse(JSON.stringify(next));commits++;return true;
  },
  onAfterChange(){changed++;}
 });
 const edit=root.descendants.find(x=>x.tagName==='BUTTON'&&x.textContent==='Edit');
 assert.ok(edit);edit.dispatch('click');
 const form=root.descendants.find(x=>x.tagName==='FORM'&&x.className==='df-form');
 assert.ok(form);
 const title=form.descendants.find(x=>x.tagName==='INPUT'&&x.type==='text');
 assert.ok(title);title.value='Uncommitted draft';
 form.dispatch('submit');
 assert.equal(attempts,1);assert.equal(commits,0);assert.equal(changed,0);
 assert.deepEqual(state,before);
 assert.equal(title.value,'Uncommitted draft');
 assert.ok(root.descendants.includes(form),'failed ACK must not destroy editor');
 acknowledged=true;
 form.dispatch('submit');
 assert.equal(commits,1);assert.equal(changed,1);
 assert.equal(state.tasksList[0].title,'Uncommitted draft');
 assert.deepEqual(state.tasksList[0].custom,{keep:1});
 form.dispatch('submit'); // Detached form must not commit twice.
 assert.equal(attempts,2);assert.equal(commits,1);
 studio.destroy();
});

test('PR160: successful synchronous legacy adapter with undefined return commits once', () => {
 const f=fixture();
 const edit=f.root.descendants.find(x=>x.tagName==='BUTTON'&&x.textContent==='Edit');
 assert.ok(edit);edit.dispatch('click');
 const form=f.root.descendants.find(x=>x.tagName==='FORM'&&x.className==='df-form');
 const title=form.descendants.find(x=>x.tagName==='INPUT'&&x.type==='text');
 title.value='Edited once';
 form.dispatch('submit');
 form.dispatch('submit');
 assert.equal(f.commits(),1);
 assert.equal(f.get().tasksList[0].title,'Edited once');
 f.studio.destroy();
});
