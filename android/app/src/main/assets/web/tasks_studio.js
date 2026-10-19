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
  ar:{title:'استوديو المهام',subtitle:'خطّط ليومك وتتبع إنجازك الحقيقي',add:'إضافة مهمة',project:'مشروع جديد',today:'أهم ثلاث أولويات اليوم',search:'بحث في المهام',all:'القائمة',board:'كانبان',matrix:'الأولويات',trash:'سلة المحذوفات',calendar:'التقويم',undo:'تراجع',redo:'إعادة',empty:'لا توجد مهام',task:'عنوان المهمة',desc:'الوصف',due:'الموعد',time:'الوقت',cat:'القسم',priority:'الأولوية',estimate:'الدقائق المتوقعة',repeat:'التكرار',group:'المجموعة',notes:'أرقام الملاحظات',proj:'المشروع',none:'بدون مشروع',save:'حفظ',cancel:'إلغاء',focus:'ابدأ التركيز',edit:'تعديل',done:'إنجاز',resume:'إعادة فتح',archive:'أرشفة',remove:'حذف',restore:'استعادة',addCheck:'إضافة خطوة',check:'قائمة تحقق',sub:'مهام فرعية',study:'دراسة',sport:'رياضة',review:'قراءة',exam:'عمل',todo:'لم تبدأ',doing:'قيد التنفيذ',completed:'مكتملة',archived:'مؤرشفة',low:'منخفضة',medium:'متوسطة',high:'عالية',urgent:'عاجلة',daily:'يومي',weekly:'أسبوعي',monthly:'شهري',never:'بدون',allCategories:'كل الأقسام',estimated:'متوقع',actual:'فعلي',overdue:'متأخرة',do:'مهم وعاجل',schedule:'مهم وغير عاجل',delegate:'عاجل وغير مهم',eliminate:'غير مهم وغير عاجل',invalid:'لم يتم الحفظ',notConnected:'ربط المؤقت غير متاح بعد',quick:'اكتب مهمة',details:'تفاصيل',hide:'إخفاء',upcoming:'القادمة',todayTab:'اليوم',completedTab:'المكتملة',topPin:'ضمن أهم ثلاث',topUnpin:'إزالة من أهم ثلاث',topLimit:'ثلاث مهام كحد أقصى',saveDue:'تحديد الموعد',dueOptional:'موعد محدد',weekdays:'أيام العمل',allProjects:'كل المشاريع',sortDate:'التاريخ',sortTitle:'العنوان',sortPriority:'الأولوية',advanced:'تفاصيل متقدمة'},
  en:{title:'Tasks Studio',subtitle:'Plan today and track real work',add:'New task',project:'New project',today:'Today’s top three',search:'Search tasks',all:'List',board:'Kanban',matrix:'Priorities',trash:'Trash',calendar:'Calendar',undo:'Undo',redo:'Redo',empty:'No matching tasks',task:'Task title',desc:'Description',due:'Date',time:'Time',cat:'Category',priority:'Priority',estimate:'Estimated minutes',repeat:'Repeat',group:'Group',notes:'Numeric note IDs',proj:'Project',none:'No project',save:'Save',cancel:'Cancel',focus:'Start focus',edit:'Edit',done:'Complete',resume:'Reopen',archive:'Archive',remove:'Trash',restore:'Restore',addCheck:'Add step',check:'Checklist',sub:'Subtasks',study:'Study',sport:'Fitness',review:'Reading',exam:'Work',todo:'Not started',doing:'In progress',completed:'Complete',archived:'Archived',low:'Low',medium:'Medium',high:'High',urgent:'Urgent',daily:'Daily',weekly:'Weekly',monthly:'Monthly',never:'None',allCategories:'All categories',estimated:'Estimate',actual:'Actual',overdue:'Overdue',do:'Important + urgent',schedule:'Important, not urgent',delegate:'Urgent, not important',eliminate:'Neither urgent nor important',invalid:'Could not save',notConnected:'Timer link not connected',quick:'Type a task',details:'Details',hide:'Hide',upcoming:'Upcoming',todayTab:'Today',completedTab:'Completed',topPin:'Top three',topUnpin:'Unpin',topLimit:'Maximum three today',saveDue:'Set due date',dueOptional:'Has due date',weekdays:'Weekdays',allProjects:'All projects',sortDate:'Date',sortTitle:'Title',sortPriority:'Priority',advanced:'Advanced task'}
 };
 const CSS=`.df-tasks .df-quick{display:flex;align-items:center;gap:8px;margin:0 0 16px}.df-tasks .df-quick input{flex:1;min-width:0}.df-tasks .df-quick button{flex:none}.df-tasks .df-task{padding:12px 14px}.df-tasks .df-task header{align-items:center}.df-tasks .df-task-title{min-width:0;flex:1}.df-tasks .df-primary-action{min-width:44px;min-height:44px}.df-tasks .df-expand{border:0;background:transparent;color:#315e9a;padding:8px 0;text-align:start}.df-tasks .df-task-more[hidden]{display:none}.df-tasks .df-task-more .df-btn{min-height:44px}.df-tasks .df-mini-due{font-size:.77rem;color:#6d7f9f;white-space:nowrap}.df-tasks .df-date-quick{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.df-tasks .df-date-quick input{width:auto;max-width:170px}.df-tasks .df-top-list{display:flex;flex-wrap:wrap;gap:7px}.df-tasks{--ink:#182c52;--blue:#3c81ee;--soft:#f3f7ff;--border:#e1eafa;color:var(--ink);font:inherit;max-width:100%;box-sizing:border-box}.df-tasks *{box-sizing:border-box}.df-tasks button,.df-tasks input,.df-tasks select,.df-tasks textarea{font:inherit}.df-tasks button{cursor:pointer;min-height:40px}.df-tasks input,.df-tasks select,.df-tasks textarea{width:100%;padding:11px;border:1px solid var(--border);border-radius:13px;color:var(--ink);background:white}.df-tasks label{font-size:.82rem;font-weight:700;display:grid;gap:5px}.df-tasks .df-head,.df-tasks .df-toolbar,.df-tasks .df-actions,.df-tasks .df-tabs{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.df-tasks .df-head{justify-content:space-between;margin:6px 0 20px}.df-tasks h2,.df-tasks h3,.df-tasks p{margin:0}.df-tasks h2{font-size:1.35rem;font-weight:850}.df-tasks h3{font-size:.97rem}.df-tasks .df-muted{color:#6d7f9f;font-size:.8rem}.df-tasks .df-panel,.df-tasks .df-task,.df-tasks .df-project{background:linear-gradient(140deg,#fff,#f8faff);box-shadow:0 5px 26px #315aa20b;border:1px solid var(--border);border-radius:20px;padding:14px;margin:10px 0}.df-tasks .df-section{margin-top:22px}.df-tasks .df-btn{border:1px solid var(--border);border-radius:12px;padding:9px 11px;background:#fff;color:var(--ink);font-weight:750}.df-tasks .df-btn[aria-pressed=true],.df-tasks .df-primary{background:linear-gradient(125deg,#397eea,#7568e9);color:#fff;border:0}.df-tasks .df-danger{color:#b72a51}.df-tasks .df-cards{display:grid;gap:10px}.df-tasks .df-task header{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}.df-tasks .df-title{font-weight:800;overflow-wrap:anywhere}.df-tasks .df-status{font-size:.7rem;border-radius:9px;background:#eef3fc;padding:5px 8px;white-space:nowrap}.df-tasks .df-meta{display:flex;gap:8px;flex-wrap:wrap;color:#566d91;font-size:.76rem;margin:8px 0}.df-tasks .df-overdue{color:#c12b55}.df-tasks .df-actions{margin-top:10px}.df-tasks .df-actions .df-btn{min-height:34px;padding:5px 9px;font-size:.77rem}.df-tasks .df-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:10px}.df-tasks .df-form{display:grid;gap:11px;padding-top:8px}.df-tasks .df-dialog{border:1px solid var(--border);border-radius:20px;background:#fbfdff;padding:14px;margin-top:10px}.df-tasks .df-dialog[hidden]{display:none}.df-tasks .df-check{display:flex;align-items:center;gap:9px;margin-top:8px}.df-tasks .df-check input{width:18px;height:18px;flex:none}.df-tasks .df-project progress{width:100%;accent-color:#5085e8}.df-tasks .df-board{display:flex;overflow-x:auto;gap:12px;scroll-snap-type:x mandatory}.df-tasks .df-lane{flex:0 0 min(78vw,300px);scroll-snap-align:start;background:var(--soft);border-radius:18px;padding:10px;min-height:110px}.df-tasks .df-week{display:flex;gap:8px;overflow-x:auto}.df-tasks .df-week button{min-width:84px}.df-tasks .df-error{color:#a21d47}.df-tasks :focus-visible{outline:3px solid #589bff;outline-offset:2px}@media(min-width:650px){.df-tasks .df-board{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));overflow:visible}.df-tasks .df-lane{min-width:0}.df-tasks .df-actions .df-btn{font-size:.83rem}}@media(prefers-reduced-motion:reduce){.df-tasks *{scroll-behavior:auto!important}}`;
 function dateLocal(now){const d=new Date(now);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
 function mount(target,adapter){
  if(!C)throw new Error('tasks_core_v21.js must be loaded first');
  if(!target||typeof target.appendChild!=='function')throw new TypeError('DOM target required');
  if(!adapter||typeof adapter.readState!=='function'||typeof adapter.commit!=='function')throw new TypeError('readState/commit adapter required');
  const doc=target.ownerDocument,ar=adapter.locale==='ar',l=labels[ar?'ar':'en'];
  let state=adapter.readState(),undoStack=[],redoStack=[],view='today',editing=null,category='',query='',day='',status='',projectFilter='',sort='date',expanded=new Set(),isDestroyed=false;
  const currentDay=()=>dateLocal(typeof adapter.now==='function'?adapter.now():new Date());
   let cachedState=null,cachedFocus=new Map(),cachedPicksState=null,cachedPicksDay='',cachedPicks=[];
   function focusFor(id){if(cachedState!==state){cachedFocus=C.sessionTotals(state);cachedState=state;}return cachedFocus.get(id)||0;}
   function manualIds(snapshot){const v=snapshot.cfg?.taskTopThreeV21?.[currentDay()];return Array.isArray(v)?v:[];}
   function picks(){const day=currentDay();if(cachedPicksState!==state||cachedPicksDay!==day){cachedPicks=C.topThree(state,day);cachedPicksState=state;cachedPicksDay=day;}return cachedPicks;}
  const el=(tag,cls,text)=>{const x=doc.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=String(text);return x;};
  const btn=(caption,fn,kind='')=>{const b=el('button','df-btn '+kind,caption);b.type='button';b.addEventListener('click',fn);return b;};
  const append=(parent,...nodes)=>{nodes.forEach(n=>parent.appendChild(n));return parent;};
  const label=(text,control)=>append(el('label','',text),control);
  const input=(type,value)=>{const n=el('input');n.type=type;n.value=value==null?'':String(value);return n;};
  const selection=(pairs,value)=>{const n=el('select');pairs.forEach(([v,name])=>{const o=el('option','',name);o.value=String(v);n.appendChild(o);});n.value=String(value??'');return n;};
  const current=()=>state;
  const error=e=>{if(typeof adapter.onError==='function')adapter.onError(e);else{message.textContent=l.invalid+': '+e.message;message.className='df-error';}};
  function apply(change){
   try{
    const latest=adapter.readState();
    if(JSON.stringify(latest)!==JSON.stringify(state)){state=latest;undoStack=[];redoStack=[];}
    const old=state,output=change(old),next=output.state;
    if(!next||!Array.isArray(next.tasksList))throw new Error('Invalid change result');
    if(JSON.stringify(old)===JSON.stringify(next))return;
    const committed=adapter.commit(old,next);
    if(committed && typeof committed.then==='function')throw new Error('Only synchronous commit supported');
    undoStack.push(old);if(undoStack.length>20)undoStack.shift();redoStack=[];state=next;
    if(typeof adapter.onAfterChange==='function')adapter.onAfterChange(state);
    editing=null;render();
   }catch(e){error(e);}
  }
  function timeTravel(from,to){
   if(!from.length)return;
   const latest=adapter.readState();
   if(JSON.stringify(latest)!==JSON.stringify(state)){state=latest;undoStack=[];redoStack=[];render();return;}
   const next=from[from.length-1];
   try{const r=adapter.commit(state,next);if(r&&typeof r.then==='function')throw new Error('Only synchronous commit supported');
    from.pop();to.push(state);state=next;editing=null;if(typeof adapter.onAfterChange==='function')adapter.onAfterChange(state);render();
   }catch(e){error(e);}
  }
  const undo=()=>timeTravel(undoStack,redoStack),redo=()=>timeTravel(redoStack,undoStack);
  const wrapper=el('section','df-tasks');wrapper.setAttribute('dir',ar?'rtl':'ltr');
  const style=el('style');style.textContent=CSS;wrapper.appendChild(style);
  const content=el('div');wrapper.appendChild(content);target.appendChild(wrapper);
  const message=el('div','df-error');message.setAttribute('role','status');wrapper.appendChild(message);
  function taskCard(t){
    const card=el('article','df-task'),head=el('header'),caption=el('div','df-task-title');
    append(caption,el('div','df-title',t.title),el('span','df-status',l[C.statusOf(t)]));
    head.appendChild(caption);
    if(t.dueAssigned!==false&&C.validDate(t.date)){
     const due=el('span','df-mini-due',t.date+(t.dueTime?' '+t.dueTime:''));
     if(C.isOverdue(t,currentDay()))due.className+=' df-overdue';head.appendChild(due);
    }
    if(!t.deletedAt)head.appendChild(btn(t.done?l.resume:l.done,()=>apply(x=>C.setStatus(x,t.id,t.done?'todo':'completed')),'df-primary-action df-primary'));
    card.appendChild(head);
    if(t.deletedAt){card.appendChild(btn(l.restore,()=>apply(x=>C.restoreTask(x,t.id)),'df-primary'));return card;}
    const more=el('section','df-task-more');more.hidden=!expanded.has(t.id);
    const toggle=btn(more.hidden?l.details:l.hide,()=>{
     if(expanded.has(t.id))expanded.delete(t.id);else expanded.add(t.id);
     more.hidden=!expanded.has(t.id);toggle.textContent=more.hidden?l.details:l.hide;
     toggle.setAttribute('aria-expanded',String(!more.hidden));
    },'df-expand');
    toggle.setAttribute('aria-expanded',String(!more.hidden));card.appendChild(toggle);
    if(t.description)more.appendChild(el('p','df-muted',t.description));
    const meta=el('div','df-meta');meta.appendChild(el('span','',l[t.catKey]||t.catKey));
    if(t.priority)meta.appendChild(el('span','',l[t.priority]||t.priority));
    const actual=focusFor(t.id);
    if((t.estimateMin||0)>0||actual>0)meta.appendChild(el('span','',l.estimated+': '+(t.estimateMin||0)+' · '+l.actual+': '+actual));
    more.appendChild(meta);
    for(const kind of ['checklist','subtasks']){
     if(!Array.isArray(t[kind]))continue;
     for(const item of t[kind]){
      const row=el('label','df-check'),tick=input('checkbox');tick.checked=!!item.done;
      tick.addEventListener('change',()=>apply(x=>C.setItemDone(x,t.id,kind,item.id,tick.checked)));
      append(row,tick,el('span','',item.title));more.appendChild(row);
     }
     if(t[kind].length)more.appendChild(el('p','df-muted',l[kind==='checklist'?'check':'sub']+': '+t[kind].filter(x=>x.done).length+'/'+t[kind].length));
    }
    const actions=el('div','df-actions'),pinned=manualIds(state).includes(t.id);
    append(actions,btn(l.edit,()=>{editing=t.id;render();}),btn(pinned?l.topUnpin:l.topPin,()=>{
     apply(x=>{const ids=manualIds(x).slice();
      const next=ids.includes(t.id)?ids.filter(id=>id!==t.id):[...ids,t.id];
      if(next.length>3)throw new Error(l.topLimit);
      return {state:C.chooseTopThree(x,currentDay(),next)};
     });
    }),btn(l.focus,()=>{try{if(typeof adapter.linkTaskToTimer!=='function'||adapter.linkTaskToTimer(t.id)!==true)throw new Error(l.notConnected);}catch(e){error(e);}}));
    actions.appendChild(C.statusOf(t)==='archived'?btn(l.resume,()=>apply(x=>C.setStatus(x,t.id,'todo'))):btn(l.archive,()=>apply(x=>C.setStatus(x,t.id,'archived'))));
    actions.appendChild(btn(l.remove,()=>apply(x=>C.trashTask(x,t.id)),'df-danger'));
    for(const kind of ['checklist','subtasks'])actions.appendChild(btn('＋ '+l[kind==='checklist'?'check':'sub'],()=>{
     const value=typeof adapter.requestText==='function'?adapter.requestText(l[kind==='checklist'?'check':'sub']):null;
     if(value)apply(x=>C.addItem(x,t.id,kind,value));
    }));
    more.appendChild(actions);
    const dateRow=el('div','df-date-quick'),dateField=input('date',t.date||currentDay());
    append(dateRow,dateField,btn(l.saveDue,()=>apply(x=>C.updateTask(x,t.id,{date:dateField.value,dueAssigned:true}))));
    more.appendChild(dateRow);card.appendChild(more);return card;
   }
   function editor(){
   const t=state.tasksList.find(x=>x.id===editing),panel=el('div','df-dialog'),form=el('form','df-form');
   const title=input('text',t?.title||''),description=el('textarea');description.rows=3;description.value=t?.description||'';
   const due=input('date',t?.date||currentDay()),dueTime=input('time',t?.dueTime||'');
    const hasDue=input('checkbox');hasDue.checked=t?t.dueAssigned!==false:false;hasDue.style.width='auto';
   const categoryInput=selection(['study','sport','review','exam'].map(v=>[v,l[v]]),t?.catKey||'study');
   const priority=selection(['low','medium','high','urgent'].map(v=>[v,l[v]]),t?.priority||'medium');
   const estimate=input('number',t?.estimateMin??'');estimate.min='0';estimate.max='100000';
   const repeat=selection([['',l.never],...['daily','weekdays','weekly','monthly'].map(v=>[v,l[v]])],t?.repeat?.frequency||'');
   const group=input('text',t?.group||'');
   const project=selection([['',l.none],...C.projects(state).filter(p=>!p.deletedAt).map(p=>[p.id,p.name])],t?.projectId??'');
   const notes=input('text',(t?.noteIds||[]).join(','));notes.inputMode='numeric';
   const important=input('checkbox');important.checked=!!t?.important;important.style.width='auto';
   const urgent=input('checkbox');urgent.checked=!!t?.urgent;urgent.style.width='auto';
   append(form,label(l.task,title),label(l.desc,description),label(l.dueOptional,hasDue));
   const grid=el('div','df-grid');append(grid,label(l.due,due),label(l.time,dueTime),label(l.cat,categoryInput),label(l.priority,priority),label(l.estimate,estimate),label(l.repeat,repeat),label(l.group,group),label(l.proj,project),label(l.notes,notes));form.appendChild(grid);
   append(form,label(l.do,important),label(l.delegate,urgent));
   const actions=el('div','df-actions');append(actions,btn(l.cancel,()=>{editing=null;render();}));
   const save=btn(l.save,()=>{} ,'df-primary');save.type='submit';actions.appendChild(save);form.appendChild(actions);
   form.addEventListener('submit',e=>{
    e.preventDefault();
    const noteTokens=notes.value.trim()?notes.value.split(',').map(x=>x.trim()):[];
    if(noteTokens.some(x=>!/^(0|[1-9]\d*)$/.test(x))){error(new Error('Numeric note IDs required'));return;}
    const fields={title:title.value,description:description.value,date:due.value,dueTime:dueTime.value||null,
     catKey:categoryInput.value,priority:priority.value,estimateMin:Number(estimate.value),repeat:repeat.value?{frequency:repeat.value,interval:1}:null,
     important:important.checked,urgent:urgent.checked,group:group.value,projectId:project.value?Number(project.value):null,
     noteIds:noteTokens.map(Number),dueAssigned:hasDue.checked};
    apply(s=>t?C.updateTask(s,t.id,fields,{noteIds:adapter.noteIds?.()}):C.createTask(s,fields,{noteIds:adapter.noteIds?.()}));
   });
   panel.appendChild(form);return panel;
  }
  function render(){
   if(isDestroyed)return;
   content.replaceChildren();message.textContent='';
   const head=el('div','df-head'),titleWrap=el('div');append(titleWrap,el('h2','',l.title),el('p','df-muted',l.subtitle));head.appendChild(titleWrap);
   const buttons=el('div','df-toolbar');append(buttons,btn(l.advanced,()=>{editing='new';render();}),btn(l.project,()=>{
    const name=typeof adapter.requestText==='function'?adapter.requestText(l.project):null;
    if(name)apply(s=>C.createProject(s,{name},{noteIds:adapter.noteIds?.()}));
   }),btn(l.undo,undo),btn(l.redo,redo));head.appendChild(buttons);content.appendChild(head);
   const quick=el('form','df-quick'),quickText=input('text',''),add=btn('＋ '+l.add,()=>{},'df-primary');quickText.placeholder=l.quick;quickText.maxLength=20000;quickText.setAttribute('aria-label',l.quick);add.type='submit';append(quick,quickText,add);
    quick.addEventListener('submit',event=>{event.preventDefault();if(!quickText.value.trim())return;apply(x=>C.createTask(x,{title:quickText.value},{noteIds:adapter.noteIds?.(),today:currentDay()}));});content.appendChild(quick);
    if(editing!==null)content.appendChild(editor());
   const today=el('section','df-panel'),top=el('h3','',l.today);today.appendChild(top);
   const top3=picks();if(!top3.length)today.appendChild(el('p','df-muted',l.empty));else{const pinned=el('div','df-top-list');top3.forEach(t=>pinned.appendChild(btn('★ '+t.title,()=>{expanded.add(t.id);view='all';render();})));today.appendChild(pinned);}
   content.appendChild(today);
   const pr=C.projects(state).filter(x=>!x.deletedAt);if(pr.length){const list=el('div','df-grid');pr.forEach(p=>{
    const progress=C.projectProgress(state,p.id),card=el('div','df-project');append(card,el('h3','',p.name),el('p','df-muted',`${progress.completed}/${progress.total} · ${progress.percent}%`));
    const bar=el('progress');bar.max=100;bar.value=progress.percent;bar.setAttribute('aria-label',p.name);card.appendChild(bar);list.appendChild(card);
   });content.appendChild(list);}
   const tabs=el('div','df-tabs df-section');[['today',l.todayTab],['upcoming',l.upcoming],['overdue',l.overdue],['completed',l.completedTab],['all',l.all],['board',l.board],['matrix',l.matrix],['calendar',l.calendar],['trash',l.trash]].forEach(([v,caption])=>{
    const b=btn(caption,()=>{view=v;day='';render();});b.setAttribute('aria-pressed',String(view===v));tabs.appendChild(b);
   });content.appendChild(tabs);
   const filters=el('div','df-grid df-section'),search=input('search',query),cats=selection([['',l.allCategories],...['study','sport','review','exam'].map(v=>[v,l[v]])],category);
   const statuses=selection([['',l.all],...['todo','doing','completed','archived'].map(v=>[v,l[v]])],status);
    const projectPick=selection([['',l.allProjects],...C.projects(state).filter(p=>!p.deletedAt).map(p=>[p.id,p.name])],projectFilter);
    const sorting=selection([['date',l.sortDate],['title',l.sortTitle],['priority',l.sortPriority]],sort);
   search.placeholder=l.search;search.addEventListener('input',()=>{query=search.value;renderResults();});
   cats.addEventListener('change',()=>{category=cats.value;renderResults();});statuses.addEventListener('change',()=>{status=statuses.value;renderResults();});
   projectPick.addEventListener('change',()=>{projectFilter=projectPick.value;renderResults();});sorting.addEventListener('change',()=>{sort=sorting.value;renderResults();});
    append(filters,search,cats,projectPick,statuses,sorting);content.appendChild(filters);
   const results=el('div','df-section');results.id='df-task-results';content.appendChild(results);
   function renderResults(){
    results.replaceChildren();let active=C.searchTasks(state,{query,catKey:category||undefined,status:status||undefined,projectId:projectFilter?Number(projectFilter):undefined,includeArchived:true,
     includeTrash:view==='trash'}).filter(t=>view==='trash'?!!t.deletedAt:!t.deletedAt);
     if(['today','upcoming','overdue','completed'].includes(view))active=C.taskSections({tasksList:active,cfg:state.cfg},currentDay())[view];
     if(sort==='title')active.sort((a,b)=>String(a.title).localeCompare(String(b.title))||a.id-b.id);
     if(sort==='priority'){const ranks={urgent:4,high:3,medium:2,low:1};active.sort((a,b)=>(ranks[b.priority]||0)-(ranks[a.priority]||0)||a.date.localeCompare(b.date)||a.id-b.id);}
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
