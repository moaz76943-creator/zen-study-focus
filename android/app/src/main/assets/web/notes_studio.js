/* Deep Focus Notes Studio: UI upgrade; uses existing v21 notesList persistence. */
const NS_TEMPLATES=[
 ['cornell','📋','Structured notes','ملاحظات كورنيل','cornell','CUES / QUESTIONS\n• \n\nMAIN NOTES\n• \n\nSUMMARY\n','الأسئلة والكلمات المفتاحية\n• \n\nالملاحظات الأساسية\n• \n\nالملخص\n'],
 ['recall','🧠','Active recall','استذكار نشط','flash','QUESTION\n\nANSWER\n\nWHAT TO REVIEW\n','السؤال\n\nالإجابة\n\nما أحتاج إلى مراجعته\n'],
 ['reading','📚','Reading summary','ملخص قراءة','quick','BOOK / SOURCE\n\nMAIN IDEAS\n• \n\nMY TAKEAWAYS\n• \n\nNEXT STEPS\n','الكتاب أو المصدر\n\nالأفكار الرئيسية\n• \n\nما استفدته\n• \n\nالخطوة التالية\n'],
 ['meeting','📅','Meeting minutes','محضر اجتماع','quick','ATTENDEES\n\nAGENDA\n\nDECISIONS\n• \n\nACTIONS / DATES\n• ','الحاضرون\n\nجدول الأعمال\n\nالقرارات\n• \n\nالمهام والمواعيد\n• '],
 ['project','🗂️','Project plan','خطة مشروع','quick','GOAL\n\nMILESTONES\n☐ \n\nBLOCKERS\n\nNEXT ACTION\n','الهدف\n\nالمراحل\n☐ \n\nالعوائق\n\nالإجراء التالي\n'],
 ['workout','🏋️','Workout log','سجل رياضي','quick','ACTIVITY\n\nSETS / REPS / TIME\n\nNOTES\n\nNEXT SESSION\n','النشاط\n\nالجولات والتكرارات والوقت\n\nملاحظات\n\nالجلسة التالية\n'],
 ['brainstorm','💡','Ideas board','عصف ذهني','quick','IDEA\n\nPOSSIBILITIES\n• \n\nCONSTRAINTS\n\nFIRST EXPERIMENT\n','الفكرة\n\nالاحتمالات\n• \n\nالقيود\n\nأول تجربة\n'],
 ['checklist','✅','Checklist','قائمة تحقق','quick','TO DO\n☐ \n☐ \n☐ \n\nDONE\n','المطلوب\n☐ \n☐ \n☐ \n\nالمنجز\n'],
 ['lecture','🎓','Lecture summary','ملخص درس','cornell','TOPIC\n\nKEY CONCEPTS\n• \n\nEXAMPLES\n• \n\nOPEN QUESTIONS\n','الموضوع\n\nالمفاهيم الأساسية\n• \n\nالأمثلة\n• \n\nأسئلة مفتوحة\n'],
 ['weekly','📆','Weekly review','مراجعة أسبوعية','quick','COMPLETED\n• \n\nUNFINISHED\n• \n\nIMPROVE NEXT WEEK\n','ما أنجزته\n• \n\nما لم يكتمل\n• \n\nتحسين الأسبوع القادم\n'],
 ['decision','⚖️','Decision log','سجل قرار','quick','DECISION\n\nOPTIONS\n• \n\nREASONS\n\nFOLLOW-UP DATE\n','القرار\n\nالخيارات\n• \n\nالأسباب\n\nموعد المراجعة\n'],
 ['journal','✍️','Daily journal','يوميات','quick','TODAY\n\nHIGHLIGHTS\n• \n\nCHALLENGES\n\nTOMORROW\n','اليوم\n\nأبرز الأحداث\n• \n\nالتحديات\n\nالغد\n']
];
const NS_TEMPLATE_DESCRIPTION={
 en:{cornell:'Structured Cornell note-taking',recall:'Question and answer review',reading:'Capture ideas from a book',
 meeting:'Decisions and follow-up actions',project:'Milestones, blockers and next steps',workout:'Record sets and progress',
 brainstorm:'Explore and evaluate ideas',checklist:'Track items to completion',lecture:'Summarize lesson concepts',
 weekly:'Review wins and unfinished work',decision:'Record options and reasoning',journal:'Reflect on your day'},
 ar:{cornell:'تدوين منظم بطريقة كورنيل',recall:'مراجعة بأسئلة وإجابات',reading:'استخلاص الأفكار من كتاب',
 meeting:'قرارات الاجتماع وإجراءاته',project:'المراحل والعوائق والخطوات التالية',workout:'تسجيل الجولات والتقدم',
 brainstorm:'استكشاف الأفكار وتقييمها',checklist:'متابعة المهام حتى إنجازها',lecture:'تلخيص مفاهيم الدرس',
 weekly:'مراجعة الإنجازات والأعمال غير المكتملة',decision:'توثيق الخيارات والأسباب',journal:'تأمل أحداث يومك'}
};
const NS_EXTRAS={
 en:{search:'Search notes',exportAll:'Export notes',sortAria:'Sort notes',templateShelf:'Note templates',
 titlePlaceholder:'Title or question',bodyPlaceholder:'Write here...',close:'Close editor',cancel:'Cancel',
 filterAll:'All',filterCornell:'Structured notes',filterFlash:'Recall',filterQuick:'Quick notes'},
 ar:{search:'بحث في الملاحظات',exportAll:'تصدير الملاحظات',sortAria:'ترتيب الملاحظات',templateShelf:'قوالب الملاحظات',
 titlePlaceholder:'عنوان أو سؤال',bodyPlaceholder:'اكتب هنا...',close:'إغلاق المحرر',cancel:'إلغاء',
 filterAll:'الكل',filterCornell:'ملاحظات منظمة',filterFlash:'استذكار',filterQuick:'ملاحظات سريعة'}
};
function nsLanguage(){return typeof cfg==='object'&&typeof cfg.lang==='string'?cfg.lang:'en';}
function nsFallbackLanguage(){return nsLanguage().split(/[-_]/)[0]==='ar'?'ar':'en';}
function nsTranslate(key,fallback){
 const api=globalThis.DF99Locale;
 return api&&typeof api.t==='function'?api.t(nsLanguage(),'notes',key,fallback):fallback;
}
function nsText(key){return nsTranslate('studio_'+key,NS_EXTRAS[nsFallbackLanguage()][key]||NS_EXTRAS.en[key]||key);}
function nsTemplateText(code,part){
 const t=NS_TEMPLATES.find(x=>x[0]===code);
 if(!t||!['title','description','body'].includes(part))return '';
 const lang=nsFallbackLanguage();
 const base=part==='title'?t[lang==='ar'?3:2]:part==='body'?t[lang==='ar'?6:5]:NS_TEMPLATE_DESCRIPTION[lang][code];
 // Lane 01 owns the inventory/key registry; Lane 02 imports approved 'notes' keys.
 return nsTranslate('tpl_'+code+'_'+part,base);
}
const NS_RTL_LOCALES=new Set(['ar','fa','ur','ps','yi','sd','ug']);
function nsLocaleDir(){return NS_RTL_LOCALES.has(nsLanguage().split(/[-_]/)[0])?'rtl':'ltr';}
const NS_STRINGS={
 en:['✦ NOTES STUDIO','Your ideas, organized','Write, revisit and develop your thoughts.','My notes','Pinned','＋ New note','Ready-to-use templates','Tap to start','Pinned only','الترتيب','Recent','Oldest','Title','results','No notes match. Use a template to begin.','New note','Edit note','Title','Type','Date','Content','Pin','Favorite','words','characters','Save note','Save changes','Replace your text with this template?','Edit','Duplicate','Copy','Calendar','Delete','Reveal answer','Could not copy.','Saved'],
 ar:['✦ استوديو الملاحظات','أفكارك مرتبة وواضحة','اكتب أفكارك ونظّمها وراجعها بسهولة.','ملاحظاتي','مثبتة','＋ ملاحظة جديدة','قوالب جاهزة للكتابة','اختر قالبًا للبدء','المثبتة فقط','الترتيب','الأحدث','الأقدم','العنوان','نتيجة','لا توجد ملاحظات مطابقة، جرّب أحد القوالب.','ملاحظة جديدة','تعديل الملاحظة','العنوان','النوع','التاريخ','المحتوى','تثبيت','مفضلة','كلمة','حرف','حفظ الملاحظة','حفظ التعديلات','هل تريد استبدال النص الموجود بالقالب؟','تعديل','نسخة','نسخ','التقويم','حذف','إظهار الإجابة','تعذر النسخ.','تم الحفظ']
};
function nsLabel(index){return nsTranslate(String(index),NS_STRINGS[nsFallbackLanguage()][index]);}
function nsElement(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
let nsEditId=null,nsPinnedOnly=false;
function nsId(id){const n=Number(id);return Number.isSafeInteger(n)&&n>=0?n:null;}
function nsWords(body){return String(body||'').trim().split(/\s+/).filter(Boolean).length;}
function nsSave(){saveFortressData('zen_fortress_notes_v21',notesList);renderNotesStack();renderCalendar();}
function nsTemplateButton(t,editor){
 const b=nsElement('button',editor?'ns-tiny-template':'ns-template');
 b.type='button';b.appendChild(nsElement('span','',t[1]));b.appendChild(nsElement('strong','',nsTemplateText(t[0],'title')));b.title=nsTemplateText(t[0],'description');b.setAttribute('aria-label',nsTemplateText(t[0],'title')+' — '+b.title);
 b.addEventListener('click',()=>{if(!editor)openNoteModal();nsUseTemplate(t[0]);});return b;
}
function nsRenderTemplates(){
 const shelf=document.getElementById('nsTemplates'),mini=document.getElementById('nsEditorTemplates');
 if(shelf){shelf.replaceChildren();NS_TEMPLATES.forEach(t=>shelf.appendChild(nsTemplateButton(t,false)));}
 if(mini){mini.replaceChildren();NS_TEMPLATES.slice(0,6).forEach(t=>mini.appendChild(nsTemplateButton(t,true)));}
}
function nsUseTemplate(code){
 const t=NS_TEMPLATES.find(x=>x[0]===code);if(!t)return;
 const body=document.getElementById('inpNoteBody');
 if(body.value.trim()&&!confirm(nsLabel(27)))return;
 body.value=nsTemplateText(t[0],'body');
 document.getElementById('selNoteCat').value=t[4];
 const title=document.getElementById('inpNoteTitle');
 if(!title.value.trim())title.value=nsTemplateText(t[0],'title');
 document.getElementById('chkNoteBlur').checked=t[4]==='flash';
 nsUpdateCount();if(window.DeepFocusNotesEditorUI?.onTemplate)window.DeepFocusNotesEditorUI.onTemplate(code);
 if(typeof nsScheduleDraft==='function')nsScheduleDraft();body.focus();
}
function fillNoteTpl(type){nsUseTemplate(type==='flash'?'recall':'cornell');}
function nsUpdateCount(){const v=document.getElementById('inpNoteBody').value;document.getElementById('nsCounter').textContent=nsWords(v)+' '+nsLabel(23)+' · '+Array.from(v).length+' '+nsLabel(24);}
function nsApplyLabels(){
 const values={nsEyebrow:0,nsTitle:1,nsSubtitle:2,nsTotalLabel:3,nsPinnedLabel:4,nsNewButton:5,nsTemplatesTitle:6,nsTemplatesHint:7,nsPinnedOnlyLabel:8,nsSortLabel:9,nsTitleLabel:17,nsTypeLabel:18,nsDateLabel:19,nsBodyLabel:20,nsPinCheckLabel:21,nsFavCheckLabel:22};
 Object.keys(values).forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=nsLabel(values[id]);});
 const sort=document.getElementById('nsSort');
 if(sort){[10,11,12].forEach((key,i)=>{if(sort.options[i])sort.options[i].textContent=nsLabel(key);});sort.setAttribute('aria-label',nsText('sortAria'));}
 const ui={inpSearchNotes:['search','placeholder'],nsExport:['exportAll','aria-label'],
   nsTemplates:['templateShelf','aria-label'],inpNoteTitle:['titlePlaceholder','placeholder'],
   inpNoteBody:['bodyPlaceholder','placeholder']};
 Object.entries(ui).forEach(([id,[key,attr]])=>{const e=document.getElementById(id);if(e)e.setAttribute(attr,nsText(key));});
 const close=document.querySelector('#noteModal .modal-head button');
 if(close)close.setAttribute('aria-label',nsText('close'));
 const cancel=document.querySelector('#noteModal .modal-actions .mbtn-sec');
 if(cancel)cancel.textContent=nsText('cancel');
 const filters=['filterAll','filterCornell','filterFlash','filterQuick'];
 document.querySelectorAll('#sec-notes .ns-filters .seg-pill').forEach((e,i)=>{if(filters[i])e.textContent=nsText(filters[i]);});
 const dir=nsLocaleDir();
 ['sec-notes','noteModal'].forEach(id=>{const e=document.getElementById(id);if(e)e.dir=dir;});
 ['inpNoteTitle','inpNoteBody'].forEach(id=>{const e=document.getElementById(id);if(e)e.dir='auto';});
 nsRenderTemplates();
 if(typeof nsRefreshDraftLabels==='function')nsRefreshDraftLabels();
}
function nsTogglePinnedOnly(){nsPinnedOnly=!nsPinnedOnly;document.getElementById('nsPinnedOnly').setAttribute('aria-pressed',String(nsPinnedOnly));renderNotesStack();}
function filterNotesByTag(tag,btn){if(!['all','cornell','flash','quick'].includes(tag))return;noteTagFilter=tag;btn.parentElement.querySelectorAll('.seg-pill').forEach(b=>b.classList.remove('active'));btn.classList.add('active');renderNotesStack();}
function nsAction(row,emoji,title,callback,danger){
 const b=nsElement('button','ns-action'+(danger?' danger':''),emoji);b.type='button';b.setAttribute('aria-label',title);b.title=title;b.addEventListener('click',callback);row.appendChild(b);return b;
}
function renderNotesStack(){
 nsApplyLabels();
 if(window.DeepFocusNotesEditorUI?.renderStack())return;
 const box=document.getElementById('notesStackBox');if(!box)return;
 const q=String(document.getElementById('inpSearchNotes').value||'').toLocaleLowerCase();
 const real=notesList.filter(n=>!n.isStarter);
 document.getElementById('nsTotal').textContent=String(real.length);
 document.getElementById('nsPinned').textContent=String(real.filter(n=>n.pinned).length);
 const sort=document.getElementById('nsSort').value;
 const matches=notesList.filter(n=>{
  if(!n||nsId(n.id)===null)return false;
  if(noteTagFilter!=='all'&&n.catKey!==noteTagFilter)return false;
  if(nsPinnedOnly&&!n.pinned)return false;
  return (String(n.title||'')+' '+String(n.body||'')+' '+String(getNoteTagLabel(n.catKey)||'')).toLocaleLowerCase().includes(q);
 });
 matches.sort((a,b)=>{
  if(Boolean(a.pinned)!==Boolean(b.pinned))return a.pinned?-1:1;
  if(sort==='title')return String(a.title||'').localeCompare(String(b.title||''),cfg.lang);
  if(sort==='oldest')return Number(a.createdAt||a.id)-Number(b.createdAt||b.id);
  return Number(b.updatedAt||b.createdAt||b.id)-Number(a.updatedAt||a.createdAt||a.id);
 });
 document.getElementById('nsVisibleCount').textContent=matches.length+' '+nsLabel(13);
 box.replaceChildren();
 if(!matches.length){const e=nsElement('div','ns-empty',nsLabel(14));box.appendChild(e);return;}
 matches.forEach(n=>{
  const id=nsId(n.id);const card=nsElement('article','learning-rich-card ns-card');
  const topline=nsElement('div','ns-card-top');
  topline.appendChild(nsElement('span','ns-type',(n.catKey==='cornell'?'📋':n.catKey==='flash'?'🧠':'✎')+' '+getNoteTagLabel(n.catKey)));
  const topActions=nsElement('div','ns-top-actions');
  nsAction(topActions,n.pinned?'📌':'♧',nsLabel(21),()=>nsToggleFlag(id,'pinned'));
  nsAction(topActions,n.favorite?'★':'☆',nsLabel(22),()=>nsToggleFlag(id,'favorite'));
  topline.appendChild(topActions);card.appendChild(topline);
  const cardTitle=nsElement('h3','ns-card-title',n.title||'');cardTitle.dir='auto';card.appendChild(cardTitle);
  const desc=nsElement('div','lcard-body ns-desc'+(n.blur?' blurred-secret':''),n.body||'');desc.dir='auto';
  if(n.blur){desc.setAttribute('role','button');desc.setAttribute('tabindex','0');desc.setAttribute('aria-label',nsLabel(33));
   const toggle=()=>desc.classList.toggle('blurred-secret');desc.addEventListener('click',toggle);desc.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle();}});}
  card.appendChild(desc);
  const foot=nsElement('div','ns-card-foot');
  foot.appendChild(nsElement('span','','▦ '+toWest(n.calDate||todayISO)));
  foot.appendChild(nsElement('span','','✎ '+nsWords(n.body)+' '+nsLabel(23)));
  card.appendChild(foot);
  const actions=nsElement('div','ns-card-actions');
  nsAction(actions,'✎',nsLabel(28),()=>nsEdit(id));
  nsAction(actions,'⧉',nsLabel(29),()=>nsDuplicate(id));
  nsAction(actions,'⤴',nsLabel(30),()=>nsCopy(id));
  nsAction(actions,'▦',nsLabel(31),()=>pinNoteToTodayCalendar(id));
  nsAction(actions,'×',nsLabel(32),()=>deleteNoteCard(id),true);
  card.appendChild(actions);box.appendChild(card);
 });
}
function openNoteModal(defaultDate=null,editId=null){
 nsEditId=editId===null?null:nsId(editId);
 const n=nsEditId===null?null:notesList.find(x=>Number(x.id)===nsEditId);
 document.getElementById('inpNoteTitle').value=n?.title||'';
 document.getElementById('inpNoteBody').value=n?.body||'';
 document.getElementById('selNoteCat').value=n?.catKey||'quick';
 document.getElementById('inpNoteCalDate').value=toWest(n?.calDate||defaultDate||selectedCalDate||todayISO);
 document.getElementById('chkNoteBlur').checked=Boolean(n?.blur);
 document.getElementById('nsPinCheck').checked=Boolean(n?.pinned);
 document.getElementById('nsFavCheck').checked=Boolean(n?.favorite);
 document.getElementById('nsEditorHeading').textContent=nsLabel(n?16:15);
 document.getElementById('nsSaveButton').textContent=nsLabel(n?26:25);
 nsUpdateCount();nsRenderTemplates();document.getElementById('noteModal').classList.add('open');
 if(window.DeepFocusNotesEditorUI?.onOpen)window.DeepFocusNotesEditorUI.onOpen(n);
 if(typeof nsPrepareDraft==='function')nsPrepareDraft();
}
function nsEdit(id){if(notesList.some(n=>Number(n.id)===nsId(id)))openNoteModal(null,id);}
function saveNewNote(){
 if(window.DeepFocusNotesEditorUI?.save)return window.DeepFocusNotesEditorUI.save();
 const title=document.getElementById('inpNoteTitle').value,body=document.getElementById('inpNoteBody').value;
 if(!title&&!body)return;
 const cat=document.getElementById('selNoteCat').value;
 const fields={title:title||L().navNotes,body,catKey:['cornell','flash','quick'].includes(cat)?cat:'quick',
  calDate:toWest(document.getElementById('inpNoteCalDate').value||todayISO),
  blur:document.getElementById('chkNoteBlur').checked,pinned:document.getElementById('nsPinCheck').checked,
  favorite:document.getElementById('nsFavCheck').checked,isStarter:false,updatedAt:Date.now()};
 const existing=nsEditId===null?null:notesList.find(n=>Number(n.id)===nsEditId);
 if(existing)Object.assign(existing,fields);
 else notesList.unshift({...fields,id:nextRecordId(),createdAt:Date.now()});
 nsSave();if(typeof nsClearDraftForSavedNote==='function')nsClearDraftForSavedNote();
 closeModal('noteModal');nsEditId=null;showToast(nsLabel(35));
}
function nsToggleFlag(id,key){const n=notesList.find(x=>Number(x.id)===nsId(id));if(!n)return;n[key]=!Boolean(n[key]);nsSave();}
function nsDuplicate(id){const n=notesList.find(x=>Number(x.id)===nsId(id));if(!n)return;notesList.unshift({...n,id:nextRecordId(),isStarter:false,pinned:false,createdAt:Date.now(),updatedAt:Date.now()});nsSave();showToast('✓');}
function nsCopy(id){const n=notesList.find(x=>Number(x.id)===nsId(id));if(!n)return;const text=String(n.title||'')+'\n\n'+String(n.body||'');if(navigator.clipboard?.writeText)navigator.clipboard.writeText(text).then(()=>showToast('✓')).catch(()=>showToast(nsLabel(34)));else showToast(nsLabel(34));}
renderNotesStack();
