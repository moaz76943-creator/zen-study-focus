'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const UI=require('../../android/app/src/main/assets/web/notes_editor_ui.js');
const Core=require('../../android/app/src/main/assets/web/notes_core_v21.js');
const clone=x=>JSON.parse(JSON.stringify(x));
test('DF05: checklist progress counts authored checkboxes without generating task records',()=>{
 const value='☐ Study\n☑ Done\n- [ ] One\n- [x] Two\nNot a task';
 assert.deepEqual(UI.checklistProgress(value),{total:4,done:2});
 assert.deepEqual(UI.checklistProgress('plain paragraph'),{total:0,done:0});
});
test('DF05: note source export retains Arabic/German and Cornell fields, never mutates v21 records',()=>{
 const note={id:27,title:'Deutsch ü العربية',body:'Body ٩ and <script>bad()</script>',
  notesV21:{cornell:{cues:'Warum?',notes:'Antwort',summary:'تمام'},tags:['old']},legacy:'keep'};
 const before=clone(note);
 const txt=UI.serializeNote(note,'txt');
 assert.ok(txt.includes('Deutsch ü العربية'));
 assert.ok(txt.includes('Body ٩'));
 assert.ok(txt.includes('Main notes\nAntwort'));
 const md=UI.serializeNote(note,'md');
 assert.ok(md.startsWith('# Deutsch ü العربية'));
 assert.ok(md.includes('&lt;script&gt;'));
 assert.ok(!md.includes('<script>'));
 assert.throws(()=>UI.serializeNote(note,'pdf'),/INVALID_FORMAT/);
 assert.deepEqual(note,before);
});
test('DF05: backlinks read exact numeric ID without mutating legacy notes or writing',()=>{
 const notes=[
  {id:7,title:'A',body:'text',catKey:'quick',notesV21:{tags:['ar']}},
  {id:8,title:'B',body:'text',catKey:'quick',notesV21:{links:[7]},legacy:{keep:1}},
  {id:9,title:'C',body:'text',catKey:'quick',notesV21:{links:[7,8]}}
 ];
 const state={notesList:clone(notes),tasksList:[]},before=clone(state);let writes=0;
 const ctl=UI.createController({core:Core,readState:()=>clone(state),
   now:()=>100,nextNumericId:()=>15,commitNotes(){writes++;return true;}});
 assert.deepEqual(ctl.backlinks(7),[8,9]);
 assert.deepEqual(ctl.backlinks(8),[9]);
 assert.deepEqual(ctl.backlinks(9),[]);
 assert.throws(()=>ctl.backlinks(99),/NOTE_NOT_FOUND/);
 assert.deepEqual(state,before);
 assert.equal(writes,0);
});
