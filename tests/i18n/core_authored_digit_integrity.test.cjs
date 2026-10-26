'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/assets/web/app.js'),'utf8');

function run(name,ctx,endName){
 const start=source.indexOf('function '+name+'(');
 const end=source.indexOf('\nfunction '+endName+'(',start);
 assert.ok(start>=0&&end>start,'missing isolated '+name+' function');
 vm.runInNewContext(source.slice(start,end)+'\n'+name+'();',ctx);
}
function fixture(){
 const fields={
  inpNewTask:{value:'خطة ۲۰۲۶'},selTaskCat:{value:'study'},inpTaskDate:{value:'2026-10-26'},
  inpNoteTitle:{value:'ملاحظة ۱۲۳'},inpNoteBody:{value:'النص ١٢٣'},
  selNoteCat:{value:'cornell'},inpNoteCalDate:{value:'2026-10-26'},chkNoteBlur:{checked:false},
  inpQuickDump:{value:'فكرة ۷۸۹'}
 };
 const notes=[],tasks=[],clipboard=[];
 const toWest=v=>String(v).replace(/[٠-٩]/g,ch=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(ch)))
  .replace(/[۰-۹]/g,ch=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(ch)));
 const ctx={document:{getElementById:id=>fields[id]},notesList:notes,tasksList:tasks,
  nextRecordId:()=>72,todayISO:'2026-10-26',L:()=>({navNotes:'Notes'}),toWest,
  saveFortressData:()=>true,renderNotesStack(){},renderCalendar(){},renderTasksList(){},
  closeModal(){},showToast(){},navigator:{clipboard:{writeText:s=>clipboard.push(s)}}};
 return {ctx,notes,tasks,clipboard,fields};
}
test('quick-added task preserves the exact user-authored numerals in persisted title',()=>{
 const f=fixture();run('createNewTask',f.ctx,'deleteTaskItem');
 assert.equal(f.tasks[0].title,'خطة ۲۰۲۶');
});
test('new note preserves exactly entered title and body numerals in v21 record',()=>{
 const f=fixture();run('saveNewNote',f.ctx,'pinNoteToTodayCalendar');
 assert.equal(f.notes[0].title,'ملاحظة ۱۲۳');
 assert.equal(f.notes[0].body,'النص ١٢٣');
});
test('brain dump preserves authored numerals in task or note text',()=>{
 for(const asTask of [true,false]){
  const f=fixture();
  const start=source.indexOf('function saveQuickDump(');
  const end=source.indexOf('/* ========================================================',start);
  assert.ok(start>=0&&end>start);
  vm.runInNewContext(source.slice(start,end)+'\nsaveQuickDump('+asTask+');',f.ctx);
  assert.equal(asTask?f.tasks[0].title:f.notes[0].body,'فكرة ۷۸۹');
 }
});
test('plain text note export preserves authored numerals without converting them',()=>{
 const f=fixture();
 f.notes.push({title:'ملاحظة ۱۲۳',body:'النص ١٢٣',calDate:'2026-10-26'});
 run('exportAllNotes',f.ctx,'openBrainDumpModal');
 assert.ok(f.clipboard[0].includes('ملاحظة ۱۲۳'));
 assert.ok(f.clipboard[0].includes('النص ١٢٣'));
});
test('user-authored task and note previews never normalize title or body digits',()=>{
 const renderTasks=source.slice(source.indexOf('function renderTasksList('),source.indexOf('function toggleTaskDone('));
 const renderNotes=source.slice(source.indexOf('function renderNotesStack('),source.indexOf('function openNoteModal('));
 assert.doesNotMatch(renderTasks,/toWest\(t\.title\)/);
 assert.doesNotMatch(renderNotes,/toWest\(n\.(?:title|body)\)/);
});
