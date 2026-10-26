'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const UI=require('../../android/app/src/main/assets/web/notes_editor_ui.js');
const Core=require('../../android/app/src/main/assets/web/notes_core_v21.js');
const clone=x=>JSON.parse(JSON.stringify(x));

test('DF-FINAL-03: Cornell save survives controller reopening with numeric IDs and unknown legacy fields',()=>{
 let durable={notesList:[{id:7,title:'Legacy',body:'Original text',catKey:'quick',
   isStarter:false,createdAt:1,updatedAt:1,unknown:{deep:['keep']},
   notesV21:{tags:['old'],unknownExtension:{version:21}}}],tasksList:[]};
 let writes=0;
 const adapter={core:Core,readState:()=>clone(durable),nextNumericId:()=>8,now:()=>2026102600000,
  commitNotes(before,after){
   assert.deepEqual(before,durable);
   durable=clone(after);writes++;return true;
  }};
 const first=UI.createController(adapter);
 const opened=JSON.stringify(first.one(7));
 first.save({id:7,title:'Cornell reopened',body:'Original text',catKey:'cornell',
   expectedSnapshot:opened,
   cornell:{cues:'Warum?',notes:'Antwort بالعربي',summary:'تم الحفظ'},
   recallPairs:[{key:'q1',question:'Frage?',answer:'Antwort'}]});
 assert.equal(writes,1);
 // A fresh controller reads ONLY the durable adapter, not the first editor's state.
 const reopened=UI.createController(adapter);
 const saved=reopened.one(7);
 assert.equal(saved.id,7);
 assert.equal(saved.title,'Cornell reopened');
 assert.equal(saved.body,'Original text');
 assert.equal(saved.notesV21.cornell.notes,'Antwort بالعربي');
 assert.deepEqual(saved.unknown,{deep:['keep']});
 assert.deepEqual(saved.notesV21.unknownExtension,{version:21});
 assert.equal(reopened.recall(7)[0].answer,'Antwort');
 const afterSave=clone(durable);
 assert.throws(()=>first.save({id:7,title:'Stale window',body:'erase',
   catKey:'quick',expectedSnapshot:opened}),/NOTE_CONFLICT_RELOAD_REQUIRED/);
 assert.deepEqual(durable,afterSave);
 assert.equal(writes,1);
});

test('DF-FINAL-03: rejected durable ACK cannot become a saved or reopened note',()=>{
 const note={id:10,title:'Safe original',body:'Permanent',catKey:'quick',
  createdAt:10,updatedAt:10,unknown:'stay'};
 const durable={notesList:[clone(note)],tasksList:[]};
 let attempts=0;
 const adapter={core:Core,readState:()=>clone(durable),nextNumericId:()=>11,now:()=>2026102600000,
  commitNotes(){attempts++;return false;}};
 const editor=UI.createController(adapter);
 assert.throws(()=>editor.save({id:10,title:'Unacknowledged',body:'Should not appear',catKey:'quick',
  expectedSnapshot:JSON.stringify(note)}),/DURABLE_COMMIT_NOT_CONFIRMED/);
 assert.equal(attempts,1);
 const reopened=UI.createController(adapter);
 assert.deepEqual(reopened.one(10),note);
});
