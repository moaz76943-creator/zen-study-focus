'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../../android/app/src/main/assets/web/notes_drafts.js'),'utf8');
const key='deep_focus_unsaved_note_draft_v1';
function rig({mismatch=false,write=true}={}){
 const els=new Map(),store=new Map(),base={value:'opened version A'};
 let closes=0,confirmations=0;
 function element(id){
  if(!els.has(id))els.set(id,{value:'',checked:false,hidden:true,textContent:'',dataset:{},
   classList:{contains:()=>true},addEventListener(){}});
  return els.get(id);
 }
 element('inpNoteTitle').value='Title';
 element('inpNoteBody').value='Unsaved editing';
 element('selNoteCat').value='quick';
 element('inpNoteCalDate').value='2026-10-26';
 const ctx={console,Date,JSON,Number,globalThis:undefined,
  cfg:{lang:'en'},nsEditId:7,localDateISO:()=> '2026-10-26',
  setTimeout:()=>1,clearTimeout(){},
  document:{getElementById:element,addEventListener(){}},
  window:{DeepFocusNotesEditorUI:{openedFingerprint:()=>base.value,
    draftFields:()=>({baseFingerprint:base.value}),restoreDraftFields(){}},
    addEventListener(){},confirm(){confirmations++;return false;}},
  saveFortressData(k,v){
    if(!write)return;
    const payload=JSON.parse(JSON.stringify(v));
    if(mismatch)payload.body='TAMPERED';
    store.set(k,payload);
  },
  loadFortressData:(k,fallback)=>store.get(k)||fallback,
  localStorage:{removeItem(k){store.delete(k);}},
  closeModal(){closes++;},nsUpdateCount(){}
 };
 delete ctx.globalThis;
 vm.createContext(ctx);vm.runInContext(source,ctx,{timeout:1000});
 return {run:code=>vm.runInContext(code,ctx,{timeout:1000}),store,base,
  get closes(){return closes;},get confirmations(){return confirmations;},element};
}
test('parallel05: outdated editor fingerprint blocks restoring and overwriting a newer draft',()=>{
 const h=rig();
 assert.equal(h.run('nsFlushDraft()'),true);
 const saved=JSON.parse(JSON.stringify(h.store.get(key)));
 h.base.value='opened version B';
 assert.equal(h.run('nsRestoreDraft()'),false);
 assert.equal(h.run('nsFlushDraft()'),false);
 assert.deepEqual(h.store.get(key),saved);
 assert.equal(h.element('nsDraftStatus').dataset.nsDraftStatus,'conflict');
});
test('parallel05: same-timestamp partial readback is not accepted as a saved draft',()=>{
 const h=rig({mismatch:true});
 assert.equal(h.run('nsFlushDraft()'),false);
});
test('parallel05: failed backup requires explicit consent before editor closes',()=>{
 const h=rig({write:false});
 h.run('nsScheduleDraft()');
 assert.equal(h.run('nsCloseEditor()'),false);
 assert.equal(h.closes,0);
 assert.equal(h.confirmations,1);
});
test('parallel05: legacy v1 drafts without fingerprints remain restorable',()=>{
 const h=rig();
 assert.equal(h.run('nsFlushDraft()'),true);
 const d=h.store.get(key);delete d.baseFingerprint;
 assert.equal(h.run('nsRestoreDraft()'),true);
});
