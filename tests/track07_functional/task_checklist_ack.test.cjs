'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const UI=require('../../android/app/src/main/assets/web/tasks_studio.js');

class Node {
 constructor(tag,doc){this.tagName=tag;this.ownerDocument=doc;this.children=[];this.listeners={};this.style={};this.className='';this.textContent='';this.attributes={};this.value='';this.checked=false;}
 appendChild(child){this.children.push(child);child.parent=this;return child;}
 replaceChildren(...children){this.children=children;for(const child of children)child.parent=this;}
 setAttribute(key,value){this.attributes[key]=value;}
 addEventListener(type,handler){(this.listeners[type]??=[]).push(handler);}
 fire(type){for(const handler of this.listeners[type]||[])handler({target:this,preventDefault(){}});}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);}
 find(predicate){if(predicate(this))return this;for(const child of this.children){const found=child.find(predicate);if(found)return found;}return null;}
}
function fixture(mode){
 const doc={createElement(tag){return new Node(tag,doc);}},root=new Node('main',doc),errors=[];
 let state={cfg:{sessionHistory:[]},tasksList:[{id:7,title:'Study',date:'2026-10-19',catKey:'study',done:false,isStarter:false,
   checklist:[{id:31,title:'Read chapter',done:false}],subtasks:[{id:32,title:'Summarize',done:false}]}]};
 const adapter={locale:'en',now:()=>new Date(2026,9,19),readState:()=>JSON.parse(JSON.stringify(state)),
  commit(before,after){if(mode.value==='false')return false;if(mode.value==='throw')throw Error('Disk full');
    state=JSON.parse(JSON.stringify(after));return mode.value === 'undefined' ? undefined : true;},onError:error=>errors.push(error.message)};
 const studio=UI.mount(root,adapter);
 // The current Tasks Studio renders checklist/subtask inputs directly on each card.
 return {root,studio,errors,read:()=>state};
}
function checkbox(root,label){
 const node=root.find(el=>el.tagName==='input'&&el.type==='checkbox'&&
  el.parent?.tagName==='label'&&el.parent.children.some(x=>x.textContent===label));
 assert.ok(node,'Checklist or subtask must exist: '+label);
 return node;
}
for(const rejection of ['false','throw']){
 test('07-01 '+rejection+' durable ACK rolls back visible checklist/subtask toggles and allows retry',()=>{
  const mode={value:rejection},ctx=fixture(mode);
  for(const [kind,title] of [['checklist','Read chapter'],['subtasks','Summarize']]){
   const tick=checkbox(ctx.root,title);tick.checked=true;tick.fire('change');
   assert.equal(ctx.read().tasksList[0][kind][0].done,false,'Unconfirmed data must stay unchanged');
   assert.equal(tick.checked,false,'Visible checkbox must not claim an unsaved completion');
  }
  assert.equal(ctx.errors.length,2);
  mode.value='true';
  const retry=checkbox(ctx.root,'Read chapter');retry.checked=true;retry.fire('change');
  assert.equal(ctx.read().tasksList[0].checklist[0].done,true);
  assert.equal(checkbox(ctx.root,'Read chapter').checked,true);
 });
}

test('07-01 historical acknowledged adapter without return value updates checkbox once',()=>{
 const mode={value:'undefined'},ctx=fixture(mode);
 const tick=checkbox(ctx.root,'Read chapter');
 tick.checked=true;tick.fire('change');
 assert.equal(ctx.read().tasksList[0].checklist[0].done,true);
 assert.equal(checkbox(ctx.root,'Read chapter').checked,true);
 assert.deepEqual(ctx.errors,[]);
});
