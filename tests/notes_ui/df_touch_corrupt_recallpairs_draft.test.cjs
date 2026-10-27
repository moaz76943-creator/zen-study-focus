'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const script=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/assets/web/notes_drafts.js'),'utf8');
function harness(){
  const values=new Map(),storage=new Map();
  const get=id=>{
    if(!values.has(id))values.set(id,{id,value:'',checked:false,hidden:true,textContent:'',
      dataset:{},classList:{contains:()=>true},addEventListener(){}});
    return values.get(id);
  };
  get('inpNoteTitle').value='Question';
  get('inpNoteBody').value='Body';
  get('selNoteCat').value='quick';
  get('inpNoteCalDate').value='2026-10-26';
  const context={cfg:{lang:'en'},nsEditId:7,Date,Number,JSON,console,
    setTimeout:()=>1,clearTimeout(){},
    localStorage:{removeItem(k){storage.delete(k);}},
    document:{getElementById:get,querySelectorAll:()=>[],visibilityState:'visible'},
    window:{addEventListener(){},document:null},
    saveFortressData:(k,v)=>{storage.set(k,JSON.parse(JSON.stringify(v)));},
    loadFortressData:(k,fallback)=>storage.get(k)||fallback,
    nsUpdateCount:()=>{},closeModal:()=>{}};
  context.window.document=context.document;
  vm.createContext(context);vm.runInContext(script,context,{filename:'notes_drafts.js',timeout:1000});
  return {get,storage,run:expr=>vm.runInContext(expr,context)};
}
const corruptDraft=()=>({v:1,editId:7,title:'old',body:'old',cat:'quick',
  date:'2026-10-26',updated:Date.now(),recallPairs:[null,{question:'Q',answer:'A'}]});

test('a corrupt recallPairs draft is rejected instead of crashing editor reopen',()=>{
  const h=harness();
  h.storage.set('deep_focus_unsaved_note_draft_v1',corruptDraft());
  assert.equal(h.run('nsGetStoredDraft()'),null);
  h.run('nsPrepareDraft()'); // reopen after force-stop must not throw
  assert.equal(h.run('nsFlushDraft()'),true); // editor remains usable and saves over it
  h.storage.set('deep_focus_unsaved_note_draft_v1',corruptDraft());
  assert.equal(h.run('nsRestoreDraft()'),false); // code may reject restore without crash
});
