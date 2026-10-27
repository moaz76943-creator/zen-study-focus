'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const web=path.resolve(__dirname,'../../android/app/src/main/assets/web');
const source=file=>fs.readFileSync(path.join(web,file),'utf8');
class Element {
 constructor(doc,tag){this.ownerDocument=doc;this.tagName=tag.toUpperCase();this.children=[];this.listeners={};this.attributes={};this.value='';this.textContent='';this.checked=false;this.style={};this.dataset={};this.classList={contains:()=>true};}
 appendChild(child){this.children.push(child);child.parent=this;return child;}
 replaceChildren(...children){this.children=[];children.forEach(c=>this.appendChild(c));}
 setAttribute(key,value){this.attributes[key]=value;}
 addEventListener(key,fn){this.listeners[key]=fn;}
 dispatch(key){this.listeners[key]?.({target:this,preventDefault(){}});}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);}
 get descendants(){return this.children.flatMap(c=>[c,...c.descendants]);}
}
function rig(){
 const packets=new Map(),elements=new Map();let reject=false,checkpoint=null,reported=0;
 const doc={createElement(tag){return new Element(this,tag);},getElementById(id){if(!elements.has(id))elements.set(id,new Element(this,'input'));return elements.get(id);},addEventListener(){}};
 const c=vm.createContext({document:doc,localStorage:{getItem:k=>packets.get(k)??null,setItem:(k,v)=>packets.set(k,String(v)),removeItem:k=>packets.delete(k)},
  ZenNative:{acknowledgeDurableV21(raw){if(reject)return false;checkpoint=raw;return true;},readDurableV21:()=>checkpoint??'NONE'},
  cfg:{lang:'en',sessions:4,sessionHistory:[{id:'prior',completed:true,minutes:3}],taskProjectsV21:[],unknown:'keep'},
  tasksList:[{id:10,title:'Task',date:'2026-10-27',done:false,custom:'task preserved'}],
  notesList:[{id:7,title:'Note',body:'Original عربي\n☐ Read',catKey:'quick',custom:'note preserved'}],
  nsEditId:7,localDateISO:()=> '2026-10-27',setTimeout:()=>1,clearTimeout(){},nsUpdateCount(){},closeModal(){},console});
 c.window=c;c.addEventListener=()=>{};
 const run=code=>vm.runInContext(code,c);
 for(const file of ['data_compat_v21.js','preflight_v22.js','integration_v22.js','notes_core_v21.js','notes_editor_ui.js','tasks_core_v21.js','tasks_studio.js'])run(source(file));
 const app=source('app.js');run(app.slice(app.indexOf('const SECRET_SALT ='),app.indexOf("document.addEventListener('contextmenu'")));
 run(source('notes_drafts.js'));
 run(`globalThis.noteController=DeepFocusNotesEditorUI.createController({core:DeepFocusNotesCoreV21,
  readState:()=>DF22Integration.getSnapshot(),nextNumericId:()=>99,now:()=>123456,
  commitNotes:(before,after)=>DF22Integration.write(before,after),
  commitBoth:(before,after)=>DF22Integration.write(before,after),onSaved:()=>globalThis.reportSaved()});`);
 c.reportSaved=()=>{reported++;};
 const snapshot=()=>JSON.parse(run('JSON.stringify(DF22Integration.getSnapshot())'));
 const bytes=()=>[...packets].sort(([a],[b])=>a.localeCompare(b));
 return {c,run,doc,packets,snapshot,bytes,get checkpoint(){return checkpoint;},get reported(){return reported;},reject(value){reject=value;}};
}
test('W01 native rejection preserves note text, revision stacks, all packets and draft; retry/undo/redo recover',()=>{
 const r=rig();
 r.doc.getElementById('inpNoteTitle').value='Typed title';
 r.doc.getElementById('inpNoteBody').value='Unsaved نص\n☐ Read';
 r.doc.getElementById('selNoteCat').value='quick';
 r.doc.getElementById('inpNoteCalDate').value='2026-10-27';
 assert.equal(r.run('nsFlushDraft()'),true);
 const draft=[...r.packets].filter(([key])=>key.startsWith('deep_focus_unsaved_note_draft_v1'));
 const initial=r.snapshot(),initialBytes=r.bytes();r.reject(true);
 assert.throws(()=>r.run("noteController.save({id:7,title:'Typed title',body:'Unsaved نص\\n☐ Read',catKey:'quick'})"),/NATIVE_DURABLE_ACK_FAILED/);
 assert.deepEqual(r.snapshot(),initial);assert.deepEqual(r.bytes(),initialBytes);assert.equal(r.reported,0);
 assert.equal(r.doc.getElementById('inpNoteBody').value,'Unsaved نص\n☐ Read');
 r.reject(false);r.run("noteController.save({id:7,title:'Typed title',body:'Unsaved نص\\n☐ Read',catKey:'quick'})");
 assert.equal(r.snapshot().notesList[0].body,'Unsaved نص\n☐ Read');
 assert.deepEqual([...r.packets].filter(([key])=>key.startsWith('deep_focus_unsaved_note_draft_v1')),draft);
 let before=r.snapshot(),bytes=r.bytes(),receipt=r.checkpoint;r.reject(true);
 assert.throws(()=>r.run("noteController.history(7,'undo')"),/NATIVE_DURABLE_ACK_FAILED/);
 assert.deepEqual(r.snapshot(),before);assert.deepEqual(r.bytes(),bytes);assert.equal(r.checkpoint,receipt);
 r.reject(false);r.run("noteController.history(7,'undo')");assert.equal(r.snapshot().notesList[0].body,initial.notesList[0].body);
 before=r.snapshot();bytes=r.bytes();r.reject(true);
 assert.throws(()=>r.run("noteController.history(7,'redo')"),/NATIVE_DURABLE_ACK_FAILED/);
 assert.deepEqual(r.snapshot(),before);assert.deepEqual(r.bytes(),bytes);
 r.reject(false);r.run("noteController.history(7,'redo')");
 assert.equal(r.snapshot().notesList[0].body,'Unsaved نص\n☐ Read');
 assert.equal(r.snapshot().notesList[0].custom,'note preserved');assert.deepEqual(r.snapshot().cfg,initial.cfg);
});
test('W01 checklist extraction rejects both families atomically then retries exactly once',()=>{
 const r=rig(),before=r.snapshot();r.reject(true);
 assert.throws(()=>r.run('noteController.extract(7)'),/NATIVE_DURABLE_ACK_FAILED/);
 assert.deepEqual(r.snapshot(),before);assert.equal(r.checkpoint,null);
 r.reject(false);r.run('noteController.extract(7)');r.run('noteController.extract(7)');
 const after=r.snapshot();assert.equal(after.tasksList.length,2);assert.equal(after.tasksList.filter(t=>t.title==='Read').length,1);
 assert.deepEqual(after.cfg,before.cfg);assert.equal(after.notesList[0].body,before.notesList[0].body);
});
test('W01 actual Tasks editor keeps rejected draft and Undo/Redo stacks for retry without erasing sessions',()=>{
 const r=rig();r.c.host=new Element(r.doc,'main');
 r.run(`globalThis.tasks=DeepFocusTasksStudioV21.mount(host,{locale:'en',now:()=>new Date(2026,9,27),
  readState:()=>{const s=DF22Integration.getSnapshot();return {cfg:s.cfg,tasksList:s.tasksList};},commit:(before,after)=>{const active=DF22Integration.getSnapshot();return DF22Integration.write(active,{...active,cfg:after.cfg,tasksList:after.tasksList});},onError:e=>{globalThis.taskError=e.message;}});`);
 const find=caption=>r.c.host.descendants.find(e=>e.tagName==='BUTTON'&&e.textContent===caption);
 find('Edit').dispatch('click');
 const form=r.c.host.descendants.find(e=>e.tagName==='FORM'&&e.className==='df-form');
 const title=form.descendants.find(e=>e.tagName==='INPUT'&&e.type==='text');title.value='Typed task عربي';
 const initial=r.snapshot(),bytes=r.bytes();r.reject(true);form.dispatch('submit');
 assert.deepEqual(r.snapshot(),initial);assert.deepEqual(r.bytes(),bytes);assert.equal(title.value,'Typed task عربي');
 assert.ok(r.c.host.descendants.includes(form));
 r.reject(false);form.dispatch('submit');assert.equal(r.snapshot().tasksList[0].title,'Typed task عربي',r.c.taskError);
 const saved=r.snapshot();r.reject(true);find('Undo').dispatch('click');assert.deepEqual(r.snapshot(),saved);
 r.reject(false);find('Undo').dispatch('click');assert.deepEqual(r.snapshot(),initial);
 r.reject(true);find('Redo').dispatch('click');assert.deepEqual(r.snapshot(),initial);
 r.reject(false);find('Redo').dispatch('click');assert.deepEqual(r.snapshot(),saved);
 form.dispatch('submit');assert.deepEqual(r.snapshot(),saved,'Detached form cannot duplicate a successful save');
 assert.deepEqual(r.snapshot().cfg,initial.cfg);assert.deepEqual(r.snapshot().notesList,initial.notesList);
});

test('W01 Android Back consumes a rejected draft close and keeps editing until backup succeeds',()=>{
 const r=rig(),open=new Set(['noteModal']);
 r.doc.getElementById('inpNoteTitle').value='Unsaved title';
 r.doc.getElementById('inpNoteBody').value='لا تفقد النص';
 r.doc.getElementById('selNoteCat').value='quick';
 r.doc.getElementById('inpNoteCalDate').value='2026-10-27';
 for(const id of ['noteModal','deskClockOverlay']){
  const node=r.doc.getElementById(id);node.classList={contains:()=>open.has(id),remove:()=>open.delete(id)};
 }
 r.doc.querySelectorAll=()=>[r.doc.getElementById('noteModal')];
 r.c.confirm=()=>false;
 r.run("closeModal=id=>document.getElementById(id).classList.remove('open');nsScheduleDraft();");
 const app=source('app.js'),a=app.indexOf('window.handleAndroidBack = function()'),b=app.indexOf('\nlet timerTotal',a);
 r.run(app.slice(a,b));
 const write=r.c.localStorage.setItem;
 r.c.localStorage.setItem=()=>{throw Error('QuotaExceeded');};
 assert.equal(r.run('handleAndroidBack()'),true);assert.ok(open.has('noteModal'));
 assert.equal(r.doc.getElementById('inpNoteBody').value,'لا تفقد النص');
 assert.equal(r.packets.size,0);
 r.c.localStorage.setItem=write;
 assert.equal(r.run('handleAndroidBack()'),true);assert.equal(open.has('noteModal'),false);
 assert.equal(r.run('nsGetStoredDraft().body'),'لا تفقد النص');
});
