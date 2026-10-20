'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/assets/web/notes_drafts.js'),'utf8');
function rig(writeOK=true){
  const elements=new Map(),storage=new Map(),base={value:'snapshot A'};
  let closeCount=0,confirmCount=0;
  function el(id){
    if(!elements.has(id))elements.set(id,{id,value:'',checked:false,textContent:'',hidden:true,
      classList:{contains:()=>true},addEventListener(){}});
    return elements.get(id);
  }
  el('inpNoteTitle').value='Original';el('inpNoteBody').value='Typed draft';
  el('selNoteCat').value='quick';el('inpNoteCalDate').value='2026-10-19';
  const ctx={cfg:{lang:'en'},nsEditId:7,Date,Number,JSON,console,
    setTimeout:()=>1,clearTimeout(){},localStorage:{removeItem(k){storage.delete(k);}},
    document:{getElementById:el,addEventListener(){}},
    window:{addEventListener(){},confirm(){confirmCount++;return false;},
      DeepFocusNotesEditorUI:{
        openedFingerprint:()=>base.value,
        draftFields:()=>({baseFingerprint:base.value}),
        restoreDraftFields(){}
      }},
    saveFortressData:(k,v)=>{if(writeOK)storage.set(k,JSON.parse(JSON.stringify(v)));return writeOK;},
    loadFortressData:(k,v)=>storage.get(k)||v,
    localDateISO:()=> '2026-10-19',nsUpdateCount(){},closeModal(){closeCount++}
  };
  vm.createContext(ctx);vm.runInContext(source,ctx,{timeout:1000});
  return {run:expr=>vm.runInContext(expr,ctx,{timeout:1000}),base,storage,el,ctx,
    get closeCount(){return closeCount;},get confirmCount(){return confirmCount;}};
}
test('DF-090 draft from an older persisted note cannot replace a newer saved version',()=>{
  const h=rig();
  assert.equal(h.run('nsFlushDraft()'),true);
  const before=h.storage.get('deep_focus_unsaved_note_draft_v1');
  h.base.value='snapshot B';
  assert.equal(h.run('nsRestoreDraft()'),false);
  assert.equal(h.run('nsFlushDraft()'),false);
  assert.deepEqual(h.storage.get('deep_focus_unsaved_note_draft_v1'),before);
  assert.match(h.el('nsDraftStatus').textContent,/changed/);
  assert.equal(h.run('nsDiscardDraft()'),true);
});
test('DF-089 closing after quota failure requires explicit confirmation',()=>{
  const h=rig(false);
  h.run('nsDraftDirty=true');
  assert.equal(h.run('nsCloseEditor()'),false);
  assert.equal(h.closeCount,0);
  assert.equal(h.confirmCount,1);
});
test('DF-090 fingerprint survives encoded draft round-trip without altering legacy IDs',()=>{
  const h=rig();
  assert.equal(h.run('nsFlushDraft()'),true);
  const saved=h.storage.get('deep_focus_unsaved_note_draft_v1');
  assert.strictEqual(saved.editId,7);
  assert.equal(saved.baseFingerprint,'snapshot A');
});

test('DF-090 same-millisecond ignored write cannot acknowledge stale draft content',()=>{
  const h=rig();
  h.ctx.Date={now:()=>1792368000000};
  assert.equal(h.run('nsFlushDraft()'),true);
  h.el('inpNoteBody').value='New Unicode edits ١٢ فارسی';
  h.ctx.saveFortressData=()=>false;
  assert.equal(h.run('nsFlushDraft()'),false);
  assert.equal(h.storage.get('deep_focus_unsaved_note_draft_v1').body,'Typed draft');
  assert.doesNotMatch(h.el('nsDraftStatus').textContent,/Draft saved/);
});
test('DF-089 toolbar changes are flushed or block closing before debounce executes',()=>{
  const h=rig(false);
  h.run('nsScheduleDraft()');
  assert.equal(h.run('nsCloseEditor()'),false);
  assert.equal(h.closeCount,0);
  assert.equal(h.confirmCount,1);
});
test('DF-090 corrupt null recall pair is rejected safely without replacing stored data',()=>{
  const h=rig();h.run('nsFlushDraft()');
  h.storage.get('deep_focus_unsaved_note_draft_v1').recallPairs=[null];
  assert.equal(h.run('nsGetStoredDraft()'),null);
});
test('DF-075 draft discard cannot claim success when storage removal fails',()=>{
  const h=rig();h.run('nsFlushDraft()');
  h.ctx.localStorage.removeItem=()=>{throw Error('storage unavailable');};
  assert.equal(h.run('nsDiscardDraft()'),false);
  assert.ok(h.storage.get('deep_focus_unsaved_note_draft_v1'));
  assert.doesNotMatch(h.el('nsDraftStatus').textContent,/discarded/);
});
