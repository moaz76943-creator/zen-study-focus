'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const Studio=require('../../android/app/src/main/assets/web/tasks_studio.js');
const C=require('../../android/app/src/main/assets/web/tasks_core_v21.js');
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

test('PR160 legacy unchanged invalid note IDs do not block title edit or modify v21 data',()=>{
 let state={cfg:{sessionHistory:[],taskProjectsV21:[],unknownV21:{keep:1}},tasksList:[
  {id:93,title:'Old imported task',catKey:'study',noteIds:['legacy_note_alpha'],otherLegacy:'keep'}
 ]};
 const before=JSON.parse(JSON.stringify(state));let commits=0;
 const root=new FakeElement(fakeDoc,'main');
 const studio=Studio.mount(root,{locale:'en',now:()=>new Date(2026,9,19),
  readState:()=>JSON.parse(JSON.stringify(state)),
  commit(old,next){assert.deepEqual(old,state);state=JSON.parse(JSON.stringify(next));commits++;return true;}
 });
 const edit=root.descendants.find(x=>x.tagName==='BUTTON'&&x.textContent==='Edit');
 assert.ok(edit);edit.dispatch('click');
 const form=root.descendants.find(x=>x.tagName==='FORM'&&x.className==='df-form');
 const title=form.descendants.find(x=>x.tagName==='INPUT'&&x.type==='text');
 const notes=form.descendants.find(x=>x.tagName==='INPUT'&&x.value==='legacy_note_alpha');
 assert.ok(notes);assert.equal(notes.value,'legacy_note_alpha');
 title.value='Edited imported task';
 form.dispatch('submit');
 assert.equal(commits,1,'Unchanged legacy note references must not block safe title change');
 assert.equal(state.tasksList[0].title,'Edited imported task');
 assert.deepEqual(state.tasksList[0].noteIds,before.tasksList[0].noteIds);
 assert.equal(Object.hasOwn(state.tasksList[0],'date'),false);
 assert.equal(state.tasksList[0].otherLegacy,'keep');
 assert.deepEqual(state.cfg,before.cfg);
 studio.destroy();
});

test('PR160 an edited invalid note ID remains rejected without a write',()=>{
 let state={cfg:{sessionHistory:[],taskProjectsV21:[]},tasksList:[
  {id:94,title:'Original task',catKey:'study',noteIds:['legacy_note_alpha']}
 ]};
 const original=JSON.parse(JSON.stringify(state));let commits=0;
 const root=new FakeElement(fakeDoc,'main');
 const studio=Studio.mount(root,{locale:'en',now:()=>new Date(2026,9,19),
  readState:()=>JSON.parse(JSON.stringify(state)),
  commit(){commits++;return true;}
 });
 root.descendants.find(x=>x.tagName==='BUTTON'&&x.textContent==='Edit').dispatch('click');
 const form=root.descendants.find(x=>x.tagName==='FORM'&&x.className==='df-form');
 const notes=form.descendants.find(x=>x.tagName==='INPUT'&&x.value==='legacy_note_alpha');
 assert.ok(notes);notes.value='bad_new_note';
 form.dispatch('submit');
 assert.equal(commits,0);
 assert.deepEqual(state,original);
 studio.destroy();
});


test('DF-PR-01 new Tasks Studio task defaults to optional deadline and is not overdue',()=>{
 let state={cfg:{sessionHistory:[],taskProjectsV21:[]},tasksList:[]},commits=0;
 const root=new FakeElement(fakeDoc,'main');
 Studio.mount(root,{locale:'en',now:()=>new Date(2026,9,26),
  readState:()=>JSON.parse(JSON.stringify(state)),commit(before,after){assert.deepEqual(before,state);state=JSON.parse(JSON.stringify(after));commits++;return true;}});
 const findButton=label=>root.descendants.find(x=>x.tagName==='BUTTON'&&x.textContent.includes(label));
 findButton('New task').dispatch('click');
 const form=root.descendants.find(x=>x.tagName==='FORM');
 assert.ok(form);
 const title=form.descendants.find(x=>x.tagName==='INPUT'&&x.type==='text');
 const due=form.descendants.find(x=>x.tagName==='INPUT'&&x.type==='date');
 const assign=form.descendants.find(x=>x.tagName==='INPUT'&&x.type==='checkbox');
 assert.equal(assign.checked,false);
 assert.ok(due.value);
 title.value='Task with no deadline';
 form.dispatch('submit');
 assert.equal(commits,1);
 assert.equal(state.tasksList[0].dueAssigned,false);
 assert.equal(state.tasksList[0].title,'Task with no deadline');
 assert.equal(C.isOverdue(state.tasksList[0],'2026-11-01'),false);
});

test('DF-PR-01 unrelated title edit never assigns a date to an imported undated v21 task',()=>{
 let state={cfg:{sessionHistory:[],taskProjectsV21:[]},tasksList:[{id:107,title:'Imported undated',done:false,other:{keep:42}}]},commits=0;
 const root=new FakeElement(fakeDoc,'main');
 Studio.mount(root,{locale:'en',now:()=>new Date(2026,9,26),
  readState:()=>JSON.parse(JSON.stringify(state)),commit(before,after){state=JSON.parse(JSON.stringify(after));commits++;return true;}});
 root.descendants.find(x=>x.tagName==='BUTTON'&&x.textContent==='Edit').dispatch('click');
 const form=root.descendants.find(x=>x.tagName==='FORM');
 const title=form.descendants.find(x=>x.tagName==='INPUT'&&x.type==='text');
 const hasDue=form.descendants.find(x=>x.tagName==='INPUT'&&x.type==='checkbox');
 assert.equal(hasDue.checked,false);
 title.value='Renamed undated';
 form.dispatch('submit');
 assert.equal(commits,1);
 assert.equal(Object.hasOwn(state.tasksList[0],'date'),false);
 assert.equal(Object.hasOwn(state.tasksList[0],'dueAssigned'),false);
 assert.deepEqual(state.tasksList[0].other,{keep:42});
});

test('DF-PARALLEL-05: one-field Quick Add retries failed ACK and never creates a deadline or duplicate',()=>{
 let state={cfg:{sessionHistory:[],taskProjectsV21:[],legacyOpaque:{preserve:true}},tasksList:[]};
 let attempts=0,commits=0,allow=false;
 const root=new FakeElement(fakeDoc,'main');
 const studio=Studio.mount(root,{locale:'en',now:()=>new Date(2026,9,26),
   readState:()=>JSON.parse(JSON.stringify(state)),
   commit(before,after){
     attempts++;
     assert.deepEqual(before,state);
     if(!allow)return false;
     state=JSON.parse(JSON.stringify(after));commits++;return true;
   }});
 const form=root.descendants.find(x=>x.tagName==='FORM'&&x.className?.includes('df-quick-add'));
 assert.ok(form,'One-field Quick Add must be available without opening the full editor');
 const title=form.descendants.find(x=>x.tagName==='INPUT'&&x.type==='text');
 assert.ok(title);
 title.value='  ';
 form.dispatch('submit');
 assert.equal(attempts,0);
 title.value='Study German';
 form.dispatch('submit');
 assert.equal(attempts,1);assert.equal(commits,0);assert.equal(title.value,'Study German');
 assert.equal(state.tasksList.length,0);
 allow=true;
 form.dispatch('submit');
 assert.equal(attempts,2);assert.equal(commits,1);
 assert.equal(state.tasksList.length,1);
 assert.equal(state.tasksList[0].title,'Study German');
 assert.equal(state.tasksList[0].dueAssigned,false);
 assert.equal(C.isOverdue(state.tasksList[0],'2026-11-15'),false);
 assert.deepEqual(state.cfg.legacyOpaque,{preserve:true});
 form.dispatch('submit');
 assert.equal(commits,1,'Detached Quick Add may not write twice');
 studio.destroy();
});

test('DF-PARALLEL-05: Quick Add cannot erase unsaved edits in an opened full task editor',()=>{
 const f=fixture(),quick=()=>f.root.descendants.some(x=>x.tagName==='FORM'&&x.className?.includes('df-quick-add'));
 assert.equal(quick(),true);
 const edit=f.root.descendants.find(x=>x.tagName==='BUTTON'&&x.textContent==='Edit');
 assert.ok(edit);edit.dispatch('click');
 const full=f.root.descendants.find(x=>x.tagName==='FORM'&&x.className==='df-form');
 assert.ok(full);
 const title=full.descendants.find(x=>x.tagName==='INPUT'&&x.type==='text');
 title.value='Unsaved draft title';
 assert.equal(quick(),false,'Quick Add must not be available to redraw an unsaved full editor');
 assert.equal(title.value,'Unsaved draft title');
 assert.equal(f.commits(),0);
 const cancel=full.descendants.find(x=>x.tagName==='BUTTON'&&x.textContent==='Cancel');
 assert.ok(cancel);cancel.dispatch('click');
 assert.equal(quick(),true);
 assert.equal(f.commits(),0,'Cancelling an unsaved edit must never publish it');
 f.studio.destroy();
});


test('DF05 daily priority pin/unpin is durable, limited to three and rolls back failed ACK',()=>{
 let state={cfg:{taskProjectsV21:[],sessionHistory:[],unknown:{keep:'v21'}},tasksList:[
  {id:1,title:'One',done:false,catKey:'study'},
  {id:2,title:'Two',done:false,catKey:'study'},
  {id:3,title:'Three',done:false,catKey:'study'},
  {id:4,title:'Four',done:false,catKey:'study'}
 ]}, writes=0, failAck=false;
 const root=new FakeElement(fakeDoc,'main');
 const studio=Studio.mount(root,{locale:'en',now:()=>new Date(2026,9,26),
  readState:()=>JSON.parse(JSON.stringify(state)),
  commit(before,after){assert.deepEqual(before,state);if(failAck)return false;
   writes++;state=JSON.parse(JSON.stringify(after));return true;}});
 const cardFor=title=>root.descendants.find(x=>x.tagName==='ARTICLE'&&x.descendants.some(n=>n.className==='df-title'&&n.textContent===title));
 const action=(name,caption)=>{
  const card=cardFor(name);assert.ok(card,'card '+name);
  const b=card.descendants.find(x=>x.tagName==='BUTTON'&&x.textContent===caption);
  assert.ok(b,caption+' for '+name);b.dispatch('click');
 };
 action('One','Top three');action('Two','Top three');action('Three','Top three');
 assert.equal(writes,3);
 assert.deepEqual(state.cfg.taskTopThreeV21['2026-10-26'],[1,2,3]);
 action('Four','Top three');assert.equal(writes,3,'fourth pin must not write');
 failAck=true;action('One','Unpin');
 assert.deepEqual(state.cfg.taskTopThreeV21['2026-10-26'],[1,2,3]);
 failAck=false;action('One','Unpin');
 assert.deepEqual(state.cfg.taskTopThreeV21['2026-10-26'],[2,3]);
 assert.deepEqual(state.cfg.unknown,{keep:'v21'});
 assert.ok(state.tasksList.every(x=>!Object.hasOwn(x,'manuallyPinned')),'only existing cfg persisted');
 studio.destroy();
});


test('DF05: Tasks Today/Upcoming/Overdue/Completed tabs and project filter are read-only',()=>{
 let state={cfg:{sessionHistory:[],taskProjectsV21:[{id:2,name:'Work'}],opaque:{keep:true}},tasksList:[
  {id:1,title:'No due',catKey:'study',done:false,projectId:2},
  {id:2,title:'Future',date:'2026-10-30',catKey:'study',done:false,projectId:2},
  {id:3,title:'Late',date:'2026-10-20',catKey:'study',done:false},
  {id:4,title:'Finished',date:'2026-10-25',catKey:'study',done:true}
 ]},commits=0;
 const root=new FakeElement(fakeDoc,'main');
 const studio=Studio.mount(root,{locale:'en',now:()=>new Date(2026,9,26),
  readState:()=>JSON.parse(JSON.stringify(state)),commit(){commits++;return true;}});
 const tab=caption=>{const b=root.descendants.find(x=>x.tagName==='BUTTON'&&x.textContent===caption);
  assert.ok(b,'missing tab '+caption);b.dispatch('click');};
 const shown=()=>root.descendants.find(x=>x.id==='df-task-results').descendants.filter(x=>x.className==='df-title').map(x=>x.textContent);
 tab('Today');assert.ok(shown().includes('No due'));assert.ok(!shown().includes('Late'));
 tab('Upcoming');assert.deepEqual(shown(),['Future']);
 tab('Overdue');assert.deepEqual(shown(),['Late']);
 tab('Completed');assert.deepEqual(shown(),['Finished']);
 tab('List');
 const projects=root.descendants.find(x=>x.tagName==='SELECT'&&x.attributes['aria-label']==='Filter by project');
 assert.ok(projects);
 projects.value='2';projects.dispatch('change');
 assert.deepEqual(shown(),['No due','Future']);
 assert.equal(commits,0);assert.deepEqual(state.cfg.opaque,{keep:true});
 studio.destroy();
});
test('DF05: deliberate task reschedule is persisted, while invalid input never writes',()=>{
 let state={cfg:{sessionHistory:[],taskProjectsV21:[]},tasksList:[
  {id:10,title:'Plan',catKey:'study',done:false,unknown:{keep:1}}
 ]},commits=0,answer='bad-date';
 const root=new FakeElement(fakeDoc,'main');
 const studio=Studio.mount(root,{locale:'en',now:()=>new Date(2026,9,26),
  readState:()=>JSON.parse(JSON.stringify(state)),
  commit(before,after){assert.deepEqual(before,state);state=JSON.parse(JSON.stringify(after));commits++;return true;},
  requestText:()=>answer});
 const press=()=>{const btn=root.descendants.find(x=>x.tagName==='BUTTON'&&x.textContent==='Reschedule');
  assert.ok(btn);btn.dispatch('click');};
 press();assert.equal(commits,0);
 answer='2026-10-31';press();assert.equal(commits,1);
 assert.equal(state.tasksList[0].date,'2026-10-31');
 assert.equal(state.tasksList[0].dueAssigned,true);
 assert.deepEqual(state.tasksList[0].unknown,{keep:1});
 studio.destroy();
});


test('DF-FINAL-03: 1000 legacy tasks render in bounded, expandable result pages without writes',()=>{
 let state={cfg:{sessionHistory:[],taskProjectsV21:[],unknownV21:{keep:true}},tasksList:
  Array.from({length:1000},(_,i)=>({id:1000+i,title:'Legacy bulk '+i,done:false,catKey:'study',extension:{index:i}}))};
 const before=JSON.stringify(state),root=new FakeElement(fakeDoc,'main');let commits=0;
 const studio=Studio.mount(root,{locale:'en',now:()=>new Date(2026,9,26),
  readState:()=>JSON.parse(JSON.stringify(state)),commit(){commits++;return true;}});
 const results=()=>root.descendants.find(x=>x.id==='df-task-results');
 const titles=()=>results().descendants.filter(x=>x.className==='df-title').map(x=>x.textContent);
 assert.equal(titles().length,100,'initial DOM must be bounded');
 const more=results().descendants.find(x=>x.tagName==='BUTTON'&&x.textContent==='Show more tasks');
 assert.ok(more,'all 1000 tasks must remain accessible');
 more.dispatch('click');
 assert.equal(titles().length,200,'explicit page expansion should expose more real tasks');
 const search=root.descendants.find(x=>x.tagName==='INPUT'&&x.type==='search');
 search.value='Legacy bulk 999';search.dispatch('input');
 assert.deepEqual(titles(),['Legacy bulk 999'],'filter must search all 1000, not just visible items');
 assert.equal(JSON.stringify(state),before,'rendering and search cannot modify v21 records');
 assert.equal(commits,0);
 studio.destroy();
});
