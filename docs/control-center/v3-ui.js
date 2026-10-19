'use strict';
/* Deep Focus Control Center 3: accessible controls; no repository write or app data access. */
(function(){
  if(typeof document==='undefined')return;
  const ops=globalThis.DeepFocusV3Core;
  const project=globalThis.DeepFocusControlCenter;
  const studio=globalThis.DeepFocusStudioUI;
  if(!ops||!project||!studio)return;
  const REPO='moaz76943-creator/zen-study-focus';
  const $=id=>document.getElementById(id);
  const text=(tag,value,cls)=>{
    const el=document.createElement(tag);
    if(cls)el.className=cls;
    if(value!==undefined)el.textContent=String(value);
    return el;
  };
  const replace=(id,items)=>$(id).replaceChildren(...items);
  const empty=message=>text('div',message,'v3-empty');
  const status=(id,message)=>{$(id).textContent=message;};
  function cleanUrl(value){
    try{
      const u=new URL(value);
      if(u.protocol!=='https:'||u.hostname!=='github.com'||!u.pathname.startsWith('/'+REPO+'/'))return null;
      return u.href;
    }catch{return null;}
  }
  function link(href,label){
    const a=text('a',label);
    a.href=cleanUrl(href)||('https://github.com/'+REPO+'/issues/13');
    a.target='_blank';a.rel='noopener noreferrer';
    return a;
  }
  function entry(title,description,href){
    const line=text('div',undefined,'v3-item'),body=text('div',undefined,'v3-text');
    body.append(text('strong',title),text('small',description));
    line.append(body);
    if(href)line.append(link(href,'فتح ↗'));
    return line;
  }
  function download(filename,body,mime){
    const object=new Blob([body],{type:mime});
    const url=URL.createObjectURL(object);
    const a=document.createElement('a');
    a.download=filename;a.href=url;document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  let snapshot=null, history=null, importedSnapshot=null, currentScreen='timer';
  function loadSnapshot(){
    snapshot=project.getSnapshot();
    renderSearch();
    renderTasks();
    renderMetrics();
    renderDelivery();
    renderRisks();
  }
  function taskSelection(){
    const list=snapshot&&Array.isArray(snapshot.tasks)?snapshot.tasks:[];
    return ops.sortTasks(ops.taskView(list,$('v3-task-view').value),$('v3-task-sort').value);
  }
  function renderTasks(){
    const list=taskSelection();
    status('v3-task-count',list.length+' مهمة في العرض المختار');
    replace('v3-task-results',list.length?list.slice(0,12).map(t=>entry(
      t.id+' · '+t.title,t.area+' · '+t.status+' · '+(t.evidence||''),
      'https://github.com/'+REPO+'/issues/13')):[
      empty('لم تتوفر مهام مطابقة، أو لم تُحمّل مصفوفة المهام بعد.')]);
  }
  function renderMetrics(){
    const areas=ops.areaMetrics(snapshot?.tasks||[]).slice(0,7);
    replace('v3-area-metrics',areas.length?areas.map(a=>{
      const root=text('div',undefined,'v3-area');
      const header=text('div',undefined,'v3-area-head');
      header.append(text('span',a.area),text('span',a.blocked+' محجوبة / '+a.total+' إجمالي'));
      const track=text('div',undefined,'v3-area-track');
      const fill=text('div',undefined,'v3-area-fill');
      fill.style.width=(100*a.blocked/a.total).toFixed(1)+'%';
      track.append(fill);root.append(header,track);return root;
    }):[empty('لا يوجد توزيع يمكن حسابه من المصدر الحالي.')]);
  }
  function renderSearch(){
    const q=$('v3-search').value.trim();
    if(!q){
      replace('v3-search-results',[]);
      $('v3-search').setAttribute('aria-expanded','false');return;
    }
    const results=ops.unifiedSearch(q,snapshot||{});
    replace('v3-search-results',results.length?results.slice(0,12).map(r=>{
      const isInternal=r.href.startsWith('#');
      const a=text('a',undefined,'v3-item');
      a.href=isInternal?r.href:(cleanUrl(r.href)||'#v3-workbench');
      if(!isInternal){a.target='_blank';a.rel='noopener noreferrer';}
      const title=text('div',undefined,'v3-text');
      title.append(text('strong',r.title),text('small',r.type+' · '+r.subtitle));
      a.append(title);return a;
    }):[empty('لا توجد نتائج مطابقة في البيانات المحملة.')]);
    $('v3-search').setAttribute('aria-expanded','true');
  }
  function renderDelivery(){
    const runs=snapshot?.runs||[],trend=ops.ciTrend(runs);
    const result=trend.successRate===null?'غير متاح':trend.successRate+'%';
    status('v3-ci-trend','نتائج SHA المعروض: '+result+' نجاح من '+trend.totalCompleted+
      ' تشغيلات مكتملة؛ '+trend.pending+' معلقة/غير محسومة');
    const failed=ops.failedRuns(runs).slice(0,8);
    replace('v3-ci-failures',failed.length?failed.map(run=>entry(
      run.name||'GitHub Action','فشل/انتهى الوقت · '+(run.conclusion||'unknown'),run.html_url)):
      [empty('لا توجد تشغيلات فاشلة ضمن النتائج المتاحة؛ لا يعني ذلك نجاح اختبارات الجهاز.')]);
    const pulls=ops.filterPulls(snapshot?.prs||[],$('v3-pr-filter').value,$('v3-pr-search').value).slice(0,12);
    const stale=new Set(ops.stalePulls(pulls,new Date().toISOString(),14).map(p=>p.number));
    replace('v3-prs',pulls.length?pulls.map(pr=>entry('#'+pr.number+' · '+pr.title,
      (pr.draft?'مسودة':'مفتوح')+(stale.has(pr.number)?' · دون تحديث لأكثر من 14 يومًا':''),
      pr.html_url)):[empty('لا توجد PR مطابقة أو بيانات GitHub غير متاحة.')]);
    const gates=ops.releaseChecklist({device_qa:'NOT_TESTED',ready_for_release:false});
    replace('v3-release-gates',gates.map(g=>{
      const row=text('div',undefined,'v3-gate');
      row.append(text('b',g.passed?'✓':'○'),text('span',g.label+' — يحتاج دليل اعتماد'));
      return row;
    }));
  }
  function renderRisks(){
    const audit=snapshot?.audit;
    const fresh=ops.auditFreshness(audit,snapshot?.inspected_ref);
    const message=fresh==='current'?'SHA التقرير يطابق SHA التكامل الحالي. هذا لا يعني موافقة الإصدار.':
      fresh==='stale'?'تحذير: التقرير المستورد يعود إلى SHA مختلف؛ أعد الفحص قبل الاعتماد.':
      'لم يتوفر تقرير فحص موثوق SHA للمقارنة.';
    status('v3-audit-freshness',message);
    $('v3-audit-freshness').classList.toggle('warning',fresh==='stale');
    const findings=ops.filterFindings(snapshot?.findings||[],$('v3-risk-filter').value);
    replace('v3-risks',findings.length?findings.slice(0,14).map(f=>entry(
      '['+f.severity+'] '+f.id+' · '+f.title,f.detail||f.remediation||'',null)):
      [empty('لا توجد نتائج في هذا المستوى؛ قد تحتاج لاستيراد تقرير health.json أولًا.')]);
    if(importedSnapshot){
      try{
        const change=ops.compareSnapshots(importedSnapshot,snapshot);
        status('v3-snapshot-result','مقارنة السجل السابق بالحالي: '+change.added+' مهام أضيفت، '+
          change.removed+' حُذفت، '+change.statusChanged+' تغيّرت حالتها. إجمالي سابق: '+
          change.oldCount+'، حالي: '+change.newCount+'. تتبع فروقات المصدر وليس تغير التطبيق على الجهاز.');
      }catch(e){status('v3-snapshot-result','تعذرت مقارنة السجل: '+e.message);}
    }
  }
  function onStudio(){
    const state=studio.getState();
    if(!state)return;
    currentScreen=state.screen;
    if(!history)history=ops.createHistory(state.current);
    else history=ops.historyPush(history,state.current);
    renderDesign();
  }
  function renderDesign(){
    const state=studio.getState();
    if(!state||!history){
      status('v3-design-status','محرر التصميم لم يجهز بعد.');return;
    }
    $('v3-undo').disabled=history.index===0;
    $('v3-redo').disabled=history.index===history.states.length-1;
    const differences=ops.configDiff(state.baseline,state.current);
    replace('v3-design-diff',differences.length?differences.map(d=>{
      return text('div',d.path+': '+d.before+' → '+d.after);
    }):[text('div','لا تغييرات معلقة على الإعدادات الأساسية.')]);
    status('v3-design-status',differences.length+' خاصية معدلة (مرحلة معاينة، ليست إصدارًا منشورًا).');
  }
  function bindEvents(){
    $('v3-search').addEventListener('input',renderSearch);
    document.addEventListener('keydown',e=>{
      const key=ops.shortcut(e);
      if(key==='search'){
        e.preventDefault();$('v3-search').focus();$('v3-search').scrollIntoView({block:'center'});
      }else if(key==='close'&&document.activeElement===$('v3-search')){
        $('v3-search').value='';renderSearch();$('v3-search').blur();
      }
    });
    for(const id of ['v3-task-view','v3-task-sort'])$(id).addEventListener('change',renderTasks);
    $('v3-task-export').addEventListener('click',()=>{
      download('deep-focus-tasks-filtered.csv','\uFEFF'+ops.tasksCSV(taskSelection()),'text/csv;charset=utf-8');
    });
    for(const id of ['v3-pr-filter','v3-pr-search'])$(id).addEventListener(
      id==='v3-pr-search'?'input':'change',renderDelivery);
    $('v3-risk-filter').addEventListener('change',renderRisks);
    $('v3-snapshot-import').addEventListener('change',async e=>{
      const file=e.target.files?.[0];
      if(!file)return;
      if(file.size>2000000){status('v3-snapshot-result','الملف أكبر من 2MB؛ تم الرفض.');return;}
      try{
        importedSnapshot=ops.validateSnapshot(JSON.parse(await file.text()));
        renderRisks();
      }catch(err){importedSnapshot=null;status('v3-snapshot-result','تقرير غير صالح: '+err.message);}
    });
    $('v3-theme-preset').addEventListener('change',()=>{
      const name=$('v3-theme-preset').value;
      if(!name)return;
      try{
        const s=studio.getState();
        if(!s)throw Error('محرر التصميم غير جاهز');
        studio.applyConfig(ops.applyThemePreset(s.current,name));
      }catch(e){status('v3-design-status',e.message);}
      $('v3-theme-preset').value='';
    });
    $('v3-undo').addEventListener('click',()=>{
      if(!history)return;
      history=ops.historyUndo(history);
      studio.applyConfig(history.value);
    });
    $('v3-redo').addEventListener('click',()=>{
      if(!history)return;
      history=ops.historyRedo(history);
      studio.applyConfig(history.value);
    });
    $('v3-reset-screen').addEventListener('click',()=>{
      const s=studio.getState();
      if(!s)return;
      studio.applyConfig(ops.resetScreen(s.current,s.baseline,s.screen));
    });
    $('v3-design-import').addEventListener('change',async e=>{
      const file=e.target.files?.[0];
      if(!file)return;
      if(file.size>20000){status('v3-design-status','الحد الأقصى لملف التصميم هو 20KB.');return;}
      try{
        const next=ops.importConfig(await file.text());
        studio.applyConfig(next);
        status('v3-design-status','تم استيراد التصميم إلى المعاينة فقط. راجع الفروق قبل إصدار PR.');
      }catch(err){status('v3-design-status','فشل الاستيراد: '+err.message);}
    });
  }
  function boot(){
    bindEvents();
    document.addEventListener('df:project-refreshed',loadSnapshot);
    document.addEventListener('df:studio-changed',onStudio);
    loadSnapshot();
    onStudio();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
