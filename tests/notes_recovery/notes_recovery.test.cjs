'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const UI = require('../../android/app/src/main/assets/web/notes_editor_ui.js');
const Core = require('../../android/app/src/main/assets/web/notes_core_v21.js');
const copy = x => JSON.parse(JSON.stringify(x));
const original = {id:7,title:'Old',body:'☐ Study\n☑ Done',catKey:'quick',
  unknown:{keep:true},notesV21:{tags:['old']},updatedAt:3};
function rig(initial=[original]) {
  let state={notesList:copy(initial),tasksList:[]},writes=0,seq=100;
  const controller=UI.createController({core:Core,
    readState:()=>copy(state),nextNumericId:()=>++seq,now:()=>++seq,
    commitNotes(before,after){writes++;state.notesList=copy(after.notesList);return true;}});
  return {controller,get state(){return state;},get writes(){return writes;}};
}

test('DF-090: a stale saved-note snapshot must not overwrite newer changes',()=>{
  const r=rig();
  const expected=JSON.stringify(r.state.notesList[0]);
  r.controller.save({id:7,title:'Second writer',body:'preserved',catKey:'quick'});
  const before=copy(r.state);
  assert.throws(()=>r.controller.save({id:7,title:'Stale editor',body:'lost',
    catKey:'quick',expectedSnapshot:expected}),/NOTE_CONFLICT_RELOAD_REQUIRED/);
  assert.deepEqual(r.state,before);
  assert.equal(r.writes,1);
});
test('DF-090: concurrent metadata edits conflict even when timestamps match',()=>{
  const r=rig();
  const expected=JSON.stringify(r.state.notesList[0]);
  r.state.notesList[0].notesV21.tags=['changed'];
  assert.throws(()=>r.controller.save({id:7,title:'overwrite',body:'x',expectedSnapshot:expected}),
    /NOTE_CONFLICT_RELOAD_REQUIRED/);
  assert.equal(r.writes,0);
});
test('DF-092: category selection filters before pagination (no empty false page)',()=>{
  const notes=Array.from({length:160},(_,i)=>({
    id:i+1,title:'Note '+i,body:'',catKey:i<140?'quick':'cornell',
    createdAt:i+1,updatedAt:i+1,isStarter:false
  }));
  const r=rig(notes);
  const first=r.controller.query({category:'cornell',status:'active',sort:'recent',offset:0,limit:10});
  assert.equal(first.total,20);assert.equal(first.items.length,10);
  assert.ok(first.items.every(n=>n.catKey==='cornell'));
  const next=r.controller.query({category:'cornell',status:'active',sort:'recent',offset:10,limit:10});
  assert.equal(next.items.length,10);
  assert.equal(new Set([...first.items,...next.items].map(n=>n.id)).size,20);
});
test('DF-092: paging never changes numeric IDs or note objects',()=>{
  const r=rig();
  const before=copy(r.state);
  r.controller.query({category:'quick',offset:0,limit:10});
  assert.deepEqual(r.state,before);
});
test('DF-094: checklist progress counts only real items and does not create tasks',()=>{
  assert.deepEqual(UI.checklistProgress('☐ A\n☑ B\n- [ ] C\n- [x] D\nOrdinary text'),
    {total:4,done:2});
  assert.deepEqual(UI.checklistProgress('No tasks'),{total:0,done:0});
});
test('DF-090: opened-note snapshot is checked before reopening a saved draft',()=>{
  const same={baseFingerprint:JSON.stringify(original)};
  assert.equal(UI.draftVersionMatches(same,original),true);
  assert.equal(UI.draftVersionMatches(same,{...original,body:'newer'}),false);
  assert.equal(UI.draftVersionMatches({},original),true); // legacy v1 compatibility
});
