'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/assets/web/app.js'),'utf8');
function rig(integrated=true) {
 const fields=new Map(),messages=[],closed=[];
 const state={cfg:{lang:'ar'},tasksList:[{id:7,title:'مهمة ٢',done:false,extra:42}],notesList:[{id:8,title:'قديم',body:'نص',extra:9}]};
 let fail=false;
 const c=vm.createContext({...state,window:{},JSON,Number,Date,Set,
  document:{getElementById(id){if(!fields.has(id))fields.set(id,{value:'',checked:false});return fields.get(id);}},
  selectedCalDate:'2026-10-20',todayISO:'2026-10-19',
  showToast:s=>messages.push(s),closeModal:s=>closed.push(s),
  renderTasksList(){},renderNotesStack(){},renderCalendar(){},
  confirmSensitiveAction:()=>true,L:()=>({navNotes:'ملاحظات'}),
  saveFortressData(){if(fail)throw Error('QuotaExceededError');return true;}
 });
 const run=s=>vm.runInContext(s,c);
 if(integrated)c.window.DF22Integration={
  getSnapshot:()=>JSON.parse(run('JSON.stringify({cfg,tasksList,notesList})')),
  write(before,after){if(fail)throw Error('QuotaExceededError');Object.assign(c,JSON.parse(JSON.stringify(after)));return true;}
 };
 for(const name of ['toWest','commitLegacyRecords','legacyRecordIsUnique','toggleTaskDone','nextRecordId','createNewTask','deleteTaskItem','saveNewNote','pinNoteToTodayCalendar','toggleNoteBlur','deleteNoteCard','saveQuickDump']) {
  const start=source.indexOf('function '+name+'('),end=source.indexOf('\n}',start)+2;
  assert.ok(start>=0&&end>start,name);run(source.slice(start,end));
 }
 run('let lastAllocatedRecordId=0;');
 const input=(id,value)=>{c.document.getElementById(id).value=value;};
 return {run,input,fields,messages,closed,fail(v){fail=v;}};
}
for(const integrated of [true,false])test('failed legacy edits preserve memory, input and modal; verified retry saves once (integration='+integrated+')',()=>{
 const r=rig(integrated);
 r.input('inpNewTask','مهمة ٣');r.input('inpTaskDate','');r.input('selTaskCat','study');
 r.input('inpNoteTitle','عنوان ٤');r.input('inpNoteBody','نص ٥');r.input('selNoteCat','quick');r.input('inpNoteCalDate','');
 r.input('inpQuickDump','فكرة ٦');
 const before=r.run('JSON.stringify({tasksList,notesList})');r.fail(true);
 for(const action of ['createNewTask()','saveNewNote()','toggleTaskDone(7)','deleteTaskItem(7)','pinNoteToTodayCalendar(8)','toggleNoteBlur(8)','deleteNoteCard(8)','saveQuickDump(true)','saveQuickDump(false)']){
  r.run(action);assert.equal(r.run('JSON.stringify({tasksList,notesList})'),before,action);
 }
 assert.equal(r.fields.get('inpNewTask').value,'مهمة ٣');assert.deepEqual(r.closed,[]);
 assert.ok(r.messages.every(s=>s.includes('تعذر الحفظ')));
 r.fail(false);r.run('createNewTask()');r.run('createNewTask()');
 assert.equal(r.run('tasksList.length'),2);assert.equal(r.run('tasksList[0].title'),'مهمة ٣');
 assert.equal(r.run('tasksList[0].date'),'');assert.equal(r.run('tasksList[1].extra'),42);
 r.run('saveNewNote()');assert.equal(r.run('notesList[0].body'),'نص ٥');
 assert.equal(r.run('notesList[1].extra'),9);assert.deepEqual(r.closed,['noteModal']);
});

test('ambiguous historical IDs block singular edit/delete actions without deleting or renumbering any record',()=>{
 const r=rig();r.run('tasksList.push({...tasksList[0],title:"Other task"});notesList.push({...notesList[0],body:"Other note"});');
 const before=r.run('JSON.stringify({tasksList,notesList})');
 for(const action of ['toggleTaskDone(7)','deleteTaskItem(7)','pinNoteToTodayCalendar(8)','toggleNoteBlur(8)','deleteNoteCard(8)']){
  r.run(action);assert.equal(r.run('JSON.stringify({tasksList,notesList})'),before,action);
 }
 assert.equal(r.messages.length,5);assert.ok(r.messages.every(s=>s.includes('بالمعرف نفسه')));
});
