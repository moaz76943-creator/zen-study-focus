'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const N = require('../../android/app/src/main/assets/web/notes_core_v21.js');
const clone = x => JSON.parse(JSON.stringify(x));
const seed = () => [
  {id:1,isStarter:true,title:'قديم',body:'أهلاً بالعالم',catKey:'cornell',calDate:'2026-10-19',blur:false,theme:'legacy',customUnknown:{keep:[1,2]},createdAt:2},
  {id:77,title:'مذاكرة',body:'☐ راجع الدرس\n- [ ] اقرأ الفصل\n☐ راجع الدرس',catKey:'quick',pinned:true,favorite:true,createdAt:3,notesV21:{customOther:'preserve'}}
];
const at = 12345678;
test('pure module exposes a browser-safe API with no storage or DOM access',()=>{
  assert.equal(typeof N.search,'function'); assert.equal(typeof N.extractTasks,'function');
  assert.equal(N.MAX_NOTES,10000);
});
test('numeric IDs preserved verbatim; strings and unsafe values rejected',()=>{
  for(const bad of ['77','note_77',-1,Number.MAX_SAFE_INTEGER+1,null]) {
    assert.throws(()=>N.createNote([], {id:bad,title:'x',body:'y'}, {now:at}));
    assert.throws(()=>N.edit(seed(),bad,{title:'x'},{now:at}));
  }
  assert.equal(N.createNote(seed(),{id:0,title:'Zero',body:''},{now:at})[0].id,0);
});
test('create/edit preserves unknown legacy fields, flags, IDs and does not modify input',()=>{
  const notes=seed(),before=clone(notes);
  const created=N.createNote(notes,{id:78,title:'New',body:'text',extra:{hello:1}},{now:at});
  const edited=N.edit(created,1,{body:'new text'},{now:at,extension:{tags:['work','ar','work'], notebookId:'desk',kind:'cornell',cornell:{cues:'Q',notes:'A',summary:'S'}}});
  assert.deepEqual(notes,before); assert.equal(edited[1].id,1);
  assert.deepEqual(edited[1].customUnknown,{keep:[1,2]});
  assert.equal(edited[1].theme,'legacy');assert.equal(edited[1].calDate,'2026-10-19');
  assert.deepEqual(edited[1].notesV21.tags,['work','ar']);
  assert.equal(N.cornellText(edited[1]),'CUES / QUESTIONS\n\nQ\n\nMAIN NOTES\n\nA\n\nSUMMARY\n\nS');
  assert.equal(edited[1].body,'new text','Cornell structure does not silently rewrite legacy body');
  assert.equal(edited[0].extra.hello,1);
});
test('does not merge, renumber or mutate duplicate-id records',()=>{
  const notes=[...seed(),clone(seed()[0])],before=clone(notes);
  assert.throws(()=>N.edit(notes,1,{body:'bad'},{now:at}),/DUPLICATE_ID/);
  assert.throws(()=>N.link(notes,77,1,at),/DUPLICATE_ID/);
  assert.deepEqual(notes,before);
});
test('immutable bounded undo/redo restores content and unknown fields, redo invalidated by new edit',()=>{
  const a=seed(),b=N.edit(a,1,{body:'first'}, {now:at}),c=N.edit(b,1,{body:'second'}, {now:at+1});
  const undone=N.undo(c,1,at+2);assert.equal(undone[0].body,'first');
  assert.deepEqual(undone[0].customUnknown,{keep:[1,2]});
  const redone=N.redo(undone,1,at+3);assert.equal(redone[0].body,'second');
  const diverged=N.edit(undone,1,{body:'third'},{now:at+4});
  assert.deepEqual(diverged[0].notesV21.redo,[]);
  let many=a;for(let i=0;i<50;i++)many=N.edit(many,1,{body:String(i)},{now:at+i});
  assert.equal(many[0].notesV21.revisions.length,10);
  assert.equal(N.undo(a,1,at),a);
});
test('Cornell and custom templates preserve semantic sections and guard fields',()=>{
  const template=N.createTemplate({id:'my-template',name:'My checklist',body:'☐ One',cornell:{cues:'Why?',notes:'Answer',summary:'Takeaway'}});
  const result=N.fromTemplate(seed(),template,100,{now:at,title:'My Note',fields:{theme:'pearl'}});
  assert.equal(result[0].title,'My Note'); assert.equal(result[0].id,100);
  assert.equal(result[0].notesV21.cornell.summary,'Takeaway');assert.equal(result[0].theme,'pearl');
  assert.throws(()=>N.createTemplate({id:'bad',name:'Missing body'}));
  assert.throws(()=>N.fromTemplate([],template,5,{now:at,fields:{id:4}}),/Protected/);
});
test('archive, trash, restore and explicit trash-only deletion',()=>{
  const a=seed(),b=N.setStatus(a,1,'archive',at);
  assert.equal(N.search(b).total,1);assert.equal(N.search(b,{status:'archived'}).total,1);
  const c=N.setStatus(b,1,'trash',at+1);assert.equal(N.search(c,{status:'trash'}).total,1);
  assert.throws(()=>N.edit(c,1,{body:'oops'},{now:at+1}),/IN_TRASH/);
  assert.throws(()=>N.permanentlyDelete(c,1),/NOT_APPROVED/);
  assert.equal(N.permanentlyDelete(c,1,{approved:true}).length,1);
  const d=N.setStatus(c,1,'restore',at+2);assert.equal(N.search(d).total,2);
  assert.equal(d[0].notesV21.deletedAt,null);assert.equal(d[0].notesV21.archivedAt,null);
  assert.equal(a[0].notesV21,undefined,'Original data never changed');
});
test('link by stable numeric note IDs, never auto-create target or inverse link',()=>{
  const a=seed(),b=N.link(a,1,77,at);
  assert.deepEqual(b[0].notesV21.links,[77]); assert.deepEqual(N.backlinks(b,77),[1]);
  assert.equal(b[1].notesV21.links,undefined);
  assert.equal(N.link(b,1,77,at+1),b,'No duplicate link');
  assert.throws(()=>N.link(a,1,1,at),/SELF_LINK/);
  assert.throws(()=>N.link(a,1,999,at),/NOTE_NOT_FOUND/);
});
test('Arabic search strips diacritics only in lookup; original body is unchanged',()=>{
  const a=seed(), b=N.edit(a,1,{body:'الْعِلْمُ نُورٌ'},{now:at});
  const found=N.search(b,{query:'العلم نور'});
  assert.equal(found.total,1);assert.equal(found.items[0].body,'الْعِلْمُ نُورٌ');
  assert.equal(b[0].body,'الْعِلْمُ نُورٌ');
  assert.equal(N.normalizeSearch('إِسْلام'), 'اسلام');
  assert.equal(a[0].body,'أهلاً بالعالم');
});
test('multi-tag, notebook, favorites, pin sort, offset and bounded pages',()=>{
  let notes=seed();notes=N.edit(notes,77,{}, {now:at,extension:{tags:['مذاكرة','امتحان'],notebookId:'book-1',kind:'study'}});
  assert.equal(N.search(notes,{tags:['مذاكرة','امتحان'],notebookId:'book-1',favoriteOnly:true}).total,1);
  assert.equal(N.search(notes,{tags:['مذاكرة','missing']}).total,0);
  assert.equal(N.search(notes,{kind:'study'}).items[0].id,77);
  assert.equal(N.search(notes).items[0].id,77,'Pinned first');
  assert.equal(N.search(notes,{offset:1,limit:1}).items[0].id,1);
  assert.equal(N.search(notes,{limit:999}).limit,100);
});
test('checklist extraction plans stable keys and rejects repeated extract even after task removal',()=>{
  const notes=seed(), tasks=[{id:1,title:'Existing task',done:false}];
  const items=N.checklistCandidates(notes,tasks,77);
  assert.equal(items.length,3);
  assert.equal(new Set(items.map(x=>x.key)).size,3,'Repeated labels remain separate checkboxes');
  const before=clone(notes),result=N.extractTasks(notes,tasks,77,items.map((x,i)=>({key:x.key,taskId:i+100})),at);
  assert.equal(result.created.length,3);assert.equal(result.tasks.length,4);
  assert.equal(result.created[0].originNoteId,77);assert.equal(typeof result.created[0].id,'number');
  assert.equal(N.checklistCandidates(result.notes,result.tasks,77).length,0);
  assert.equal(N.checklistCandidates(result.notes,[],77).length,0,'Exported registry guards even if task is removed');
  assert.throws(()=>N.extractTasks(result.notes,result.tasks,77,[{key:items[0].key,taskId:999}],at+1),/ALREADY_EXTRACTED/);
  assert.throws(()=>N.extractTasks(notes,tasks,77,[{key:items[0].key,taskId:1}],at),/DUPLICATE_TASK_ID/);
  assert.deepEqual(notes,before);assert.equal(tasks.length,1);
});
test('Active Recall only emits explicitly authored Q/A; no fabricated answer',()=>{
  const notes=seed(),first=N.recallCards(notes[0]);assert.deepEqual(first,[]);
  const b=N.edit(notes,1,{}, {now:at,extension:{recallPairs:[{key:'q-1',question:'لماذا؟',answer:'لأنها تجربة.'}]}});
  assert.deepEqual(N.recallCards(b[0]),[{noteId:1,key:'q-1',question:'لماذا؟',answer:'لأنها تجربة.'}]);
  assert.throws(()=>N.edit(notes,1,{}, {now:at,extension:{recallPairs:[{question:'Question?',answer:''}]}}));
});
test('10,000 notes: pagination bounded, consistent deterministic ordering; originals retained',()=>{
  const many=Array.from({length:10000},(_,i)=>({id:i,title:'بحث '+i,body:'نص كبير',createdAt:i}));
  const start=performance.now();const result=N.search(many,{query:'بحث',offset:200,limit:500,sort:'recent'});
  const elapsed=performance.now()-start;
  assert.equal(result.total,10000);assert.equal(result.items.length,100);
  assert.equal(result.items[0].id,9799);assert.ok(elapsed<1500,'Search took '+elapsed.toFixed(1)+'ms');
  assert.equal(many[0].id,0);assert.throws(()=>N.search([...many,many[0]]),/at most/);
});
test('blocking protected field updates prevents hidden ID/record changes',()=>{
  const a=seed();
  for(const patch of [{id:88},{notesV21:{}},{createdAt:0},{isStarter:false}])
    assert.throws(()=>N.edit(a,1,patch,{now:at}),/Protected/);
  assert.throws(()=>N.edit(a,1,{title:'x'},{now:'2026-10-19'}),/timestamp/);
});
test('extraction registry cannot be reset by regular extension patches or Undo',()=>{
  const notes=seed();
  const candidates=N.checklistCandidates(notes,[],77);
  const editBefore=N.edit(notes,77,{title:'updated'},{now:at});
  const done=N.extractTasks(editBefore,[],77,[{key:candidates[0].key,taskId:101}],at+1);
  const undone=N.undo(done.notes,77,at+2);
  assert.equal(N.checklistCandidates(undone,[],77).length,2);
  assert.throws(()=>N.edit(done.notes,77,{}, {now:at+3,extension:{extractedKeys:[]}}),/Protected/);
  assert.equal(done.notes[1].notesV21.revisions.length,1,'Task extraction must not be undone as a text edit');
});
test('corrupt extension is rejected rather than silently replacing unknown payload',()=>{
  const notes=seed(); notes[1].notesV21='strange-legacy';
  assert.throws(()=>N.edit(notes,77,{title:'new'},{now:at}),/Invalid notesV21/);
});
test('explicit recall pair keys must be unique',()=>{
  const notes=seed();
  assert.throws(()=>N.edit(notes,77,{}, {now:at,extension:{recallPairs:[{key:'a',question:'q',answer:'a'},{key:'a',question:'q2',answer:'a2'}]}}),/DUPLICATE_RECALL_KEY/);
});
