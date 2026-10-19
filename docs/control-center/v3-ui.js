'use strict';
/* Read-only UI for V3 source data and reversible local design previews.
 * Never writes to user data, GitHub, native application storage, or a release.
 */
(function () {
  if (typeof document === 'undefined') return;
  const core = globalThis.DeepFocusV3Core;
  const api = globalThis.DeepFocusControlCenter;
  if (!core || !api) return;
  const $ = id => document.getElementById(id);
  const el = (tag, value, className) => {
    const n = document.createElement(tag);
    if (value != null) n.textContent = String(value);
    if (className) n.className = className;
    return n;
  };
  const render = (id, list, empty) => {
    const host = $(id);
    if (!host) return;
    host.replaceChildren(...(list.length ? list : [el('p', empty, 'v3-note')]));
  };
  const fileDownload = (filename, text, mime) => {
    const url = URL.createObjectURL(new Blob([text], {type:mime}));
    const a = el('a'); a.href = url; a.download = filename;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const safeGitHubHref = value => {
    try {
      const u = new URL(value);
      if (u.protocol !== 'https:' || u.hostname !== 'github.com') return null;
      return u.href;
    } catch (_) { return null; }
  };
  const item = (heading, subtext, href) => {
    const result = el('div', null, 'v3-item');
    const target = safeGitHubHref(href);
    const title = target ? el('a', heading) : el('strong', heading);
    if (target) { title.href=target; title.target='_blank'; title.rel='noopener noreferrer'; }
    result.append(title);
    if (subtext) result.append(el('small', subtext));
    return result;
  };
  let snapshot = null, history = null, baseline = null;
  const current = () => {
    try { return api.getSnapshot(); }
    catch (_) { return null; }
  };
  function drawSearch() {
    const q = $('v3-search').value.trim();
    const results = q && snapshot ? core.unifiedSearch(q,snapshot) : [];
    const host = $('v3-search-results');
    render('v3-search-results', results.map(r => item(r.title, r.type+' · '+r.subtitle, r.href)), q ? 'لا توجد نتائج' : '');
    host.hidden = !q; $('v3-search').setAttribute('aria-expanded',q ? 'true' : 'false');
  }
  function drawTasks() {
    if (!snapshot) return;
    const tasks = core.sortTasks(core.taskView(snapshot.tasks||[],$('v3-task-view').value),$('v3-task-sort').value);
    $('v3-task-count').textContent = tasks.length + ' / ' + (snapshot.tasks||[]).length + ' مهمة';
    render('v3-task-results', tasks.slice(0,60).map(t=>item(t.id+' · '+t.title, t.status+' · '+t.area, '#tasks')), 'لا توجد مهام ضمن هذا العرض');
    render('v3-area-metrics',core.areaMetrics(snapshot.tasks||[]).slice(0,12).map(a=>el('div',a.area+' · '+a.total+' · محجوب '+a.blocked)), 'لا تتوفر بيانات الأقسام');
  }
  function drawCI() {
    if (!snapshot) return;
    const trend=core.ciTrend(snapshot.runs||[]);
    $('v3-ci-trend').textContent = 'ناجح '+trend.passed+' · فاشل '+trend.failed+' · معلق '+trend.pending+' · نسبة نجاح '+(trend.successRate===null?'غير متاحة':trend.successRate+'%');
    render('v3-ci-failures',core.failedRuns(snapshot.runs||[]).slice(0,8).map(r=>item(r.name||'Workflow',r.conclusion,safeGitHubHref(r.html_url))), 'لا توجد نتائج فشل ضمن البيانات التي أُحضرت');
    const pulls=core.filterPulls(snapshot.prs||[],$('v3-pr-filter').value,$('v3-pr-search').value);
    render('v3-prs',pulls.slice(0,30).map(p=>item('PR #'+p.number+' · '+p.title,p.draft?'مسودة':'مفتوح',p.html_url)),'لا توجد طلبات مطابقة');
    const gates=core.releaseChecklist({});
    render('v3-release-gates',gates.map(g=>el('p',(g.passed?'PASS':'BLOCKED')+' · '+g.label)), 'بوابات الإصدار غير متاحة');
  }
  function drawRisks() {
    if (!snapshot) return;
    const findings=core.filterFindings(snapshot.findings||[],$('v3-risk-filter').value);
    render('v3-risks',findings.slice(0,30).map(f=>item(f.title||f.id, f.severity+' · '+(f.detail||''),null)),'لا يتوفر تقرير مخاطر مستورد');
    const report=snapshot.audit;
    $('v3-audit-freshness').textContent='حالة التقرير: '+core.auditFreshness(report,snapshot.inspected_ref);
  }
  function getStudio() { return globalThis.DeepFocusStudioUI; }
  function syncHistory() {
    const studio=getStudio();
    const info=studio&&studio.getState();
    if(!info)return false;
    if(!baseline){ baseline=info.baseline; history=core.createHistory(info.current); }
    if(history&&JSON.stringify(history.value)!==JSON.stringify(info.current))history=core.historyPush(history,info.current);
    const changes=core.configDiff(baseline,info.current);
    render('v3-design-diff',changes.map(c=>el('p',c.path+': '+c.before+' → '+c.after)),'لم تُسجل تغييرات في التصميم');
    return true;
  }
  function notice(msg) { $('v3-design-status').textContent=msg; }
  function edit(action) {
    const studio=getStudio();
    if (!studio||!syncHistory()) {notice('محرر التصميم لم يجهز بعد');return;}
    try {
      const info=studio.getState();
      if(action==='undo')history=core.historyUndo(history);
      else if(action==='redo')history=core.historyRedo(history);
      else if(action==='reset')history=core.historyPush(history,core.resetScreen(info.current,info.baseline,info.screen));
      else if(action.startsWith('preset:'))history=core.historyPush(history,core.applyThemePreset(info.current,action.slice(7)));
      studio.applyConfig(history.value);
      syncHistory();
      notice('تم تحديث المعاينة المحلية فقط؛ لم يُحفظ أي تغيير في المستودع.');
    } catch (error) {notice('تعذر تعديل المعاينة: '+error.message);}
  }
  async function importFile(input,max,handler) {
    const file=input.files&&input.files[0];
    if (!file) return;
    if (file.size>max) throw Error('حجم الملف أكبر من المسموح');
    const raw=await file.text();
    await handler(raw);
    input.value='';
  }
  function refresh() {
    snapshot=current();
    if(!snapshot){$('v3-connection').textContent='لم تصل بيانات GitHub بعد';return;}
    $('v3-connection').textContent=snapshot.inspected_ref?'مصدر البيانات: '+snapshot.inspected_ref.slice(0,12):'SHA غير متاح — معلومات جزئية';
    drawTasks(); drawCI(); drawRisks(); drawSearch(); syncHistory();
  }
  function boot() {
    if(!$('v3-workbench'))return;
    for(const x of ['v3-task-view','v3-task-sort'])$(x).addEventListener('change',drawTasks);
    for(const x of ['v3-pr-filter','v3-pr-search'])$(x).addEventListener(x==='v3-pr-filter'?'change':'input',drawCI);
    $('v3-risk-filter').addEventListener('change',drawRisks);
    $('v3-search').addEventListener('input',drawSearch);
    document.addEventListener('keydown',event=>{
      const cmd=core.shortcut(event);
      if(cmd==='search'){event.preventDefault();$('v3-search').focus();$('v3-search').select();}
      if(cmd==='close'){$('v3-search').value='';drawSearch();}
    });
    $('v3-task-export').addEventListener('click',()=>{
      if(!snapshot||!Array.isArray(snapshot.tasks)){notice('لا توجد بيانات مصدقة للتصدير');return;}
      fileDownload('deep-focus-task-ledger.csv',core.tasksCSV(snapshot.tasks),'text/csv;charset=utf-8');
    });
    $('v3-theme-preset').addEventListener('change',event=>{if(event.target.value)edit('preset:'+event.target.value);});
    $('v3-undo').addEventListener('click',()=>edit('undo'));
    $('v3-redo').addEventListener('click',()=>edit('redo'));
    $('v3-reset-screen').addEventListener('click',()=>edit('reset'));
    $('v3-design-import').addEventListener('change',event=>{
      importFile(event.target,20000,raw=>{
        const studio=getStudio(); if(!studio||!syncHistory())throw Error('محرر التصميم غير جاهز');
        const data=core.importConfig(raw);
        history=core.historyPush(history,data);studio.applyConfig(history.value);syncHistory();
        notice('تم استيراد التصميم للمعاينة المحلية فقط');
      }).catch(e=>notice('استيراد مرفوض: '+e.message));
    });
    $('v3-snapshot-import').addEventListener('change',event=>{
      importFile(event.target,2000000,raw=>{
        const older=core.validateSnapshot(JSON.parse(raw));
        if(!snapshot)throw Error('البيانات الحالية غير متاحة');
        const diff=core.compareSnapshots(older,core.validateSnapshot(snapshot));
        $('v3-snapshot-result').textContent='مضاف: '+diff.added+' · محذوف: '+diff.removed+' · تغيرت الحالة: '+diff.statusChanged+' · سجل سابق '+diff.oldCount+' / حالي '+diff.newCount;
      }).catch(e=>$('v3-snapshot-result').textContent='تعذر مقارنة التقارير: '+e.message);
    });
    document.addEventListener('df:project-refreshed', refresh);
    refresh();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
