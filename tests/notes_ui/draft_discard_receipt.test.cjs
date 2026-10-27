'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/assets/web/notes_drafts.js'),'utf8');
const key='deep_focus_unsaved_note_draft_v1';
function rig(failure){
 const draft={v:1,editId:7,title:'Unfinished note',body:'Keep until discarded',cat:'quick',date:'2026-10-27',updated:Date.now()};
 const storage=new Map([[key,draft],[key+'_mirror',draft]]),elements=new Map();
 const element=id=>{
  if(!elements.has(id))elements.set(id,{value:'',dataset:{},hidden:true,classList:{contains:()=>true},addEventListener(){}});
  return elements.get(id);
 };
 const context={cfg:{lang:'en'},nsEditId:7,Date,Number,JSON,setTimeout:()=>1,clearTimeout(){},
  document:{getElementById:element,addEventListener(){}},window:{addEventListener(){}},
  loadFortressData:k=>storage.get(k)||storage.get(k+'_mirror')||null,
  localStorage:{
   getItem:k=>storage.get(k)??null,
   removeItem(k){
    if(failure==='throw'||failure==='mirror'&&k.endsWith('_mirror'))throw new Error('Storage unavailable');
    if(failure!=='ignored')storage.delete(k);
   }
  }
 };
 vm.createContext(context);vm.runInContext(source,context);
 return {run:code=>vm.runInContext(code,context),storage,element};
}
for(const failure of ['throw','ignored','mirror'])test('discard cannot report success after '+failure+' deletion',()=>{
 const r=rig(failure);
 assert.equal(r.run('nsDiscardDraft()'),false);
 assert.equal(r.element('nsDraftStatus').dataset.nsDraftStatus,'failed');
 assert.equal(r.element('nsDraftDiscard').hidden,false);
 assert.equal(r.run('nsGetStoredDraft().body'),'Keep until discarded');
});
test('discard success requires both draft copies to be absent',()=>{
 const r=rig();
 assert.equal(r.run('nsDiscardDraft()'),true);
 assert.equal(r.storage.size,0);
 assert.equal(r.element('nsDraftStatus').dataset.nsDraftStatus,'cleared');
});
test('discard does not delete another note draft',()=>{
 const r=rig();r.run('nsEditId=8');
 assert.equal(r.run('nsDiscardDraft()'),false);
 assert.equal(r.storage.size,2);
});
