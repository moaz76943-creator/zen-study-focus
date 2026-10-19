/* Deep Focus UX Recovery 15: isolated, in-memory prototype.
 * No application imports, storage keys, persistence, timer records or auto-mount on production pages.
 * All mutations below change a disposable demonstration model only.
 */
(function(root,factory){
  'use strict';
  var api=factory();
  if(typeof module==='object' && module.exports) module.exports=api;
  else root.DFUX15=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function copy(x){return JSON.parse(JSON.stringify(x));}
  function titleOf(s){var t=String(s==null?'':s).trim();if(!t||t.length>250)throw Error('TITLE_REQUIRED');return t;}
  function dateOf(s){var t=String(s||'');if(t&&!/^\d{4}-\d{2}-\d{2}$/.test(t))throw Error('INVALID_DATE');return t;}
  function createModel(seed){
    var initial=seed||{
      tasks:[{id:1,title:'مراجعة خطة الأسبوع',due:'',done:false,priority:'high',top:true,steps:[{id:1,title:'تلخيص الأولويات',done:false}]},{id:2,title:'قراءة فصل جديد',due:'',done:false,priority:'normal',top:false,steps:[]}],
      notes:[{id:1,title:'أفكار هذا الأسبوع',body:'رتّب المهام حسب الأثر، وليس عددها.',kind:'quick',cornell:{cues:'',notes:'',summary:''}}]
    };
    var tasks=copy(initial.tasks||[]),notes=copy(initial.notes||[]);
    var nextTask=tasks.reduce(function(n,t){return Math.max(n,Number(t.id)||0);},0)+1;
    var nextNote=notes.reduce(function(n,t){return Math.max(n,Number(t.id)||0);},0)+1;
    var taskTrash=null,noteTrash=null;
    function get(list,id){var value=list.find(function(x){return x.id===Number(id);});if(!value)throw Error('NOT_FOUND');return value;}
    function snapshot(){return copy({tasks:tasks,notes:notes});}
    function addTask(title){var item={id:nextTask++,title:titleOf(title),done:false,priority:'normal',due:'',top:false,steps:[]};tasks.unshift(item);taskTrash=null;return copy(item);}
    function updateTask(id,patch){
      var item=get(tasks,id),p=patch||{};
      if(Object.prototype.hasOwnProperty.call(p,'title'))item.title=titleOf(p.title);
      if(Object.prototype.hasOwnProperty.call(p,'due'))item.due=dateOf(p.due);
      if(Object.prototype.hasOwnProperty.call(p,'priority')){if(!['high','normal'].includes(p.priority))throw Error('INVALID_PRIORITY');item.priority=p.priority;}
      return copy(item);
    }
    function toggleTask(id){var x=get(tasks,id);x.done=!x.done;if(x.done)x.top=false;return copy(x);}
    function toggleTop(id){var x=get(tasks,id);if(x.done)throw Error('COMPLETED_TOP');if(!x.top&&tasks.filter(function(t){return t.top&&!t.done;}).length>=3)throw Error('TOP_LIMIT');x.top=!x.top;return copy(x);}
    function addStep(id,text){var x=get(tasks,id),t=titleOf(text);x.steps=x.steps||[];var sid=x.steps.reduce(function(n,s){return Math.max(n,Number(s.id)||0);},0)+1;x.steps.push({id:sid,title:t,done:false});return copy(x);}
    function toggleStep(id,stepId){var x=get(tasks,id),s=get(x.steps||[],stepId);s.done=!s.done;return copy(x);}
    function deleteTask(id){var i=tasks.findIndex(function(t){return t.id===Number(id);});if(i<0)throw Error('NOT_FOUND');taskTrash={index:i,item:tasks.splice(i,1)[0]};return copy(taskTrash.item);}
    function undoTask(){if(!taskTrash)return false;tasks.splice(taskTrash.index,0,taskTrash.item);taskTrash=null;return true;}
    function cleanNote(data){
      var d=data||{},body=String(d.body||''),title=String(d.title||'').trim(),c=d.cornell||{};
      var cornell={cues:String(c.cues||''),notes:String(c.notes||''),summary:String(c.summary||'')};
      if(title.length>250||body.length>500000)throw Error('NOTE_TOO_LARGE');
      if(!title&&!body.trim()&&!cornell.cues.trim()&&!cornell.notes.trim()&&!cornell.summary.trim())throw Error('EMPTY_NOTE');
      if(!['quick','cornell'].includes(d.kind))throw Error('INVALID_KIND');
      return {title:title||'—',body:body,kind:d.kind,cornell:cornell};
    }
    function addNote(data){var x=cleanNote(data);x.id=nextNote++;notes.unshift(x);noteTrash=null;return copy(x);}
    function updateNote(id,data){var i=notes.findIndex(function(n){return n.id===Number(id);});if(i<0)throw Error('NOT_FOUND');notes[i]=Object.assign({},notes[i],cleanNote(data));return copy(notes[i]);}
    function deleteNote(id){var i=notes.findIndex(function(n){return n.id===Number(id);});if(i<0)throw Error('NOT_FOUND');noteTrash={index:i,item:notes.splice(i,1)[0]};return copy(noteTrash.item);}
    function undoNote(){if(!noteTrash)return false;notes.splice(noteTrash.index,0,noteTrash.item);noteTrash=null;return true;}
    return {snapshot:snapshot,addTask:addTask,updateTask:updateTask,toggleTask:toggleTask,toggleTop:toggleTop,addStep:addStep,toggleStep:toggleStep,deleteTask:deleteTask,undoTask:undoTask,addNote:addNote,updateNote:updateNote,deleteNote:deleteNote,undoNote:undoNote};
  }
  var translations={
    ar:{heading:'مساحتك للإنجاز بهدوء',tagline:'كل ما تحتاجه اليوم، دون ازدحام.',demo:'نموذج تفاعلي مستقل: البيانات تجريبية وتُفقد عند تحديث الصفحة. لا يوجد حفظ في التطبيق الحقيقي.',tasks:'المهام',notes:'الملاحظات',daily:'مساحة اليوم',tasksTitle:'أنجز ما يهم',taskTitle:'عنوان المهمة',taskPlaceholder:'ما المهمة التالية؟',addTask:'إضافة',topThree:'أهم ثلاث أولويات',topHint:'اختر من بطاقات المهام، دون تغيير وقت التركيز.',searchTask:'بحث المهام',filterTask:'تصفية المهام',all:'الكل',today:'اليوم',upcoming:'القادمة',completed:'المكتملة',tasksEmpty:'لا توجد مهام مطابقة',tasksEmptyHint:'ابدأ بمهمة سريعة أو غيّر التصفية.',writeTask:'اكتب مهمة',taskDeleted:'حُذفت المهمة من النموذج',undo:'تراجع',ideas:'مساحة الأفكار',notesTitle:'دوّن بوضوح',newNote:'ملاحظة جديدة',searchNote:'بحث الملاحظات',filterNote:'نوع الملاحظة',quick:'سريعة',cornell:'Cornell',notesEmpty:'صفحة بيضاء لأفكارك',notesEmptyHint:'أنشئ أول ملاحظة أو غيّر البحث.',noteDeleted:'حُذفت الملاحظة من النموذج',footer:'تصميم تجريبي للمراجعة — لا يتصل بمخزن v21 أو المؤقت.',editTask:'تعديل مهمة',taskOptions:'خيارات إضافية',due:'موعد اختياري',priority:'الأولوية',normal:'عادية',high:'عالية',cancel:'إلغاء',save:'حفظ',noteEditor:'محرر الملاحظة',noteTitle:'العنوان',body:'نص الملاحظة',advanced:'أدوات متقدمة',noteType:'النوع',cues:'أسئلة ومفاتيح',mainNotes:'الملاحظات الأساسية',summary:'الخلاصة',close:'إغلاق',edit:'تعديل',read:'قراءة',more:'المزيد',done:'إنجاز',reopen:'إعادة فتح',pin:'ضمن أولوياتي',unpin:'إزالة من الأولويات',delete:'حذف',steps:'قائمة التحقق',stepPlaceholder:'خطوة جديدة',addStep:'إضافة خطوة',noTop:'اختر أولوياتك من البطاقات',stepProgress:'خطوات مكتملة',demoSaved:'تم تحديث النموذج التجريبي فقط',required:'اكتب عنوانًا أو نصًا صالحًا',maxTop:'يمكن اختيار ثلاث أولويات فقط',emptyStep:'اكتب خطوة أولًا',saveError:'لم يُنفّذ التغيير',notePreview:'عرض القراءة',untitled:'بدون عنوان'},
    en:{heading:'A calmer way to make progress',tagline:'Everything for today, without clutter.',demo:'Standalone interactive demo. Changes disappear on refresh and are NOT saved to the real app.',tasks:'Tasks',notes:'Notes',daily:'TODAY',tasksTitle:'Make what matters happen',taskTitle:'Task title',taskPlaceholder:'What is the next task?',addTask:'Add',topThree:'Your top three',topHint:'Choose on task cards. No focus time is changed.',searchTask:'Search tasks',filterTask:'Filter tasks',all:'All',today:'Today',upcoming:'Upcoming',completed:'Completed',tasksEmpty:'No matching tasks',tasksEmptyHint:'Add a task or change the filter.',writeTask:'Write a task',taskDeleted:'Task deleted from demo',undo:'Undo',ideas:'YOUR IDEAS',notesTitle:'Capture clear thoughts',newNote:'New note',searchNote:'Search notes',filterNote:'Note type',quick:'Quick',cornell:'Cornell',notesEmpty:'Space for new ideas',notesEmptyHint:'Create a note or change your search.',noteDeleted:'Note deleted from demo',footer:'Review-only demo. No connection to v21 storage or timer.',editTask:'Edit task',taskOptions:'More options',due:'Optional due date',priority:'Priority',normal:'Normal',high:'High',cancel:'Cancel',save:'Save',noteEditor:'Note editor',noteTitle:'Title',body:'Note text',advanced:'Advanced tools',noteType:'Type',cues:'Cues / questions',mainNotes:'Main notes',summary:'Summary',close:'Close',edit:'Edit',read:'Read',more:'More',done:'Complete',reopen:'Reopen',pin:'Make a priority',unpin:'Remove priority',delete:'Delete',steps:'Checklist',stepPlaceholder:'New step',addStep:'Add step',noTop:'Select your priorities from task cards',stepProgress:'steps completed',demoSaved:'Updated demo model only',required:'Enter a valid title or note',maxTop:'Only three priorities allowed',emptyStep:'Write a step first',saveError:'Action was not applied',notePreview:'Reading view',untitled:'Untitled'}
  };
  function attach(doc){
    if(!doc||!doc.getElementById('tasksView'))throw Error('UX15_ROOT_REQUIRED');
    var model=createModel(),lang='ar',tab='tasks',editTaskId=null,editNoteId=null,readNoteId=null,priorFocus=null;
    var $=function(id){return doc.getElementById(id);};
    var tr=function(key){return translations[lang][key]||key;};
    function elem(tag,cls,text){var x=doc.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=String(text);return x;}
    function action(label,kind,id,style){var b=elem('button','button '+(style||'secondary'),label);b.type='button';b.dataset.action=kind;b.dataset.id=String(id);return b;}
    function toast(key,isError){var x=$('toast');x.textContent=isError?(tr('saveError')+': '+(key||'')):tr(key);x.classList.add('visible');x.setAttribute('role',isError?'alert':'status');}
    function fail(e){toast(e&&e.message?e.message:String(e),true);}
    function translate(){
      doc.documentElement.lang=lang;doc.documentElement.dir=lang==='ar'?'rtl':'ltr';
      doc.querySelectorAll('[data-i18n]').forEach(function(x){x.textContent=tr(x.dataset.i18n);});
      doc.querySelectorAll('[data-placeholder]').forEach(function(x){x.placeholder=tr(x.dataset.placeholder);});
      $('localeSwitch').textContent=lang==='ar'?'EN':'عربي';
      $('localeSwitch').setAttribute('aria-label',lang==='ar'?'Switch to English':'التبديل إلى العربية');
    }
    function switchTab(next){
      tab=next; $('tasksView').hidden=tab!=='tasks';$('notesView').hidden=tab!=='notes';
      doc.querySelectorAll('[data-tab]').forEach(function(x){x.setAttribute('aria-pressed',String(x.dataset.tab===tab));});
      render();
    }
    function renderTasks(){
      var state=model.snapshot(),list=$('taskList'),q=$('taskSearch').value.toLocaleLowerCase().trim(),f=$('taskFilter').value;
      var day=new Date(),today=[day.getFullYear(),String(day.getMonth()+1).padStart(2,'0'),String(day.getDate()).padStart(2,'0')].join('-');
      var top=state.tasks.filter(function(x){return x.top&&!x.done;}).slice(0,3);
      var toplist=$('topList');toplist.replaceChildren();
      if(!top.length)toplist.appendChild(elem('span','priority-empty',tr('noTop')));
      top.forEach(function(t){toplist.appendChild(elem('span','priority-item',t.title));});
      var matches=state.tasks.filter(function(t){
        if(q&&!t.title.toLocaleLowerCase().includes(q))return false;
        if(f==='today')return !t.done&&(!t.due||t.due<=today);
        if(f==='upcoming')return !t.done&&Boolean(t.due)&&t.due>today;
        if(f==='done')return t.done;
        return true;
      });
      list.replaceChildren();$('emptyTasks').hidden=matches.length!==0;
      matches.forEach(function(t){
        var card=elem('article','card'),line=elem('div','card-top'),status=action(t.done?'✓':'○','complete',t.id,'secondary');
        status.className='task-check';status.setAttribute('aria-pressed',String(t.done));status.setAttribute('aria-label',t.done?tr('reopen'):tr('done'));line.appendChild(status);
        var center=elem('div','card-content'),title=elem('h3','card-title'+(t.done?' done':''),t.title);title.dir='auto';center.appendChild(title);
        var metadata=elem('div','meta');
        if(t.due)metadata.appendChild(elem('span','',t.due));
        if(t.priority==='high')metadata.appendChild(elem('span','',tr('high')));
        if(t.steps&&t.steps.length)metadata.appendChild(elem('span','',t.steps.filter(function(s){return s.done;}).length+'/'+t.steps.length+' '+tr('stepProgress')));
        center.appendChild(metadata);line.appendChild(center);card.appendChild(line);
        var actions=elem('div','card-actions');actions.appendChild(action(tr('edit'),'edit-task',t.id));actions.appendChild(action(t.top?tr('unpin'):tr('pin'),'top',t.id));card.appendChild(actions);
        var details=elem('details',''),summary=elem('summary','',tr('more'));details.appendChild(summary);
        var contents=elem('div','detail-content');contents.appendChild(elem('h4','step-heading',tr('steps')));
        (t.steps||[]).forEach(function(s){
          var row=elem('label','step-row'),c=elem('input','');c.type='checkbox';c.checked=!!s.done;c.dataset.action='toggle-step';c.dataset.id=String(t.id);c.dataset.stepId=String(s.id);row.appendChild(c);var label=elem('span','',s.title);label.dir='auto';row.appendChild(label);contents.appendChild(row);
        });
        var add=elem('div','step-add'),input=elem('input','');input.type='text';input.maxLength=250;input.placeholder=tr('stepPlaceholder');input.setAttribute('aria-label',tr('stepPlaceholder'));add.appendChild(input);add.appendChild(action(tr('addStep'),'add-step',t.id));contents.appendChild(add);
        contents.appendChild(action(tr('delete'),'delete-task',t.id,'danger'));details.appendChild(contents);card.appendChild(details);list.appendChild(card);
      });
    }
    function renderNotes(){
      var state=model.snapshot(),list=$('noteList'),q=$('noteSearch').value.toLocaleLowerCase().trim(),f=$('noteFilter').value;
      var notes=state.notes.filter(function(n){
        return (f==='all'||n.kind===f)&&(!q||(n.title+' '+n.body+' '+n.cornell.cues+' '+n.cornell.notes+' '+n.cornell.summary).toLocaleLowerCase().includes(q));
      });
      list.replaceChildren();$('emptyNotes').hidden=notes.length!==0;
      notes.forEach(function(n){
        var card=elem('article','card'),line=elem('div','card-top'),body=elem('div','card-content');body.appendChild(elem('span','eyebrow',tr(n.kind)));
        var name=elem('h3','card-title',n.title);name.dir='auto';body.appendChild(name);
        var p=elem('p','card-preview',n.body||n.cornell.summary||n.cornell.notes||n.cornell.cues);p.dir='auto';body.appendChild(p);
        line.appendChild(body);card.appendChild(line);
        var buttons=elem('div','card-actions');buttons.appendChild(action(tr('read'),'read',n.id,'primary'));buttons.appendChild(action(tr('edit'),'edit-note',n.id));
        card.appendChild(buttons);
        var details=elem('details',''),summary=elem('summary','',tr('more'));details.appendChild(summary);
        var contents=elem('div','detail-content');contents.appendChild(action(tr('delete'),'delete-note',n.id,'danger'));details.appendChild(contents);card.appendChild(details);
        list.appendChild(card);
      });
    }
    function render(){renderTasks();renderNotes();}
    function showOverlay(id,focusId){
      priorFocus=doc.activeElement;
      $('overlay').hidden=false;
      ['taskEditor','noteEditor','reader'].forEach(function(x){$(x).hidden=x!==id;});
      doc.body.style.overflow='hidden';
      var focus=focusId?$(focusId):$(id).querySelector('[data-close]');
      if(focus)focus.focus();
    }
    function closeOverlay(){
      $('overlay').hidden=true;['taskEditor','noteEditor','reader'].forEach(function(x){$(x).hidden=true;});
      doc.body.style.overflow='';
      if(priorFocus&&typeof priorFocus.focus==='function')priorFocus.focus();
    }
    function openTask(id){
      editTaskId=Number(id);var t=model.snapshot().tasks.find(function(x){return x.id===editTaskId;});if(!t)return;
      $('taskEditTitle').value=t.title;$('taskEditDue').value=t.due||'';$('taskEditPriority').value=t.priority;
      showOverlay('taskEditor','taskEditTitle');
    }
    function openNote(id){
      editNoteId=id==null?null:Number(id);var n=model.snapshot().notes.find(function(x){return x.id===editNoteId;});
      $('noteTitle').value=n?n.title:'';$('noteBody').value=n?n.body:'';
      $('noteKind').value=n?n.kind:'quick';
      ['cues','notes','summary'].forEach(function(key){var ids={cues:'cornellCues',notes:'cornellNotes',summary:'cornellSummary'};$(ids[key]).value=n?n.cornell[key]:'';});
      $('cornellFields').hidden=$('noteKind').value!=='cornell';
      showOverlay('noteEditor','noteTitle');
    }
    function openReader(id){
      readNoteId=Number(id);var n=model.snapshot().notes.find(function(x){return x.id===readNoteId;});if(!n)return;
      $('readerHeading').textContent=n.title;$('readerText').textContent=n.body;var box=$('readerCornell');box.replaceChildren();
      if(n.kind==='cornell'){
        [['cues','cues'],['notes','mainNotes'],['summary','summary']].forEach(function(pair){
          var section=elem('section','');section.appendChild(elem('h3','',tr(pair[1])));var content=elem('div','',n.cornell[pair[0]]);content.dir='auto';section.appendChild(content);box.appendChild(section);
        });box.hidden=false;
      }else box.hidden=true;
      showOverlay('reader');
    }
    $('quickTaskForm').addEventListener('submit',function(e){
      e.preventDefault();try{model.addTask($('quickTaskTitle').value);$('quickTaskTitle').value='';$('taskUndo').hidden=true;render();toast('demoSaved');}catch(err){fail(err);}
    });
    $('taskForm').addEventListener('submit',function(e){
      e.preventDefault();try{model.updateTask(editTaskId,{title:$('taskEditTitle').value,due:$('taskEditDue').value,priority:$('taskEditPriority').value});closeOverlay();render();toast('demoSaved');}catch(err){fail(err);}
    });
    $('noteForm').addEventListener('submit',function(e){
      e.preventDefault();var data={title:$('noteTitle').value,body:$('noteBody').value,kind:$('noteKind').value,
        cornell:{cues:$('cornellCues').value,notes:$('cornellNotes').value,summary:$('cornellSummary').value}};
      try{if(editNoteId===null)model.addNote(data);else model.updateNote(editNoteId,data);
        closeOverlay();$('noteUndo').hidden=true;render();toast('demoSaved');}catch(err){fail(err);}
    });
    $('localeSwitch').addEventListener('click',function(){lang=lang==='ar'?'en':'ar';translate();render();if(!$('reader').hidden&&readNoteId!==null)openReader(readNoteId);});
    doc.querySelectorAll('[data-tab]').forEach(function(x){x.addEventListener('click',function(){switchTab(x.dataset.tab);});});
    $('taskSearch').addEventListener('input',renderTasks);$('taskFilter').addEventListener('change',renderTasks);
    $('noteSearch').addEventListener('input',renderNotes);$('noteFilter').addEventListener('change',renderNotes);
    $('newNote').addEventListener('click',function(){openNote(null);});
    $('emptyNewNote').addEventListener('click',function(){openNote(null);});
    $('focusQuick').addEventListener('click',function(){$('quickTaskTitle').focus();});
    $('undoTask').addEventListener('click',function(){if(model.undoTask()){render();toast('demoSaved');}$('taskUndo').hidden=true;});
    $('undoNote').addEventListener('click',function(){if(model.undoNote()){render();toast('demoSaved');}$('noteUndo').hidden=true;});
    $('noteKind').addEventListener('change',function(){$('cornellFields').hidden=$('noteKind').value!=='cornell';});
    $('readerEdit').addEventListener('click',function(){openNote(readNoteId);});
    $('overlay').addEventListener('click',function(e){if(e.target===$('overlay')||e.target.closest('[data-close]'))closeOverlay();});
    doc.addEventListener('keydown',function(e){if(e.key==='Escape'&&!$('overlay').hidden){e.preventDefault();closeOverlay();}});
    $('taskList').addEventListener('click',function(e){
      var b=e.target.closest('[data-action]');if(!b)return;var id=Number(b.dataset.id);
      try{
        if(b.dataset.action==='complete')model.toggleTask(id);
        else if(b.dataset.action==='top')model.toggleTop(id);
        else if(b.dataset.action==='edit-task'){openTask(id);return;}
        else if(b.dataset.action==='delete-task'){model.deleteTask(id);$('taskUndo').hidden=false;}
        else if(b.dataset.action==='add-step'){
          var input=b.parentElement.querySelector('input');model.addStep(id,input.value);
        }else return;
        render();toast('demoSaved');
      }catch(err){fail(err);}
    });
    $('taskList').addEventListener('change',function(e){
      var b=e.target;if(b.dataset.action!=='toggle-step')return;
      try{model.toggleStep(b.dataset.id,b.dataset.stepId);render();toast('demoSaved');}catch(err){fail(err);}
    });
    $('noteList').addEventListener('click',function(e){
      var b=e.target.closest('[data-action]');if(!b)return;var id=Number(b.dataset.id);
      try{
        if(b.dataset.action==='read')openReader(id);
        else if(b.dataset.action==='edit-note')openNote(id);
        else if(b.dataset.action==='delete-note'){model.deleteNote(id);$('noteUndo').hidden=false;render();toast('demoSaved');}
      }catch(err){fail(err);}
    });
    translate();switchTab('tasks');
    return {model:model,dispose:function(){closeOverlay();}};
  }
  return {createModel:createModel,attach:attach,translations:translations};
});
