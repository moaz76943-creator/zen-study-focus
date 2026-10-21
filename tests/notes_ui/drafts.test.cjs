'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const script=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/assets/web/notes_drafts.js'),'utf8');
function harness(allowWrite=true){
 const values=new Map(),storage=new Map();let restored=null;
 const get=id=>{
   if(!values.has(id))values.set(id,{id,value:'',checked:false,hidden:true,textContent:'',
     classList:{contains:()=>true},addEventListener(){}});
   return values.get(id);
 };
 get('inpNoteTitle').value='Lesson';
 get('inpNoteBody').value='Legacy text';
 get('selNoteCat').value='cornell';
 get('inpNoteCalDate').value='2026-10-19';
 const context={cfg:{lang:'ar'},nsEditId:7,Date,Number,JSON,console,
   setTimeout:()=>1,clearTimeout(){},localStorage:{removeItem(k){storage.delete(k);}},
   document:{getElementById:get,addEventListener(){},visibilityState:'visible'},
   window:{addEventListener(){},DeepFocusNotesEditorUI:{
     draftFields:()=>({cornell:{cues:'Question',notes:'Explanation',summary:'Summary'},tags:'study, work',notebookId:'A1',
       recallPairs:[{key:'q-1',question:'Q?',answer:'A!'}]}),
     restoreDraftFields:d=>{restored=d;}} },
   saveFortressData:(k,v)=>{if(allowWrite)storage.set(k,JSON.parse(JSON.stringify(v)));return allowWrite;},
   loadFortressData:(k,fallback)=>storage.get(k)||fallback,
   nsUpdateCount:()=>{},closeModal:()=>{}};
 vm.createContext(context);vm.runInContext(script,context,{filename:'notes_drafts.js',timeout:1000});
 return {get,storage,context,run:expression=>vm.runInContext(expression,context),restored:()=>restored};
}
test('autosave verifies storage and restores structured Cornell, tags and recall',()=>{
 const h=harness();
 assert.equal(h.run('nsFlushDraft()'),true);
 const draft=h.storage.get('deep_focus_unsaved_note_draft_v1');
 assert.equal(draft.editId,7);
 assert.equal(draft.cornell.summary,'Summary');
 assert.equal(draft.recallPairs[0].answer,'A!');
 h.get('inpNoteBody').value='';
 assert.equal(h.run('nsRestoreDraft()'),true);
 assert.equal(h.get('inpNoteBody').value,'Legacy text');
 assert.equal(h.restored().cornell.cues,'Question');
});
test('a foreign note draft is never silently overwritten',()=>{
 const h=harness();assert.equal(h.run('nsFlushDraft()'),true);
 const saved=h.storage.get('deep_focus_unsaved_note_draft_v1');
 h.context.nsEditId=8;h.get('inpNoteBody').value='Another note';
 assert.equal(h.run('nsFlushDraft()'),false);
 assert.strictEqual(h.storage.get('deep_focus_unsaved_note_draft_v1'),saved);
 assert.match(h.get('nsDraftStatus').textContent,/مسودة/);
});
test('storage quota / ignored write cannot produce a saved status',()=>{
 const h=harness(false);
 assert.equal(h.run('nsFlushDraft()'),false);
 assert.equal(h.storage.size,0);
});
test('legacy v1 drafts are still accepted without optional structured fields',()=>{
 const h=harness();
 h.storage.set('deep_focus_unsaved_note_draft_v1',
   {v:1,editId:7,title:'Existing',body:'Old',cat:'quick',date:'2026-10-19',updated:Date.now()});
 assert.equal(h.run('nsGetStoredDraft().title'),'Existing');
});
test('stale drafts are rejected rather than applied to a different session',()=>{
 const h=harness();
 h.storage.set('deep_focus_unsaved_note_draft_v1',
   {v:1,editId:7,title:'Old',body:'Old',cat:'quick',date:'2026-10-19',updated:Date.now()-31*86400000});
 assert.equal(h.run('nsGetStoredDraft()'),null);
});
