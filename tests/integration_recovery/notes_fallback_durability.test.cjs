'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'../../android/app/src/main/assets/web');
const source=fs.readFileSync(path.join(root,'notes_studio.js'),'utf8');
function rig(){
 const fields=new Map(),messages=[];let fail=false,closed=0,nextId=100;
 const get=id=>{
  if(['nsTemplates','nsEditorTemplates'].includes(id))return null;
  if(!fields.has(id))fields.set(id,{value:'',checked:false,textContent:'',classList:{add(){}},focus(){}});
  return fields.get(id);
 };
 const c=vm.createContext({notesList:[{id:7,title:'قديم ٢',body:'نص ٣',notesV21:{tags:['حفظ']},extra:9}],cfg:{lang:'ar'},window:{},Date,
  document:{getElementById:get},todayISO:'2026-10-20',selectedCalDate:'2026-10-20',
  nextRecordId:()=>nextId++,L:()=>({navNotes:'ملاحظات'}),toWest:s=>String(s).replace(/٢/g,'2').replace(/٣/g,'3'),
  showToast:s=>messages.push(s),closeModal(){closed++;},renderCalendar(){},
  commitLegacyRecords(field,records){if(fail)return false;c.notesList=records;return true;},
  legacyRecordIsUnique(records,id){return records.filter(n=>n.id===id).length===1;}
 });
 const run=s=>vm.runInContext(s,c);run(source.replace(/renderNotesStack\(\);\s*$/,''));
 run('renderNotesStack=()=>{}');
 return {run,get,c,messages,fail(v){fail=v;},get closed(){return closed;}};
}
test('DF-059/075 fallback note save preserves Unicode and never publishes failed edits',()=>{
 const h=rig();h.run('openNoteModal(null,7)');
 h.get('inpNoteTitle').value='نسخة ٢';h.get('inpNoteBody').value='  نص ٣\n';
 const before=h.run('JSON.stringify(notesList)');h.fail(true);
 assert.equal(h.run('saveNewNote()'),false);
 assert.equal(h.run('JSON.stringify(notesList)'),before);assert.equal(h.closed,0);
 h.fail(false);assert.equal(h.run('saveNewNote()'),true);
 assert.equal(h.run('notesList[0].title'),'نسخة ٢');assert.equal(h.run('notesList[0].body'),'  نص ٣\n');
 assert.equal(h.run('notesList[0].extra'),9);assert.equal(h.run('notesList[0].notesV21.tags[0]'),'حفظ');
});
test('DF-090 fallback editor rejects stale or ambiguous IDs without overwriting',()=>{
 const h=rig();h.run('openNoteModal(null,7);notesList[0].body="Newer saved edit"');
 h.get('inpNoteBody').value='Older editor';assert.equal(h.run('saveNewNote()'),false);
 assert.equal(h.run('notesList[0].body'),'Newer saved edit');assert.equal(h.closed,0);
 h.run('notesList.push({...notesList[0]})');const before=h.run('JSON.stringify(notesList)');
 h.run('nsToggleFlag(7,"pinned");nsDuplicate(7)');assert.equal(h.run('JSON.stringify(notesList)'),before);
});
test('DF-078 fallback duplicate and flag actions require durable commit',()=>{
 const h=rig(),before=h.run('JSON.stringify(notesList)');h.fail(true);
 assert.equal(h.run('nsToggleFlag(7,"favorite")'),false);assert.equal(h.run('nsDuplicate(7)'),false);
 assert.equal(h.run('JSON.stringify(notesList)'),before);assert.deepEqual(h.messages,[]);
 h.fail(false);assert.equal(h.run('nsToggleFlag(7,"favorite")'),true);
 assert.equal(h.run('nsDuplicate(7)'),true);assert.equal(h.run('notesList.length'),2);
});
