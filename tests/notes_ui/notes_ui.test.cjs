'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const UI = require('../../android/app/src/main/assets/web/notes_editor_ui.js');
const copy = value => JSON.parse(JSON.stringify(value));
const fakeCore = {
  createNote(notes,note) { if(notes.some(n=>n.id===note.id)) throw Error('DUPLICATE_ID'); return [copy(note),...notes]; },
  edit(notes,id,patch,{extension={}}) {
    if(notes.filter(n=>n.id===id).length!==1) throw Error('DUPLICATE_ID');
    return notes.map(n=>n.id===id?{...copy(n),...patch,notesV21:{...(n.notesV21||{}),...extension}}:n);
  },
  setStatus(notes,id,status,now) {return this.edit(notes,id,{}, {extension:status==='trash'?{deletedAt:now}:status==='archive'?{archivedAt:now}:{deletedAt:null,archivedAt:null}});},
  permanentlyDelete(notes,id,{approved}) {if(!approved || !notes.find(n=>n.id===id)?.notesV21?.deletedAt) throw Error('NOT_APPROVED');return notes.filter(n=>n.id!==id);},
  search(notes,opt) {let a=notes.filter(n=>opt.status==='trash'?n.notesV21?.deletedAt != null:opt.status==='archived'?n.notesV21?.archivedAt != null && n.notesV21?.deletedAt==null:!n.notesV21?.deletedAt&&!n.notesV21?.archivedAt);if(opt.query)a=a.filter(n=>(n.title+n.body).includes(opt.query));return {items:a,total:a.length};},
  undo:(notes)=>notes,redo:(notes)=>notes,link(notes,a,b){return this.edit(notes,a,{}, {extension:{links:[b]}});},
  recallCards(n){return (n.notesV21?.recallPairs||[]).map(x=>({noteId:n.id,...x}));},
  checklistCandidates(){return []}
};
const start = [{id:7,title:'Original',body:'old',catKey:'quick',unknown:{v:2},notesV21:{tags:['study']}}];
function rig(extra={}) {
  let state={notesList:copy(start),tasksList:[]}, commited=0, lastBefore;
  const a={core:fakeCore,readState:()=>copy(state),nextNumericId:()=>8,now:()=>1000,
    commitNotes(before,after){lastBefore=before;commited++;state.notesList=copy(after.notesList);return true;},...extra};
  return {ctl:UI.createController(a), get state(){return state},get commits(){return commited},get before(){return lastBefore}};
}
test('formatSelection inserts line markdown markers without truncating selected text',()=>{
  const v=UI.formatSelection('first\nsecond',6,12,'bullet');
  assert.equal(v.text,'first\n- second'); assert.ok(v.cursorStart>=6);
});
test('findOccurrences never treats a query as regex or markup',()=>{
  assert.deepEqual(UI.findOccurrences('<img> <img>','<img>'),[0,6]);
  assert.deepEqual(UI.findOccurrences('A[b A[b','[b'),[1,5]);
});
test('parseTags handles duplicates, Unicode and bounds safely',()=>{
  assert.deepEqual(UI.parseTags('تعلم, قراءة, تعلم'),['تعلم','قراءة']);
  assert.throws(()=>UI.parseTags('x'.repeat(121)),/Tag/);
});
test('save edits numeric v21 ID and preserves unrelated legacy fields',()=>{
 const r=rig();r.ctl.save({id:7,title:'Changed',body:'New',catKey:'quick',tags:['focus']});
 assert.equal(r.state.notesList[0].id,7);assert.deepEqual(r.state.notesList[0].unknown,{v:2});assert.equal(r.commits,1);
});
test('creation accepts only numeric allocated IDs and does not mutate on failure',()=>{
 const r=rig({nextNumericId:()=> 'note_8'});
 assert.throws(()=>r.ctl.save({id:null,title:'New',body:'Hello'}),/numeric/i);
 assert.equal(r.commits,0);assert.equal(r.state.notesList.length,1);
});
test('failed commit returns no success and never changes in-memory state',()=>{
 const r=rig({commitNotes(){throw Error('QUOTA_EXCEEDED')}});
 assert.throws(()=>r.ctl.save({id:7,title:'X',body:'x'}),/QUOTA_EXCEEDED/);
 assert.equal(r.state.notesList[0].body,'old');
});
test('a commit requires an explicit true durable acknowledgement',()=>{
 const r=rig({commitNotes(){return undefined}});
 assert.throws(()=>r.ctl.save({id:7,title:'X',body:'x'}),/DURABLE_COMMIT/);
 assert.equal(r.state.notesList[0].body,'old');
});
test('archive and trash are recoverable; no physical deletion is implicit',()=>{
 const r=rig();r.ctl.move(7,'archive');assert.equal(r.state.notesList[0].notesV21.archivedAt,1000);
 r.ctl.move(7,'trash');assert.equal(r.state.notesList.length,1);
 r.ctl.move(7,'restore');assert.equal(r.state.notesList[0].notesV21.deletedAt,null);
});
test('permanent deletion requires confirmation and backup acknowledgement',()=>{
 const r=rig({confirmPermanentDelete:()=>({confirmed:true,backupAcknowledged:false})});
 r.ctl.move(7,'trash');assert.throws(()=>r.ctl.purge(7),/BACKUP_ACKNOWLEDGEMENT/);
 assert.equal(r.state.notesList.length,1);
});
test('Cornell text remains separate from legacy body and recall requires authored answers',()=>{
 const r=rig();r.ctl.save({id:7,title:'C',body:'old',catKey:'cornell',
 cornell:{cues:'Question',notes:'Evidence',summary:'Answer'},recallPairs:[{question:'Q',answer:'A',key:'pair-1'}]});
 assert.equal(r.state.notesList[0].body,'old');
 assert.equal(r.state.notesList[0].notesV21.cornell.summary,'Answer');
 assert.equal(r.ctl.recall(7)[0].answer,'A');
});
test('HTML payloads are plain text, never an HTML sanitizer bypass',()=>{
 const s=UI.formatSelection('<img src=x onerror=alert(1)>',0,0,'heading');
 assert.ok(s.text.includes('<img src=x onerror=alert(1)>'));
 assert.ok(!UI.findOccurrences(s.text,'script').length);
});
