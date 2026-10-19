'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ui=require('../../design/ux_recovery15/prototype.js');
const read=name=>fs.readFileSync(path.join(__dirname,'../../design/ux_recovery15',name),'utf8');
test('quick task accepts valid text and rejects blanks without phantom writes',()=>{
 const m=ui.createModel({tasks:[],notes:[]});
 assert.equal(m.addTask('  Read  ').title,'Read');
 assert.throws(()=>m.addTask('  '),/TITLE_REQUIRED/);
 assert.equal(m.snapshot().tasks.length,1);
});
test('task actions: complete, checklist, deletion and undo',()=>{
 const m=ui.createModel({tasks:[],notes:[]});
 const t=m.addTask('Plan');
 m.addStep(t.id,'Outline');m.toggleStep(t.id,1);
 assert.equal(m.snapshot().tasks[0].steps[0].done,true);
 m.toggleTop(t.id);m.toggleTask(t.id);
 assert.equal(m.snapshot().tasks[0].top,false);
 m.deleteTask(t.id);assert.equal(m.snapshot().tasks.length,0);
 assert.equal(m.undoTask(),true);assert.equal(m.snapshot().tasks[0].id,t.id);
});
test('exact three active priorities',()=>{
 const m=ui.createModel({tasks:[],notes:[]});
 for(let i=0;i<4;i++)m.addTask('task-'+i);
 [1,2,3].forEach(i=>m.toggleTop(i));
 assert.throws(()=>m.toggleTop(4),/TOP_LIMIT/);
});
test('Cornell retains three distinct fields and editor update is deterministic',()=>{
 const m=ui.createModel({tasks:[],notes:[]});
 const n=m.addNote({title:'Test',body:'',kind:'cornell',cornell:{cues:'question',notes:'details',summary:'conclusion'}});
 assert.equal(m.snapshot().notes[0].cornell.cues,'question');
 assert.equal(m.snapshot().notes[0].cornell.summary,'conclusion');
 m.updateNote(n.id,{title:'Changed',body:'new',kind:'quick'});
 assert.equal(m.snapshot().notes[0].title,'Changed');
 m.deleteNote(n.id);assert.equal(m.undoNote(),true);
});
test('rejects empty note and preserves authored mixed-direction strings',()=>{
 const m=ui.createModel({tasks:[],notes:[]});
 assert.throws(()=>m.addNote({kind:'quick',body:'',title:''}),/EMPTY_NOTE/);
 const n=m.addNote({kind:'quick',title:'Deutsch بالعربي 2026',body:'RTL English'});
 assert.equal(n.title,'Deutsch بالعربي 2026');
});
test('prototype has no storage bridge or unsafe HTML user interpolation',()=>{
 const js=read('prototype.js');
 assert.doesNotMatch(js,/localStorage|sessionStorage|saveFortressData|ZEN21::|innerHTML/);
 assert.match(js,/textContent/);
});
test('Arabic and English demo dictionaries have parity',()=>{
 assert.deepEqual(Object.keys(ui.translations.ar).sort(),Object.keys(ui.translations.en).sort());
});
test('semantic dialogs, tab state and functional action targets',()=>{
 const html=read('index.html');
 for(const id of ['taskList','noteList','quickTaskForm','taskForm','noteForm','reader','taskUndo','noteUndo','cornellFields'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/role="dialog"/);assert.match(html,/aria-modal="true"/);
 assert.match(html,/aria-pressed="true"/);assert.match(html,/aria-live="polite"/);
 const js=read('prototype.js');
 for(const action of ['complete','edit-task','delete-task','add-step','toggle-step','read','edit-note','delete-note'])assert.ok(js.includes(action));
});
test('minimum touch size, narrow-screen and reduced-motion policy are scoped',()=>{
 const css=read('styles.css');
 assert.match(css,/\.ux15\s*\{/);assert.match(css,/--touch:44px/);
 assert.match(css,/@media\(max-width:370px\)/);assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/:focus-visible/);assert.match(css,/overflow-wrap:anywhere/);
});

test('validation never consumes a task ID or partially updates a record',()=>{
 const m=ui.createModel({tasks:[],notes:[]});
 assert.throws(()=>m.addTask(' '),/TITLE_REQUIRED/);
 const created=m.addTask('original');assert.equal(created.id,1);
 assert.throws(()=>m.updateTask(created.id,{title:'changed',due:'2030/01/01'}),/INVALID_DATE/);
 assert.equal(m.snapshot().tasks[0].title,'original');
});

test('browser entry point mounts only on the isolated UX15 document',()=>{
 const js=read('prototype.js');
 assert.match(js,/DOMContentLoaded/);
 assert.match(js,/api\.attach\(document\)/);
 assert.match(js,/body\.classList\.contains\('ux15'\)/);
});
