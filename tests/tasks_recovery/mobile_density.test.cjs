'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const Studio=require('../../android/app/src/main/assets/web/tasks_studio.js');
class Element {
 constructor(doc,tag){this.ownerDocument=doc;this.tagName=tag.toUpperCase();this.children=[];this.attributes={};this.listeners={};this.className='';this.textContent='';this.value='';this.style={};this.checked=false;this.hidden=false;}
 appendChild(node){this.children.push(node);node.parentNode=this;return node;}
 replaceChildren(...nodes){this.children=[];nodes.forEach(x=>this.appendChild(x));}
 setAttribute(k,v){this.attributes[k]=String(v);}
 addEventListener(k,fn){(this.listeners[k]||=[]).push(fn);}
 fire(k){for(const fn of this.listeners[k]||[])fn({target:this,preventDefault(){}});}
 remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(x=>x!==this);}
 get all(){return [this,...this.children.flatMap(n=>n.all)];}
 find(fn){return this.all.find(fn);}
 findAll(fn){return this.all.filter(fn);}
}
const documentMock={createElement(tag){return new Element(this,tag);}};
function fixture(lang='en',initial=[]){
 const root=new Element(documentMock,'main');
 let db={cfg:{sessionHistory:[]},tasksList:initial};
 let commits=0;
 const ui=Studio.mount(root,{
  locale:lang,now:()=>new Date(2026,9,19),
  readState:()=>JSON.parse(JSON.stringify(db)),
  commit:(before,after)=>{assert.deepEqual(before,db);db=JSON.parse(JSON.stringify(after));commits++;return true;},
  requestText:()=>null,
  linkTaskToTimer:()=>true
 });
 return {root,ui,get:()=>db,commits:()=>commits};
}
const hasClass=(node,cls)=>node.className.split(/\s+/).includes(cls);
test('mobile Tasks Studio has one visible quick form and at most four primary tabs',()=>{
 const {root,get}=fixture();
 const quick=root.find(n=>hasClass(n,'df-quick'));assert.ok(quick);
 const tabs=root.find(n=>hasClass(n,'df-tabs'));assert.ok(tabs);
 assert.deepEqual(tabs.findAll(n=>n.tagName==='BUTTON').map(n=>n.textContent),['Today','Upcoming','Overdue','Completed']);
 const tools=root.find(n=>hasClass(n,'df-task-tools'));
 assert.equal(tools.tagName,'DETAILS');assert.equal(tools.children[0].tagName,'SUMMARY');
 assert.deepEqual(tools.findAll(n=>n.tagName==='BUTTON').map(n=>n.textContent),['Advanced task','New project','Undo','Redo']);
 assert.ok(root.find(n=>hasClass(n,'df-filter-tools')));
 assert.equal(root.find(n=>hasClass(n,'df-filter-tools')).tagName,'DETAILS');
 const panels=root.findAll(n=>hasClass(n,'df-panel'));
 assert.equal(panels.length,0,'Avoid duplicate empty top-three messages');
 assert.equal(get().tasksList.length,0,'Mount never seeds fake user tasks');
});
test('advanced view selector retains every original view and switching is functional',()=>{
 const {root}=fixture();
 const select=root.find(n=>hasClass(n,'df-view-mode'));assert.ok(select);
 const options=select.findAll(n=>n.tagName==='OPTION').map(n=>n.value);
 assert.deepEqual(options,['','all','board','matrix','calendar','trash']);
 select.value='board';select.fire('change');
 assert.ok(root.find(n=>hasClass(n,'df-board')));
});
test('quick task creation still writes through v21 adapter and undo remains accessible',()=>{
 const a=fixture();
 const quick=a.root.find(n=>hasClass(n,'df-quick'));
 quick.find(n=>n.tagName==='INPUT').value='Real task';
 quick.fire('submit');assert.equal(a.get().tasksList.length,1);
 assert.equal(a.commits(),1);
 const undo=a.root.find(n=>n.tagName==='BUTTON'&&n.textContent==='Undo');
 assert.ok(undo);
 undo.fire('click');
 assert.equal(a.get().tasksList.length,0);
 assert.equal(a.commits(),2);
});
test('Arabic Tasks Studio inherits RTL and compact semantic controls',()=>{
 const {root}=fixture('ar');
 const section=root.find(n=>hasClass(n,'df-tasks'));
 assert.equal(section.attributes.dir,'rtl');
 assert.ok(root.find(n=>n.tagName==='SUMMARY'&&n.textContent==='المزيد'));
 assert.ok(root.find(n=>n.tagName==='SUMMARY'&&n.textContent==='الفلاتر'));
 const style=root.find(n=>n.tagName==='STYLE');
 assert.ok(style.textContent.includes('max-width:360px'));
 assert.ok(style.textContent.includes('df-filter-fields'));
});
