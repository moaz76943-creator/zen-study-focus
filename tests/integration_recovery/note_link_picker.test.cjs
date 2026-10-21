'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const UI=require('../../android/app/src/main/assets/web/notes_editor_ui.js');
test('DF-096/116 chooser retains numeric v21 namespaces and authored titles',()=>{
 const rows=[{id:7,title:'نص ٢'}],before=JSON.stringify(rows);
 assert.equal(UI.linkCandidates(7,rows,'task')[0].id,7,'Same note/task numeric IDs are independent namespaces');
 assert.equal(UI.linkCandidates(7,rows,'note').length,0,'A note cannot link itself');
 assert.equal(JSON.stringify(rows),before);
});
test('DF-096 ambiguous, string, starter and deleted targets are unavailable without erasing them',()=>{
 const rows=[{id:7,title:'A'},{id:7,title:'B'},{id:'8',title:'String ID'},
 {id:9,isStarter:true,title:'Sample'},{id:10,title:'Deleted',notesV21:{deletedAt:5}},
 {id:11,title:'Deleted task',deletedAt:5},{id:12,title:'Available'}];
 const before=JSON.stringify(rows);
 assert.deepEqual(UI.linkCandidates(1,rows,'note').map(n=>n.id),[12]);
 assert.equal(JSON.stringify(rows),before);
});
