'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const UI = require('../../android/app/src/main/assets/web/notes_editor_ui.js');
const Core = require('../../android/app/src/main/assets/web/notes_core_v21.js');
const copy = value => JSON.parse(JSON.stringify(value));

function rig(notes) {
  let state = {notesList:copy(notes),tasksList:[]}, writes=0;
  const controller = UI.createController({
    core:Core, readState:()=>copy(state), now:()=>100000,
    nextNumericId:()=>99999, commitNotes(before,after) {
      writes++;
      state=copy(after);
      return true;
    }
  });
  return {controller,get notes(){return state.notesList;},get writes(){return writes;}};
}

test('parallel05: edits opened before an external change fail closed, preserving the newer note and unknown fields',()=>{
  const original={id:7,title:'Original',body:'old',catKey:'quick',
    unknown:{opaque:'keep'},notesV21:{tags:['original']},createdAt:1,updatedAt:2};
  const r=rig([original]);
  const opened=JSON.stringify(r.notes[0]);
  r.controller.save({id:7,title:'External writer',body:'newer content',catKey:'quick'});
  const before=copy(r.notes);
  assert.throws(()=>r.controller.save({id:7,title:'Stale editor',body:'must not replace',
    catKey:'quick',expectedSnapshot:opened}),/NOTE_CONFLICT_RELOAD_REQUIRED/);
  assert.deepEqual(r.notes,before);
  assert.equal(r.writes,1);
  assert.deepEqual(r.notes[0].unknown,{opaque:'keep'});
});

test('parallel05: type filtering precedes pagination and never mutates stored notes',()=>{
  const notes=Array.from({length:160},(_,i)=>({id:i+1,title:'Note '+i,body:'',
    catKey:i<140?'quick':'cornell',createdAt:i+1,updatedAt:i+1,isStarter:false,
    unknown:{row:i}}));
  const r=rig(notes),snapshot=copy(r.notes);
  const a=r.controller.query({category:'cornell',status:'active',sort:'recent',offset:0,limit:10});
  const b=r.controller.query({category:'cornell',status:'active',sort:'recent',offset:10,limit:10});
  assert.equal(a.total,20);
  assert.equal(a.items.length,10);
  assert.equal(b.items.length,10);
  assert.ok([...a.items,...b.items].every(n=>n.catKey==='cornell'));
  assert.equal(new Set([...a.items,...b.items].map(n=>n.id)).size,20);
  assert.deepEqual(r.notes,snapshot);
  assert.equal(r.writes,0);
});
