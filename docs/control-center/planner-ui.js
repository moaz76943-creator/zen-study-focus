'use strict';
/* Manual Codex/Gemini handoff composer. No token, remote write or model execution. */
(function(){
  if(typeof document==='undefined')return;
  const core=globalThis.DeepFocusPlannerCore,project=globalThis.DeepFocusControlCenter;
  if(!core||!project)return;
  const $=id=>document.getElementById(id);
  const el=(tag,message)=>{
    const node=document.createElement(tag);
    if(message!==undefined)node.textContent=String(message);
    return node;
  };
  let snapshot=null,selected=[],originSHA=null,visible=25,lastPlan=null;
  function status(message){$('planner-feedback').textContent=message;}
  function sourceState(){
    return !!snapshot&&snapshot.stale===false&&/^[0-9a-f]{40}$/i.test(snapshot.inspected_ref||'');
  }
  function tasks(){return snapshot&&Array.isArray(snapshot.tasks)?snapshot.tasks:[];}
  function setLaneFromArea(area){
    const lane=core.suggestLane(area);
    $('planner-lane').value=lane;
    const screens={NATURE_AUDIO:'sounds',COMPLETION_ALERTS:'timer',
      NOTES:'notes',TASKS:'tasks',ANALYTICS:'analytics',DESIGN:'timer'};
    $('planner-screen').value=screens[area]||'timer';
  }
  function selectedPlan(){
    if(!selected.length)throw Error('اختر مهمة واحدة على الأقل.');
    return core.buildPlan(tasks(),selected,{
      lane:$('planner-lane').value,screen:$('planner-screen').value,
      sha:snapshot?.inspected_ref||null,stale:!sourceState()
    });
  }
  function updatePlan(){
    $('planner-count').textContent=selected.length+' / '+core.MAX_TASKS+' مهام مختارة';
    const preview=$('planner-preview'),issue=$('planner-issue');
    issue.setAttribute('aria-disabled','true');
    issue.removeAttribute('target');
    issue.href='#agent-planner';
    lastPlan=null;
    try{
      const plan=selectedPlan();
      lastPlan=plan;preview.value=plan.markdown;
      $('planner-copy').disabled=false;$('planner-download').disabled=false;
      try{
        issue.href=core.issueUrl(plan);
        issue.target='_blank';issue.rel='noopener noreferrer';
        issue.setAttribute('aria-disabled','false');
        status('الدفعة جاهزة للمراجعة على SHA حي. زر Issue يفتح مسودة في GitHub؛ لا يبدأ أي وكيل تلقائيًا.');
      }catch(e){
        status('الدفعة قابلة للنسخ والتنزيل فقط: '+e.message);
      }
    }catch(e){
      preview.value='';$('planner-copy').disabled=true;$('planner-download').disabled=true;
      status(e.message);
    }
  }
  function filtered(){
    const query=$('planner-search').value.trim().toLocaleLowerCase().slice(0,100);
    const area=$('planner-area').value;
    const mode=$('planner-status-filter').value;
    return tasks().filter(t=>(area==='ALL'||t.area===area)&&
      (mode==='all'||(mode==='blocked'?t.status==='BLOCKED':
        ['BLOCKED','IN_PROGRESS','TODO'].includes(t.status)))&&
      (!query||[t.id,t.area,t.title].some(v=>String(v).toLocaleLowerCase().includes(query))));
  }
  function renderTasks(){
    const list=filtered(),box=$('planner-task-list'),children=[];
    for(const task of list.slice(0,visible)){
      const row=el('div');row.className='planner-task';
      if(selected.includes(task.id))row.classList.add('selected');
      const body=el('div');body.className='planner-task-main';
      body.append(el('strong',task.id),el('small',task.area+' · '+task.status),el('p',task.title));
      const button=el('button',selected.includes(task.id)?'إلغاء':'اختيار');
      button.type='button';button.setAttribute('aria-pressed',selected.includes(task.id)?'true':'false');
      button.setAttribute('aria-label',(selected.includes(task.id)?'إلغاء اختيار':'اختيار')+' مهمة '+task.id);
      const activeArea=tasks().find(x=>x.id===selected[0])?.area||null;
      const otherArea=!!activeArea&&activeArea!==task.area&&!selected.includes(task.id);
      button.disabled=otherArea||(selected.length>=core.MAX_TASKS&&!selected.includes(task.id));
      if(otherArea)button.title='اختر مهام من المجال نفسه حتى لا تتداخل أعمال الوكلاء';
      button.addEventListener('click',()=>{
        try{
          const first=!selected.length;
          selected=core.selectTask(selected,task.id,tasks());
          if(first&&selected.length)setLaneFromArea(task.area);
          renderTasks();updatePlan();
        }catch(e){status(e.message);}
      });
      row.append(body,button);children.push(row);
    }
    if(!children.length)children.push(el('p','لا توجد مهام مطابقة أو لم تُحمَّل مصفوفة الاستعادة بعد.'));
    box.replaceChildren(...children);
    const more=$('planner-show-more');
    more.disabled=visible>=list.length;
    more.textContent=more.disabled?'جميع النتائج ظاهرة':'عرض المزيد ('+(list.length-visible)+' متبقية)';
  }
  function sync(){
    let newSnapshot;
    try{newSnapshot=project.getSnapshot();core.validateTasks(newSnapshot.tasks||[]);}
    catch(e){status('تعذر قراءة مصفوفة المهام: '+e.message);return;}
    const incomingSHA=newSnapshot.inspected_ref||null;
    const changed=originSHA!==incomingSHA&&selected.length>0;
    selected=core.retainSelection(selected,originSHA,incomingSHA,newSnapshot.tasks||[]);
    originSHA=incomingSHA;snapshot=newSnapshot;
    const trusted=sourceState();
    const prefix=trusted?'مصدر GitHub حي مثبت: ':'لقطة ثابتة/بيانات جزئية (غير معتمدة): ';
    $('planner-source-status').textContent=prefix+
      (trusted?incomingSHA.slice(0,12):'UNVERIFIED_OFFLINE')+
      ' · '+tasks().length+' مهمة'+(changed?' · أُزيلت المهام المختارة لأن SHA تغيّر.':'');
    renderTasks();updatePlan();
  }
  function downloadPlan(){
    if(!lastPlan)return;
    const data=new Blob([lastPlan.markdown],{type:'text/markdown;charset=utf-8'});
    const url=URL.createObjectURL(data),a=el('a');
    a.href=url;a.download='deep-focus-agent-plan-'+lastPlan.ids.join('-')+'.md';
    document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1200);
    status('تم تجهيز ملف التكليف. صدّره إلى الوكيل بعد مراجعة جميع القيود.');
  }
  function boot(){
    if(!$('agent-planner'))return;
    const area=$('planner-area');
    const choices=core.AREAS.map(name=>{
      const opt=el('option',name);opt.value=name;return opt;
    });
    area.append(...choices);
    $('planner-search').addEventListener('input',()=>{visible=25;renderTasks();});
    $('planner-status-filter').addEventListener('change',()=>{visible=25;renderTasks();});
    area.addEventListener('change',()=>{visible=25;renderTasks();if(!selected.length)setLaneFromArea(area.value);updatePlan();});
    for(const id of ['planner-lane','planner-screen'])$(id).addEventListener('change',updatePlan);
    $('planner-show-more').addEventListener('click',()=>{visible+=25;renderTasks();});
    $('planner-clear').addEventListener('click',()=>{selected=[];renderTasks();updatePlan();});
    $('planner-recommend').addEventListener('click',()=>{
      try{
        const recommended=core.recommendTasks(tasks(),{area:area.value,limit:4});
        selected=recommended.map(t=>t.id);
        if(recommended.length)setLaneFromArea(recommended[0].area);
        renderTasks();updatePlan();
        if(!recommended.length)status('لم تُعثر على مهام مفتوحة ضمن المجال المختار.');
      }catch(e){status(e.message);}
    });
    $('planner-copy').addEventListener('click',async()=>{
      try{
        if(!lastPlan)throw Error('No plan');
        if(!navigator.clipboard||typeof navigator.clipboard.writeText!=='function')
          throw Error('النسخ غير متاح؛ استخدم زر تنزيل Markdown.');
        await navigator.clipboard.writeText(lastPlan.markdown);
        status('تم نسخ التكليف. ألصقه لدى Codex/Gemini بعد مراجعته؛ لم يبدأ أي وكيل من هذه اللوحة.');
      }catch(e){status('تعذر النسخ: '+e.message);}
    });
    $('planner-download').addEventListener('click',downloadPlan);
    $('planner-issue').addEventListener('click',e=>{
      if($('planner-issue').getAttribute('aria-disabled')==='true'){
        e.preventDefault();
        status('إنشاء Issue غير متاح دون SHA حيّ مؤكد أو إذا تجاوز التكليف طول رابط GitHub. استخدم تنزيل Markdown.');
      }
    });
    document.addEventListener('df:project-refreshed',sync);
    sync();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
