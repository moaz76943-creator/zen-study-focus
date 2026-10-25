/* Deep Focus Notes — best-effort crash recovery for a single unsaved editor draft.
   The saved notesList is NEVER mutated until the user presses Save. */
const NS_DRAFT_KEY='deep_focus_unsaved_note_draft_v1';
const NS_DRAFT_LIMIT=100000; // bounded to avoid consuming all WebView storage
let nsDraftTimer=null;
const NS_DRAFT_LANG={
 en:{saved:'Draft saved on this device',ready:'An unfinished draft is available',restore:'Restore draft',
 discard:'Discard',tooLong:'Draft exceeds autosave limit. Save this note directly.',restored:'Draft restored',
 cleared:'Draft discarded',other:'Another unfinished note is saved. Open or export it before overwriting.'},
 ar:{saved:'تم حفظ المسودة على الجهاز',ready:'توجد مسودة غير مكتملة',restore:'استعادة المسودة',
 discard:'حذف المسودة',tooLong:'المسودة كبيرة جدًا للحفظ التلقائي. احفظ الملاحظة مباشرة.',restored:'تمت استعادة المسودة',
 cleared:'تم حذف المسودة',other:'توجد مسودة لملاحظة أخرى. افتحها أو انسخها قبل الاستبدال.'}
};
function nsDraftLabel(k){
 const lang=typeof cfg==='object'&&typeof cfg.lang==='string'?cfg.lang:'en';
 const base=NS_DRAFT_LANG[lang.split(/[-_]/)[0]==='ar'?'ar':'en'][k]||NS_DRAFT_LANG.en[k]||k;
 // New keys belong to Lane 01 registry; Lane 02 imports approved notes translations.
 return globalThis.DF99Locale?.t(lang,'notes','draft_'+k,base)??base;
}
function nsRefreshDraftLabels(){
 // Read-only UI update: never clear or rewrite unsaved draft data during locale switches.
 const msg=document.getElementById('nsDraftStatus');
 const status=msg?.dataset?.nsDraftStatus;
 if(msg&&status)msg.textContent=nsDraftLabel(status);
 const restore=document.getElementById('nsDraftRestore'),discard=document.getElementById('nsDraftDiscard');
 if(restore)restore.textContent=nsDraftLabel('restore');
 if(discard)discard.textContent=nsDraftLabel('discard');
}
function nsGetStoredDraft(){
 const d=loadFortressData(NS_DRAFT_KEY,null);
 if(!d||typeof d!=='object'||d.v!==1||typeof d.title!=='string'||typeof d.body!=='string')return null;
 if(d.cornell!==undefined&&(!d.cornell||['cues','notes','summary'].some(k=>typeof d.cornell[k]!=='string'||d.cornell[k].length>NS_DRAFT_LIMIT)))return null;
 if(d.tags!==undefined&&(typeof d.tags!=='string'||d.tags.length>12000))return null;
 if(d.notebookId!==undefined&&(typeof d.notebookId!=='string'||d.notebookId.length>120))return null;
 if(d.recallPairs!==undefined&&(!Array.isArray(d.recallPairs)||d.recallPairs.length>200||d.recallPairs.some(p=>typeof p.question!=='string'||typeof p.answer!=='string')))return null;
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
function nsDraftState(status,offer){
 const msg=document.getElementById('nsDraftStatus'),restore=document.getElementById('nsDraftRestore'),discard=document.getElementById('nsDraftDiscard');
 if(msg){if(msg.dataset)msg.dataset.nsDraftStatus=status||'';msg.textContent=status?nsDraftLabel(status):'';}
 if(restore){restore.hidden=!offer;restore.textContent=nsDraftLabel('restore');}
 if(discard){discard.hidden=!offer;discard.textContent=nsDraftLabel('discard');}
}
function nsPrepareDraft(){
 if(nsDraftTimer!==null){clearTimeout(nsDraftTimer);nsDraftTimer=null;}
 const saved=nsGetStoredDraft();
 nsDraftState(saved?(nsDraftContextMatches(saved)?'ready':'other'):null,!!(saved&&nsDraftContextMatches(saved)));
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
 document.getElementById('inpNoteTitle').value=saved.title;
 document.getElementById('inpNoteBody').value=saved.body;
 document.getElementById('selNoteCat').value=saved.cat;
 document.getElementById('inpNoteCalDate').value=saved.date;
 document.getElementById('chkNoteBlur').checked=!!saved.blur;
 document.getElementById('nsPinCheck').checked=!!saved.pinned;
 document.getElementById('nsFavCheck').checked=!!saved.favorite;
 if(window.DeepFocusNotesEditorUI?.restoreDraftFields)window.DeepFocusNotesEditorUI.restoreDraftFields(saved);
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
function nsCloseEditor(){nsFlushDraft();closeModal('noteModal');}
const nsDraftDialog=document.getElementById('noteModal');
if(nsDraftDialog){
 nsDraftDialog.addEventListener('input',nsScheduleDraft);
 nsDraftDialog.addEventListener('change',nsScheduleDraft);
}
if(typeof document.addEventListener==='function')
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')nsFlushDraft();});
if(typeof window.addEventListener==='function')
 window.addEventListener('pagehide',nsFlushDraft);
