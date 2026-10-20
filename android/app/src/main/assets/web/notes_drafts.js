/* Deep Focus Notes — best-effort crash recovery for a single unsaved editor draft.
   The saved notesList is NEVER mutated until the user presses Save. */
const NS_DRAFT_KEY='deep_focus_unsaved_note_draft_v1';
const NS_DRAFT_LIMIT=100000; // bounded to avoid consuming all WebView storage
let nsDraftTimer=null;
let nsDraftDirty=false;
const NS_DRAFT_LANG={
 en:{saved:'Draft saved on this device',ready:'An unfinished draft is available',restore:'Restore draft',
 discard:'Discard',tooLong:'Draft exceeds autosave limit. Save this note directly.',restored:'Draft restored',
 cleared:'Draft discarded',other:'Another unfinished note is saved. Open or export it before overwriting.',
 conflict:'The saved note changed since this draft was created. Restore is blocked to prevent overwriting newer content; copy or discard the older draft.',
 unsaved:'Your edits could not be backed up on this device. Close and risk losing these changes?'},
 ar:{saved:'تم حفظ المسودة على الجهاز',ready:'توجد مسودة غير مكتملة',restore:'استعادة المسودة',
 discard:'حذف المسودة',tooLong:'المسودة كبيرة جدًا للحفظ التلقائي. احفظ الملاحظة مباشرة.',restored:'تمت استعادة المسودة',
 cleared:'تم حذف المسودة',other:'توجد مسودة لملاحظة أخرى. افتحها أو انسخها قبل الاستبدال.',
 conflict:'تغيرت الملاحظة المحفوظة منذ إنشاء المسودة. استعادة المسودة محظورة لحماية النسخة الأحدث؛ انسخ المسودة القديمة أو احذفها.',
 unsaved:'تعذّر حفظ هذه التعديلات كمسودة. هل تريد الإغلاق مع احتمال فقدانها؟'}
};
function nsDraftLabel(k){return (cfg.lang==='ar'?NS_DRAFT_LANG.ar:NS_DRAFT_LANG.en)[k];}
function nsGetStoredDraft(){
 const d=loadFortressData(NS_DRAFT_KEY,null);
 if(!d||typeof d!=='object'||d.v!==1||typeof d.title!=='string'||typeof d.body!=='string')return null;
 if(d.cornell!==undefined&&(!d.cornell||['cues','notes','summary'].some(k=>typeof d.cornell[k]!=='string'||d.cornell[k].length>NS_DRAFT_LIMIT)))return null;
 if(d.tags!==undefined&&(typeof d.tags!=='string'||d.tags.length>12000))return null;
 if(d.notebookId!==undefined&&(typeof d.notebookId!=='string'||d.notebookId.length>120))return null;
 if(d.recallPairs!==undefined&&(!Array.isArray(d.recallPairs)||d.recallPairs.length>200||d.recallPairs.some(p=>typeof p.question!=='string'||typeof p.answer!=='string')))return null;
 if(d.baseFingerprint!==undefined&&d.baseFingerprint!==null&&
    (typeof d.baseFingerprint!=='string'||d.baseFingerprint.length>NS_DRAFT_LIMIT))return null;
 if(d.title.length>250||d.body.length>NS_DRAFT_LIMIT)return null;
 if(!Number.isFinite(d.updated)||d.updated>Date.now()+3600000||Date.now()-d.updated>30*86400000)return null;
 if(d.editId!==null&&(!Number.isSafeInteger(d.editId)||d.editId<0))return null;
 if(typeof d.cat!=='string'||!['cornell','flash','quick'].includes(d.cat))return null;
 if(typeof d.date!=='string'||!(/^\d{4}-\d{2}-\d{2}$/.test(d.date)))return null;
 return d;
}
function nsDraftContextMatches(d){
 return d&&d.editId===nsEditId;
}
function nsDraftVersionMatches(d){
 if(!d||d.baseFingerprint===undefined||d.baseFingerprint===null)return true;
 return d.baseFingerprint===window.DeepFocusNotesEditorUI?.openedFingerprint?.();
}
function nsDraftState(status,offer){
 const msg=document.getElementById('nsDraftStatus'),restore=document.getElementById('nsDraftRestore'),discard=document.getElementById('nsDraftDiscard');
 if(msg)msg.textContent=status?nsDraftLabel(status):'';
 if(restore){restore.hidden=!offer||status==='conflict';restore.textContent=nsDraftLabel('restore');}
 if(discard){discard.hidden=!offer;discard.textContent=nsDraftLabel('discard');}
}
function nsPrepareDraft(){
 nsDraftDirty=false;
 if(nsDraftTimer!==null){clearTimeout(nsDraftTimer);nsDraftTimer=null;}
 const saved=nsGetStoredDraft();
 const same=saved&&nsDraftContextMatches(saved);
 nsDraftState(saved?(same?(nsDraftVersionMatches(saved)?'ready':'conflict'):'other'):null,!!same);
}
function nsReadEditorDraft(){
 return {
  v:1,editId:nsEditId,title:document.getElementById('inpNoteTitle').value,
  body:document.getElementById('inpNoteBody').value,
  cat:document.getElementById('selNoteCat').value,
  date:document.getElementById('inpNoteCalDate').value||localDateISO(),
  blur:document.getElementById('chkNoteBlur').checked,
  pinned:document.getElementById('nsPinCheck').checked,
  favorite:document.getElementById('nsFavCheck').checked,updated:Date.now(),
  ...(window.DeepFocusNotesEditorUI?.draftFields?.()||{})
 };
}
function nsScheduleDraft(){
 const modal=document.getElementById('noteModal');
 if(!modal||!modal.classList.contains('open'))return;
 if(nsDraftTimer!==null)clearTimeout(nsDraftTimer);
 nsDraftTimer=setTimeout(nsFlushDraft,550);
}
function nsFlushDraft(){
 if(nsDraftTimer!==null){clearTimeout(nsDraftTimer);nsDraftTimer=null;}
 const modal=document.getElementById('noteModal');
 if(!modal||!modal.classList.contains('open'))return false;
 const draft=nsReadEditorDraft();
 if(draft.title.length>250||draft.body.length>NS_DRAFT_LIMIT){nsDraftState('tooLong',false);return false;}
 if(!draft.title.trim()&&!draft.body.trim()&&!['cues','notes','summary'].some(k=>draft.cornell?.[k]?.trim()))return false;
 const existing=nsGetStoredDraft();
 if(existing&&!nsDraftContextMatches(existing)){nsDraftState('other',false);return false;}
 if(existing&&!nsDraftVersionMatches(existing)){nsDraftState('conflict',true);return false;}
 try {
  const raw=JSON.stringify(draft);
  if(raw.length>NS_DRAFT_LIMIT+6000){nsDraftState('tooLong',false);return false;}
  saveFortressData(NS_DRAFT_KEY,draft);
  const checked=nsGetStoredDraft();
  if(!checked||checked.updated!==draft.updated||checked.editId!==draft.editId){nsDraftState('tooLong',false);return false;}
 }catch(e){nsDraftState('tooLong',false);return false;}
 nsDraftState('saved',false);return true;
}
function nsRestoreDraft(){
 const saved=nsGetStoredDraft();
 if(!nsDraftContextMatches(saved))return false;
 if(!nsDraftVersionMatches(saved)){nsDraftState('conflict',true);return false;}
 document.getElementById('inpNoteTitle').value=saved.title;
 document.getElementById('inpNoteBody').value=saved.body;
 document.getElementById('selNoteCat').value=saved.cat;
 document.getElementById('inpNoteCalDate').value=saved.date;
 document.getElementById('chkNoteBlur').checked=!!saved.blur;
 document.getElementById('nsPinCheck').checked=!!saved.pinned;
 document.getElementById('nsFavCheck').checked=!!saved.favorite;
 if(window.DeepFocusNotesEditorUI?.restoreDraftFields)window.DeepFocusNotesEditorUI.restoreDraftFields(saved);
 nsDraftDirty=true;
 nsUpdateCount();nsDraftState('restored',false);
 return true;
}
function nsDeleteDraftKey(){
 try{localStorage.removeItem(NS_DRAFT_KEY);localStorage.removeItem(NS_DRAFT_KEY+'_mirror');}catch(e){}
}
function nsDiscardDraft(){
 const saved=nsGetStoredDraft();
 if(!nsDraftContextMatches(saved))return false;
 nsDeleteDraftKey();nsDraftState('cleared',false);return true;
}
function nsClearDraftForSavedNote(){
 if(nsDraftTimer!==null){clearTimeout(nsDraftTimer);nsDraftTimer=null;}
 const draft=nsGetStoredDraft();
 if(!draft||nsDraftContextMatches(draft))nsDeleteDraftKey();
}
function nsCloseEditor(){
 if(nsDraftDirty&&!nsFlushDraft()){
  if(typeof window.confirm!=='function'||!window.confirm(nsDraftLabel('unsaved')))return false;
 }
 nsDraftDirty=false;closeModal('noteModal');return true;
}
const nsDraftDialog=document.getElementById('noteModal');
if(nsDraftDialog){
 nsDraftDialog.addEventListener('input',()=>{nsDraftDirty=true;nsScheduleDraft();});
 nsDraftDialog.addEventListener('change',()=>{nsDraftDirty=true;nsScheduleDraft();});
}
if(typeof document.addEventListener==='function')
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')nsFlushDraft();});
if(typeof window.addEventListener==='function')
 window.addEventListener('pagehide',nsFlushDraft);
