'use strict';
// Typed input → installed Notes UX (DeepFocusNotesEditorUI) → v21 controller → Notes Core.
// saveNewNote() delegates to DeepFocusNotesEditorUI.save(), which reads the DOM in draftToSave().
// Authored digits (Arabic-Indic / Persian) must be persisted exactly as typed.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const web=path.resolve(__dirname,'../../android/app/src/main/assets/web');

function mkEl(tag,id){
  const kids=[],attrs={};
  return {tagName:String(tag||'div').toUpperCase(),id:id||'',value:'',checked:false,textContent:'',innerHTML:'',
    className:'',hidden:false,style:{},dataset:{},children:kids,childNodes:kids,parentNode:null,options:[],
    classList:{add(){},remove(){},toggle(){},contains(){return false;}},
    appendChild(c){kids.push(c);if(c&&typeof c==='object')c.parentNode=this;return c;},
    insertBefore(c){kids.unshift(c);return c;},removeChild(c){return c;},remove(){},after(){},before(){},
    replaceChildren(...c){kids.length=0;kids.push(...c);},append(...c){kids.push(...c);},prepend(...c){kids.unshift(...c);},
    setAttribute(k,v){attrs[k]=String(v);},getAttribute(k){return attrs[k]??null;},removeAttribute(k){delete attrs[k];},
    addEventListener(){},removeEventListener(){},querySelector(){return null;},querySelectorAll(){return [];},
    closest(){return null;},focus(){},blur(){},setSelectionRange(){},
    getBoundingClientRect(){return {top:0,left:0,width:0,height:0};}};
}
function installedUi(){
  const els=new Map();
  const document={
    getElementById(id){if(!els.has(id))els.set(id,mkEl('div',id));return els.get(id);},
    createElement:t=>mkEl(t),createTextNode:t=>({textContent:t}),createDocumentFragment:()=>mkEl('fragment'),
    querySelector(){return null;},querySelectorAll(){return [];},addEventListener(){},
    head:mkEl('head'),body:mkEl('body'),documentElement:mkEl('html')};
  const card=mkEl('div');
  document.getElementById('noteModal').querySelector=sel=>sel==='.ns-editor'?card:null;
  card.appendChild(document.getElementById('inpNoteBody'));
  global.document=document;global.window=global;
  global.Element=global.HTMLElement=function Element(){};
  global.DeepFocusNotesCoreV21=require(path.join(web,'notes_core_v21.js'));
  delete require.cache[require.resolve(path.join(web,'notes_editor_ui.js'))];
  const ui=require(path.join(web,'notes_editor_ui.js'));
  let state={notesList:[],tasksList:[]};const notices=[];
  ui.install({readState:()=>JSON.parse(JSON.stringify(state)),nextNumericId:()=>72,now:()=>1000,
    commitNotes(before,after){state={...state,notesList:after.notesList};return true;},
    locale:()=>'ar',notify:m=>notices.push(m)});
  return {ui,document,notices,get notes(){return state.notesList;}};
}

test('saveNewNote through the installed Notes UX keeps typed title and body digits exactly',()=>{
  const r=installedUi();
  r.document.getElementById('inpNoteTitle').value='ملاحظة ۱۲۳';
  r.document.getElementById('inpNoteBody').value='النص ١٢٣ و 456';
  r.document.getElementById('selNoteCat').value='quick';
  r.document.getElementById('inpNoteCalDate').value='2026-10-26';
  const studio=fs.readFileSync(path.join(web,'notes_studio.js'),'utf8');
  const start=studio.indexOf('function saveNewNote(');
  const end=studio.indexOf('\nfunction nsToggleFlag(',start);
  assert.ok(start>=0&&end>start,'missing isolated saveNewNote function');
  const ctx={window:{DeepFocusNotesEditorUI:r.ui},document:r.document};
  const result=vm.runInNewContext(studio.slice(start,end)+'\nsaveNewNote();',ctx);
  assert.equal(result,true,'save failed: '+r.notices.join(' | '));
  assert.equal(r.notes.length,1);
  assert.equal(r.notes[0].id,72);
  assert.equal(r.notes[0].title,'ملاحظة ۱۲۳');
  assert.equal(r.notes[0].body,'النص ١٢٣ و 456');
});
