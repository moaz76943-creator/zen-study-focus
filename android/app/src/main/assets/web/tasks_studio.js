/* Deep Focus v21 isolated Tasks Studio UI. No auto-mount; lane 00 supplies the adapter.
 * mount(root,{readState,commit,linkTaskToTimer,onAfterChange,locale,now,noteIds}).
 * commit(before,after) MUST be synchronous, failure-throwing and durable/atomic for
 * tasksList+cfg; do not replace the fortress packets or call saveFortressData here.
 */
(function(root,factory){
 'use strict';
 const api=factory(typeof module==='object'&&module.exports?require('./tasks_core_v21.js'):root.DeepFocusTasksCoreV21);
 if(typeof module==='object'&&module.exports)module.exports=api;else root.DeepFocusTasksStudioV21=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(C){
 'use strict';
 const labels={
  ar:{title:'استوديو المهام',subtitle:'خطّط ليومك وتتبع إنجازك الحقيقي',add:'إضافة مهمة',project:'مشروع جديد',today:'أهم ثلاث أولويات اليوم',search:'بحث في المهام',all:'القائمة',board:'لوحة المراحل',matrix:'الأولويات',trash:'سلة المحذوفات',calendar:'التقويم',undo:'تراجع',redo:'إعادة',empty:'لا توجد مهام',task:'عنوان المهمة',desc:'الوصف',due:'الموعد',dueOptional:'تعيين موعد نهائي',weekdays:'أيام العمل',time:'الوقت',cat:'القسم',priority:'الأولوية',estimate:'الدقائق المتوقعة',repeat:'التكرار',group:'المجموعة',notes:'أرقام الملاحظات',proj:'المشروع',none:'بدون مشروع',save:'حفظ',cancel:'إلغاء',focus:'ابدأ التركيز',edit:'تعديل',done:'إنجاز',resume:'إعادة فتح',archive:'أرشفة',remove:'حذف',restore:'استعادة',addCheck:'إضافة خطوة',check:'قائمة تحقق',sub:'مهام فرعية',study:'دراسة',sport:'رياضة',review:'قراءة',exam:'عمل',todo:'لم تبدأ',doing:'قيد التنفيذ',completed:'مكتملة',archived:'مؤرشفة',low:'منخفضة',medium:'متوسطة',high:'عالية',urgent:'عاجلة',daily:'يومي',weekly:'أسبوعي',monthly:'شهري',never:'بدون',allCategories:'كل الأقسام',estimated:'متوقع',actual:'فعلي',overdue:'متأخرة',do:'مهم وعاجل',schedule:'مهم وغير عاجل',delegate:'عاجل وغير مهم',eliminate:'غير مهم وغير عاجل',invalid:'لم يتم الحفظ',notConnected:'ربط المؤقت غير متاح بعد',invalidNoteIds:'يجب إدخال أرقام الملاحظات بالأرقام الغربية 0–9',sortLabel:'ترتيب المهام',sortDefault:'الترتيب الأصلي',sortDue:'حسب الموعد',sortPriority:'حسب الأولوية',sortTitle:'حسب العنوان',filterCategory:'تصفية حسب القسم',filterStatus:'تصفية حسب الحالة',allStatuses:'كل الحالات',titleRequired:'عنوان المهمة مطلوب',invalidDate:'تاريخ المهمة غير صالح',invalidEstimate:'عدد الدقائق غير صالح',invalidProject:'المشروع المحدد غير صالح'},
  en:{title:'Tasks Studio',subtitle:'Plan today and track real work',add:'New task',project:'New project',today:'Today’s top three',search:'Search tasks',all:'List',board:'Kanban',matrix:'Priorities',trash:'Trash',calendar:'Calendar',undo:'Undo',redo:'Redo',empty:'No matching tasks',task:'Task title',desc:'Description',due:'Date',dueOptional:'Assign due date',weekdays:'Weekdays',time:'Time',cat:'Category',priority:'Priority',estimate:'Estimated minutes',repeat:'Repeat',group:'Group',notes:'Numeric note IDs',proj:'Project',none:'No project',save:'Save',cancel:'Cancel',focus:'Start focus',edit:'Edit',done:'Complete',resume:'Reopen',archive:'Archive',remove:'Trash',restore:'Restore',addCheck:'Add step',check:'Checklist',sub:'Subtasks',study:'Study',sport:'Fitness',review:'Reading',exam:'Work',todo:'Not started',doing:'In progress',completed:'Complete',archived:'Archived',low:'Low',medium:'Medium',high:'High',urgent:'Urgent',daily:'Daily',weekly:'Weekly',monthly:'Monthly',never:'None',allCategories:'All categories',estimated:'Estimate',actual:'Actual',overdue:'Overdue',do:'Important + urgent',schedule:'Important, not urgent',delegate:'Urgent, not important',eliminate:'Neither urgent nor important',invalid:'Could not save',notConnected:'Timer link not connected',invalidNoteIds:'Note IDs must use Western digits 0–9',sortLabel:'Sort tasks',sortDefault:'Original order',sortDue:'Due date',sortPriority:'Priority',sortTitle:'Title',filterCategory:'Filter by category',filterStatus:'Filter by status',allStatuses:'All statuses',titleRequired:'Task title is required',invalidDate:'Invalid task date',invalidEstimate:'Invalid estimated minutes',invalidProject:'Invalid project selection'}
 };
 const CSS=`.df-tasks{--ink:#182c52;--blue:#3c81ee;--soft:#f3f7ff;--border:#e1eafa;color:var(--ink);font:inherit;max-width:100%;box-sizing:border-box}.df-tasks *{box-sizing:border-box}.df-tasks button,.df-tasks input,.df-tasks select,.df-tasks textarea{font:inherit}.df-tasks button{cursor:pointer;min-height:40px}.df-tasks input,.df-tasks select,.df-tasks textarea{width:100%;padding:11px;border:1px solid var(--border);border-radius:13px;color:var(--ink);background:white}.df-tasks label{font-size:.82rem;font-weight:700;display:grid;gap:5px}.df-tasks .df-head,.df-tasks .df-toolbar,.df-tasks .df-actions,.df-tasks .df-tabs{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.df-tasks .df-head{justify-content:space-between;margin:6px 0 20px}.df-tasks h2,.df-tasks h3,.df-tasks p{margin:0}.df-tasks h2{font-size:1.35rem;font-weight:850}.df-tasks h3{font-size:.97rem}.df-tasks .df-muted{color:#6d7f9f;font-size:.8rem}.df-tasks .df-panel,.df-tasks .df-task,.df-tasks .df-project{background:linear-gradient(140deg,#fff,#f8faff);box-shadow:0 5px 26px #315aa20b;border:1px solid var(--border);border-radius:20px;padding:14px;margin:10px 0}.df-tasks .df-section{margin-top:22px}.df-tasks .df-btn{border:1px solid var(--border);border-radius:12px;padding:9px 11px;background:#fff;color:var(--ink);font-weight:750}.df-tasks .df-btn[aria-pressed=true],.df-tasks .df-primary{background:linear-gradient(125deg,#397eea,#7568e9);color:#fff;border:0}.df-tasks .df-danger{color:#b72a51}.df-tasks .df-cards{display:grid;gap:10px}.df-tasks .df-task header{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}.df-tasks .df-title{font-weight:800;overflow-wrap:anywhere}.df-tasks .df-status{font-size:.7rem;border-radius:9px;background:#eef3fc;padding:5px 8px;white-space:nowrap}.df-tasks .df-meta{display:flex;gap:8px;flex-wrap:wrap;color:#566d91;font-size:.76rem;margin:8px 0}.df-tasks .df-overdue{color:#c12b55}.df-tasks .df-actions{margin-top:10px}.df-tasks .df-actions .df-btn{min-height:34px;padding:5px 9px;font-size:.77rem}.df-tasks .df-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:10px}.df-tasks .df-form{display:grid;gap:11px;padding-top:8px}.df-tasks .df-dialog{border:1px solid var(--border);border-radius:20px;background:#fbfdff;padding:14px;margin-top:10px}.df-tasks .df-dialog[hidden]{display:none}.df-tasks .df-check{display:flex;align-items:center;gap:9px;margin-top:8px}.df-tasks .df-check input{width:18px;height:18px;flex:none}.df-tasks .df-project progress{width:100%;accent-color:#5085e8}.df-tasks .df-board{display:flex;overflow-x:auto;gap:12px;scroll-snap-type:x mandatory}.df-tasks .df-lane{flex:0 0 min(78vw,300px);scroll-snap-align:start;background:var(--soft);border-radius:18px;padding:10px;min-height:110px}.df-tasks .df-week{display:flex;gap:8px;overflow-x:auto}.df-tasks .df-week button{min-width:84px}.df-tasks .df-error{color:#a21d47}.df-tasks :focus-visible{outline:3px solid #589bff;outline-offset:2px}@media(min-width:650px){.df-tasks .df-board{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));overflow:visible}.df-tasks .df-lane{min-width:0}.df-tasks .df-actions .df-btn{font-size:.83rem}}@media(prefers-reduced-motion:reduce){.df-tasks *{scroll-behavior:auto!important}}`;
 function dateLocal(now){const d=new Date(now);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
 function mount(target,adapter){
  if(!C)throw new Error('tasks_core_v21.js must be loaded first');
  if(!target||typeof target.appendChild!=='function')throw new TypeError('DOM target required');
  if(!adapter||typeof adapter.readState!=='function'||typeof adapter.commit!=='function')throw new TypeError('readState/commit adapter required');
  const doc=target.ownerDocument;
  let l=labels.en;
  function resolveLocale(){
   const raw=typeof adapter.locale==='function'?adapter.locale():adapter.locale;
   const candidate=typeof raw==='string'?raw.toLowerCase().trim().split(/[-_]/)[0]:'en';
   const code=globalThis.DF99Locale?.normalize?.(raw) || (/^[a-z]{2,3}$/.test(candidate)&&!['he','iw'].includes(candidate)?candidate:'en');
   const fallback=labels[code==='ar'?'ar':'en'];
   l=globalThis.DF99Locale?.section('tasks',code,fallback) || fallback;
   wrapper.setAttribute('dir',['ar','fa','ur','ps','yi'].includes(code)?'rtl':'ltr');
   wrapper.setAttribute('lang',code);
  }
  let state=adapter.readState(),undoStack=[],redoStack=[],view='all',editing=null,category='',query='',day='',status='',sortKey='',isDestroyed=false;
  const currentDay=()=>dateLocal(typeof adapter.now==='function'?adapter.now():new Date());
  const el=(tag,cls,text)=>{const x=doc.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=String(text);return x;};
  const btn=(caption,fn,kind='')=>{const b=el('button','df-btn '+kind,caption);b.type='button';b.addEventListener('click',fn);return b;};
  const append=(parent,...nodes)=>{nodes.forEach(n=>parent.appendChild(n));return parent;};
  const label=(text,control)=>append(el('label','',text),control);
  const input=(type,value)=>{const n=el('input');n.type=type;n.value=value==null?'':String(value);return n;};
  const selection=(pairs,value)=>{const n=el('select');pairs.forEach(([v,name])=>{const o=el('option','',name);o.value=String(v);n.appendChild(o);});n.value=String(value??'');return n;};
  const current=()=>state;
  const error=e=>{
   if(typeof adapter.onError==='function')adapter.onError(e);
   else{
    const reason=e?.message;
    message.textContent=reason===l.notConnected?l.notConnected:
     reason==='Numeric note IDs required'?l.invalidNoteIds:
     reason==='Title required'?l.titleRequired:
     reason==='Invalid task date'?l.invalidDate:
     reason==='Invalid estimate'?l.invalidEstimate:
     reason==='Unknown numeric project ID'?l.invalidProject:l.invalid;
    message.className='df-error';
   }
  };
  function apply(change){
   try{
    const latest=adapter.readState();
    if(JSON.stringify(latest)!==JSON.stringify(state)){state=latest;undoStack=[];redoStack=[];}
    const old=state,output=change(old),next=output.state;
    if(!next||!Array.isArray(next.tasksList))throw new Error('Invalid change result');
    if(JSON.stringify(old)===JSON.stringify(next))return true;
    const committed=adapter.commit(old,next);
    if(committed && typeof committed.then==='function')throw new Error('Only synchronous commit supported');
    if(committed === false)throw new Error('Task change was not durably acknowledged');
    undoStack.push(old);if(undoStack.length>20)undoStack.shift();redoStack=[];state=next;
    if(typeof adapter.onAfterChange==='function')adapter.onAfterChange(state);
    editing=null;render();
    return true;
   }catch(e){error(e);return false;}
  }
  function timeTravel(from,to){
   if(!from.length)return;
   const latest=adapter.readState();
   if(JSON.stringify(latest)!==JSON.stringify(state)){state=latest;undoStack=[];redoStack=[];render();return;}
   const next=from[from.length-1];
   try{const r=adapter.commit(state,next);if(r&&typeof r.then==='function')throw new Error('Only synchronous commit supported');if(r===false)throw new Error('Task undo/redo not acknowledged');
    from.pop();to.push(state);state=next;editing=null;if(typeof adapter.onAfterChange==='function')adapter.onAfterChange(state);render();
   }catch(e){error(e);}
  }
  const undo=()=>timeTravel(undoStack,redoStack),redo=()=>timeTravel(redoStack,undoStack);
  const wrapper=el('section','df-tasks');
  const style=el('style');style.textContent=CSS;wrapper.appendChild(style);
  const content=el('div');wrapper.appendChild(content);target.appendChild(wrapper);
  const message=el('div','df-error');message.setAttribute('role','status');wrapper.appendChild(message);
  function taskCard(t){
   const box=el('article','df-task'),head=el('header');box.setAttribute('aria-label',l.task+': '+t.title);append(head,el('div','df-title',t.title),el('span','df-status',l[C.statusOf(t)]));box.appendChild(head);
   if(t.description)box.appendChild(el('p','df-muted',t.description));
   const meta=el('div','df-meta'),actual=C.actualFocusMinutes(state,t.id);
   const ascii=v=>String(v).replace(/[٠-٩۰-۹०-९]/g,d=>String(d.charCodeAt(0)-(d<='٩'?1632:d<='۹'?1776:2406)));
   append(meta,el('span','',`📅 ${ascii(t.dueAssigned===false?'—':t.date||'—')}${t.dueAssigned!==false&&t.dueTime?' '+ascii(t.dueTime):''}`),el('span','',l[t.catKey]||t.catKey),el('span','',l[t.priority]||''),el('span','',`${l.estimated}: ${t.estimateMin||0} · ${l.actual}: ${actual}`));
   if(C.isOverdue(t,currentDay()))meta.appendChild(el('strong','df-overdue',l.overdue));
   box.appendChild(meta);
   for(const kind of ['checklist','subtasks'])if(Array.isArray(t[kind])){
    for(const x of t[kind]){
     const row=el('label','df-check'),tick=input('checkbox');tick.checked=!!x.done;
     tick.addEventListener('change',()=>{
      const wanted=tick.checked;
      if(apply(s=>C.setItemDone(s,t.id,kind,x.id,wanted))!==true)
       tick.checked=!!x.done; // Never display unacknowledged completion.
     });
     append(row,tick,el('span','',x.title));box.appendChild(row);
    }
    if(t[kind].length)box.appendChild(el('p','df-muted',`${l[kind==='checklist'?'check':'sub']}: ${t[kind].filter(x=>x.done).length}/${t[kind].length}`));
   }
   const actions=el('div','df-actions');
   if(t.deletedAt)append(actions,btn(l.restore,()=>apply(s=>C.restoreTask(s,t.id))));
   else {
    append(actions,btn(l.edit,()=>{editing=t.id;render();}),btn(t.done?l.resume:l.done,()=>apply(s=>C.setStatus(s,t.id,t.done?'todo':'completed'))),
      btn(l.focus,()=>{try{if(typeof adapter.linkTaskToTimer!=='function'||adapter.linkTaskToTimer(t.id)!==true)throw new Error(l.notConnected);}catch(e){error(e);}}));
    if(C.statusOf(t)!=='archived')actions.appendChild(btn(l.archive,()=>apply(s=>C.setStatus(s,t.id,'archived'))));
    append(actions,btn(l.remove,()=>apply(s=>C.trashTask(s,t.id)),'df-danger'));
    for(const kind of ['checklist','subtasks'])actions.appendChild(btn('＋ '+l[kind==='checklist'?'check':'sub'],()=>{
     const title=typeof adapter.requestText==='function'?adapter.requestText(l.addCheck):null;
     if(title)apply(s=>C.addItem(s,t.id,kind,title));
    }));
   }
   box.appendChild(actions);return box;
  }
  function editor(){
   const t=state.tasksList.find(x=>x.id===editing),panel=el('div','df-dialog'),form=el('form','df-form');
   const title=input('text',t?.title||''),description=el('textarea');description.rows=3;description.value=t?.description||'';
   const initialDue=t?(typeof t.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(t.date)?t.date:''):currentDay();
   const due=input('date',initialDue),dueTime=input('time',t?.dueTime||'');
   const hasDue=input('checkbox');hasDue.checked=!!t&&C.validDate(t.date)&&t.dueAssigned!==false;
   hasDue.style.width='auto';
   due.addEventListener('change',()=>{if(due.value)hasDue.checked=true;});
   const categoryInput=selection(['study','sport','review','exam'].map(v=>[v,l[v]]),t?.catKey||'study');
   const priority=selection(['low','medium','high','urgent'].map(v=>[v,l[v]]),t?.priority||'medium');
   const estimate=input('number',t?.estimateMin??25);estimate.min='0';estimate.max='100000';
   const repeat=selection([['',l.never],...['daily','weekdays','weekly','monthly'].map(v=>[v,l[v]])],t?.repeat?.frequency||'');
   const group=input('text',t?.group||'');
   const project=selection([['',l.none],...C.projects(state).filter(p=>!p.deletedAt).map(p=>[p.id,p.name])],t?.projectId??'');
   const notes=input('text',(t?.noteIds||[]).join(','));notes.inputMode='numeric';
   const important=input('checkbox');important.checked=!!t?.important;important.style.width='auto';
   const urgent=input('checkbox');urgent.checked=!!t?.urgent;urgent.style.width='auto';
   // Capture native-normalized values: legacy optional values may not be valid controls.
   const originalEditorValues={
    title:title.value,description:description.value,date:due.value,dueAssigned:hasDue.checked,dueTime:dueTime.value,
    catKey:categoryInput.value,priority:priority.value,estimateMin:estimate.value,
    repeat:repeat.value,important:important.checked,urgent:urgent.checked,
    group:group.value,projectId:project.value,noteIds:notes.value
   };
   append(form,label(l.task,title),label(l.desc,description),label(l.dueOptional,hasDue));
   const grid=el('div','df-grid');append(grid,label(l.due,due),label(l.time,dueTime),label(l.cat,categoryInput),label(l.priority,priority),label(l.estimate,estimate),label(l.repeat,repeat),label(l.group,group),label(l.proj,project),label(l.notes,notes));form.appendChild(grid);
   append(form,label(l.do,important),label(l.delegate,urgent));
   const actions=el('div','df-actions');append(actions,btn(l.cancel,()=>{editing=null;render();}));
   const save=btn(l.save,()=>{} ,'df-primary');save.type='submit';actions.appendChild(save);form.appendChild(actions);
   let submitted=false;
   form.addEventListener('submit',e=>{
    e.preventDefault();
    if(submitted||isDestroyed)return;
    const noteTokens=notes.value.trim()?notes.value.split(',').map(x=>x.trim()):[];
    const noteIdsChanged=!t || notes.value!==originalEditorValues.noteIds;
    // Do not reinterpret or reject legacy note refs when the user did not edit them.
    if(noteIdsChanged&&noteTokens.some(x=>!/^(0|[1-9]\d*)$/.test(x))){error(new Error('Numeric note IDs required'));return;}
    if(hasDue.checked&&!C.validDate(due.value)){error(new Error(l.invalidDate));return;}
    const fields={title:title.value,description:description.value,date:due.value,dueAssigned:hasDue.checked,dueTime:dueTime.value||null,
     catKey:categoryInput.value,priority:priority.value,estimateMin:Number(estimate.value),repeat:repeat.value?{frequency:repeat.value,interval:1}:null,
     important:important.checked,urgent:urgent.checked,group:group.value,projectId:project.value?Number(project.value):null,
     noteIds:noteIdsChanged?noteTokens.map(Number):t.noteIds};
    if(t){
     // Compare displayed values to original editor values, not missing/defaulted v21 fields.
     const previous=originalEditorValues;
     const displayed={
      title:title.value,description:description.value,date:due.value,dueAssigned:hasDue.checked,dueTime:dueTime.value,
      catKey:categoryInput.value,priority:priority.value,estimateMin:estimate.value,
      repeat:repeat.value,important:important.checked,urgent:urgent.checked,
      group:group.value,projectId:project.value,noteIds:notes.value
     };
     const patch={};
     for(const k of Object.keys(fields))if(displayed[k]!==previous[k]){
      if(k==='date'&&!hasDue.checked)continue; // Date remains untouched when an optional deadline is disabled.
      patch[k]=fields[k];
     }
     if(!Object.keys(patch).length){submitted=true;editing=null;render();return;}
     if(apply(s=>C.updateTask(s,t.id,patch,{noteIds:adapter.noteIds?.()})))submitted=true;
    }else{
     if(!hasDue.checked)delete fields.date;
     if(apply(s=>C.createTask(s,fields,{noteIds:adapter.noteIds?.()})))submitted=true;
    }
   });
   panel.appendChild(form);return panel;
  }
  function render(){
   if(isDestroyed)return;
   resolveLocale();
   content.replaceChildren();message.textContent='';
   const head=el('div','df-head'),titleWrap=el('div');append(titleWrap,el('h2','',l.title),el('p','df-muted',l.subtitle));head.appendChild(titleWrap);
   const buttons=el('div','df-toolbar');append(buttons,btn('＋ '+l.add,()=>{editing='new';render();},'df-primary'),btn(l.project,()=>{
    const name=typeof adapter.requestText==='function'?adapter.requestText(l.project):null;
    if(name)apply(s=>C.createProject(s,{name},{noteIds:adapter.noteIds?.()}));
   }),btn(l.undo,undo),btn(l.redo,redo));head.appendChild(buttons);content.appendChild(head);
   // Keep Quick Add separate from the full editor, using the same durable v21 adapter.
   // A failed ACK must leave the typed title in place for a deliberate retry.
   const quickForm=el('form','df-toolbar df-quick-add'),quickTitle=input('text','');
   quickTitle.placeholder=l.add;quickTitle.setAttribute('aria-label',l.add);
   const quickSave=el('button','df-btn df-primary',l.save);quickSave.type='submit';
   append(quickForm,quickTitle,quickSave);
   let quickSubmitted=false;
   quickForm.addEventListener('submit',e=>{
    e.preventDefault();
    if(quickSubmitted||isDestroyed)return;
    const title=quickTitle.value.trim();
    if(!title)return;
    if(apply(s=>C.createTask(s,{title},{noteIds:adapter.noteIds?.()})))quickSubmitted=true;
   });
   content.appendChild(quickForm);
   if(editing!==null)content.appendChild(editor());
   const today=el('section','df-panel'),top=el('h3','',l.today);today.appendChild(top);
   const top3=C.topThree(state,currentDay());if(!top3.length)today.appendChild(el('p','df-muted',l.empty));else top3.forEach(t=>today.appendChild(taskCard(t)));
   content.appendChild(today);
   const pr=C.projects(state).filter(x=>!x.deletedAt);if(pr.length){const list=el('div','df-grid');pr.forEach(p=>{
    const progress=C.projectProgress(state,p.id),card=el('div','df-project');append(card,el('h3','',p.name),el('p','df-muted',`${progress.completed}/${progress.total} · ${progress.percent}%`));
    const bar=el('progress');bar.max=100;bar.value=progress.percent;bar.setAttribute('aria-label',p.name);card.appendChild(bar);list.appendChild(card);
   });content.appendChild(list);}
   const tabs=el('div','df-tabs df-section');[['all',l.all],['board',l.board],['matrix',l.matrix],['calendar',l.calendar],['trash',l.trash]].forEach(([v,caption])=>{
    const b=btn(caption,()=>{view=v;day='';render();});b.setAttribute('aria-pressed',String(view===v));tabs.appendChild(b);
   });content.appendChild(tabs);
   const filters=el('div','df-grid df-section'),search=input('search',query),cats=selection([['',l.allCategories],...['study','sport','review','exam'].map(v=>[v,l[v]])],category);
   const statuses=selection([['',l.allStatuses],...['todo','doing','completed','archived'].map(v=>[v,l[v]])],status);
   const sorts=selection([['',l.sortDefault],['due',l.sortDue],['priority',l.sortPriority],['title',l.sortTitle]],sortKey);
   search.setAttribute('aria-label',l.search);cats.setAttribute('aria-label',l.filterCategory);
   statuses.setAttribute('aria-label',l.filterStatus);sorts.setAttribute('aria-label',l.sortLabel);
   search.placeholder=l.search;search.addEventListener('input',()=>{query=search.value;renderResults();});
   cats.addEventListener('change',()=>{category=cats.value;renderResults();});statuses.addEventListener('change',()=>{status=statuses.value;renderResults();});sorts.addEventListener('change',()=>{sortKey=sorts.value;renderResults();});
   append(filters,search,cats,statuses,sorts);content.appendChild(filters);
   const results=el('div','df-section');results.id='df-task-results';content.appendChild(results);
   function renderResults(){
    results.replaceChildren();const active=C.searchTasks(state,{query,catKey:category||undefined,status:status||undefined,includeArchived:true,
     includeTrash:view==='trash'}).filter(t=>view==='trash'?!!t.deletedAt:!t.deletedAt);
    if(sortKey){
     const priorityRank={urgent:0,high:1,medium:2,low:3};
     const dateKey=t=>typeof t.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(t.date)?t.date:'9999-99-99';
     active.sort((a,b)=>sortKey==='due'?dateKey(a).localeCompare(dateKey(b)):
      sortKey==='priority'?(priorityRank[a.priority]??4)-(priorityRank[b.priority]??4):
      sortKey==='title'?String(a.title||'').localeCompare(String(b.title||'')):0);
    }
    const show=(container,rows)=>{if(!rows.length)container.appendChild(el('p','df-muted',l.empty));else rows.forEach(t=>container.appendChild(taskCard(t)));};
    if(view==='board'){
     const board=el('div','df-board');for(const k of ['todo','doing','completed','archived']){
      const lane=el('section','df-lane');lane.appendChild(el('h3','',l[k]));show(lane,active.filter(t=>C.statusOf(t)===k));board.appendChild(lane);
     }results.appendChild(board);
    }else if(view==='matrix'){
     const matrix=C.eisenhower({tasksList:active,cfg:state.cfg}),grid=el('div','df-grid');for(const k of ['do','schedule','delegate','eliminate']){
      const lane=el('section','df-panel');lane.appendChild(el('h3','',l[k]));show(lane,matrix[k]);grid.appendChild(lane);
     }results.appendChild(grid);
    }else if(view==='calendar'){
     const week=el('div','df-week'),start=new Date(currentDay()+'T12:00:00');
     for(let i=0;i<7;i++){const d=new Date(start);d.setDate(start.getDate()+i);const date=dateLocal(d),b=btn(date,()=>{day=date;renderResults();});b.setAttribute('aria-pressed',String((day||currentDay())===date));week.appendChild(b);}
     results.appendChild(week);const cal=el('div','df-cards');show(cal,active.filter(t=>t.date===(day||currentDay())));results.appendChild(cal);
    }else{const cards=el('div','df-cards');show(cards,active);results.appendChild(cards);}
   }
   renderResults();
  }
  render();
  return Object.freeze({render,undo,redo,getState:current,refresh(){state=adapter.readState();undoStack=[];redoStack=[];render();},destroy(){isDestroyed=true;wrapper.remove();}});
 }
 return Object.freeze({mount});
});
