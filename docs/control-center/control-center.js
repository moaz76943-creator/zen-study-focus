'use strict';
/* Public GitHub read-only control center. No credentials and no application storage access. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof document !== 'undefined' && document.getElementById('overview')) api.boot();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const REPO = 'moaz76943-creator/zen-study-focus';
  const API = 'https://api.github.com/repos/' + REPO;
  const ISSUE = 'https://github.com/' + REPO + '/issues/13';
  const SOURCE_FILE = '/docs/recovery_integration/FINAL_MATRIX_161.md';
  const STATUSES = ['BLOCKED','IN_PROGRESS','TODO','TESTED','DEFERRED'];
  let state = {tasks:[], prs:null, runs:null, head:null, sync:null, audit:null, errors:[], visible:25};

  function parseTasks(markdown) {
    const seen = new Set(), tasks = [];
    for (const line of String(markdown || '').split(/\r?\n/)) {
      const fields = line.split('|').map(s => s.trim());
      if (fields.length < 7 || !/^DF-\d{3}$/.test(fields[1] || '')) continue;
      const [id,status,area,title,evidence] = fields.slice(1,6);
      if (seen.has(id)) continue;
      seen.add(id);
      tasks.push({id,status,area,title:title.replace(/<[^>]*>/g,''),evidence});
    }
    return tasks;
  }
  function countTasks(tasks) {
    const counts = {total:tasks.length, BLOCKED:0,TESTED:0,IN_PROGRESS:0,TODO:0,DEFERRED:0};
    for(const t of tasks) if(Object.prototype.hasOwnProperty.call(counts,t.status))counts[t.status]++;
    return counts;
  }
  function filterTasks(tasks, term, status, area) {
    const q=String(term||'').trim().toLowerCase();
    return tasks.filter(t =>
      (!q || [t.id,t.title,t.area,t.evidence].join(' ').toLowerCase().includes(q)) &&
      (!status || status==='ALL' || status===t.status) &&
      (!area || area==='ALL' || area===t.area)
    ).sort((a,b)=>{
      const ra=STATUSES.indexOf(a.status),rb=STATUSES.indexOf(b.status);
      return (ra<0?9:ra)-(rb<0?9:rb)||a.id.localeCompare(b.id,'en');
    });
  }
  function repairPrompt(tasks, sha) {
    const target = /^[0-9a-f]{40}$/i.test(sha||'')?sha:'لم يُتحقق من SHA؛ افحصه أولًا';
    const open = tasks.length===1 ? tasks : filterTasks(tasks,'','BLOCKED','ALL').slice(0,12);
    return [
      '# DEEP FOCUS — SAFE REMEDIATION BATCH',
      'Repository: '+REPO,
      'Integration reference SHA: '+target,
      'Open PR #25 and issue #13; compare their live heads before writing.',
      'Prioritize these BLOCKED entries, reproduce each defect with tests before applying focused fixes:',
      ...open.map(t=>t.id+' ['+t.area+']: '+t.title+' | acceptance gap: '+t.evidence),
      'Mandatory: preserve all v21 keys (zen_fortress_cfg_v21, zen_fortress_notes_v21, zen_fortress_tasks_v21), ZEN21:: backups, 20 UI languages, authored text, and western numeric UI.',
      'Do NOT force-push, merge, auto-sign, edit unrelated shared files, replace unlicensed nature audio, or claim device tests without real Android evidence.',
      'For each finding: affected file, root cause, minimal patch, regression test, exact SHA, reproducible PASS/FAIL/NOT_TESTED.',
      'Create a separate reviewable PR rather than editing protected main.'
    ].join('\n');
  }
  function byId(id) { return document.getElementById(id); }
  function node(tag,className,content) {
    const e=document.createElement(tag);
    if(className)e.className=className;
    if(content!==undefined)e.textContent=String(content);
    return e;
  }
  function replace(element,children) {element.replaceChildren(...children);}
  function shortSHA(sha) {return /^[0-9a-f]{40}$/i.test(sha||'')?sha.slice(0,12):'غير متاح';}
  function safeLink(value) {
    try {const u=new URL(value);return u.protocol==='https:'&&u.hostname==='github.com'&&u.pathname.startsWith('/'+REPO+'/')?u.href:null;}
    catch {return null;}
  }
  function setNotice(message) {byId('action-notice').textContent=message;}
  async function getJSON(endpoint) {
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),14000);
    try {
      const res=await fetch(API+endpoint,{signal:controller.signal,credentials:'omit',
        headers:{Accept:'application/vnd.github+json'},cache:'no-store'});
      if(!res.ok)throw Error('GitHub HTTP '+res.status+(res.status===403?' (rate limit or access denied)':''));
      return await res.json();
    } finally {clearTimeout(timer);}
  }
  async function getLedger(sha) {
    if(!/^[0-9a-f]{40}$/i.test(sha||''))throw Error('Unverified ref SHA');
    const c=new AbortController(),timer=setTimeout(()=>c.abort(),14000);
    try {
      const response=await fetch('https://raw.githubusercontent.com/'+REPO+'/'+sha+SOURCE_FILE,
        {credentials:'omit',signal:c.signal,cache:'no-store'});
      if(!response.ok)throw Error('Recovery ledger HTTP '+response.status);
      return parseTasks(await response.text());
    } finally {clearTimeout(timer);}
  }
  function renderMetrics() {
    const c=countTasks(state.tasks);
    byId('stat-total').textContent=state.tasks.length?String(c.total):'—';
    byId('stat-blocked').textContent=state.tasks.length?String(c.BLOCKED):'—';
    byId('stat-tested').textContent=state.tasks.length?String(c.TESTED):'—';
    byId('stat-prs').textContent=state.prs?String(state.prs.length):'—';
    byId('head-sha').textContent=shortSHA(state.head);
    byId('last-sync').textContent=state.sync?new Date(state.sync).toLocaleString('en-GB',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit',year:'numeric'}):'—';
  }
  function riskCard(finding,link) {
    const article=node('article','risk-item '+(finding.severity||'warning'));
    const top=node('div','risk-head');
    top.append(node('small','',finding.id||'QUALITY'),node('small','',String(finding.severity||'warning').toUpperCase()));
    article.append(top,node('strong','',finding.title||'Risk'),node('p','',finding.detail||''));
    if(finding.remediation)article.append(node('small','',finding.remediation));
    const a=node('a','', 'فتح دليل المهام ↗');a.href=link||ISSUE;a.target='_blank';a.rel='noopener noreferrer';article.append(a);
    return article;
  }
  function renderRisks() {
    const target=byId('risk-list');
    if(state.audit) {
      const findings=Array.isArray(state.audit.findings)?state.audit.findings:[];
      replace(target,findings.length?findings.slice(0,12).map(f=>riskCard(f,ISSUE)):[
        node('div','empty','التقرير المستورد لا يحتوي على نتائج. لا يعتبر ذلك اعتمادًا للإصدار.')]);
      return;
    }
    if(!state.tasks.length) {
      replace(target,[node('div','empty','تعذر تحميل المخاطر من سجل المهام. افتح GitHub أو استورد تقرير تدقيق.')]);
      return;
    }
    const blocked=state.tasks.filter(t=>t.status==='BLOCKED');
    const areas=new Map();
    for(const t of blocked)areas.set(t.area,(areas.get(t.area)||0)+1);
    const risks=[...areas.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6).map(([area,n])=>({
      id:area,severity:'warning',title:area+' — '+n+' مهمة محجوبة',
      detail:'هذا العدد مأخوذ من حالة BLOCKED في ملف الاستعادة؛ لا يثبت وحده وجود خطأ تشغيلي.',
      remediation:'افتح المهام المرتبطة وحدد الاختبارات والأدلة المطلوبة قبل اعتمادها.'
    }));
    if(!risks.length)risks.push({id:'LEDGER',title:'لا توجد مهام محجوبة في السجل الحالي',
      detail:'افحص نتائج Android والوسائط والتراخيص على حدة؛ غياب BLOCKED ليس موافقة إصدار.'});
    replace(target,risks.map(r=>riskCard(r,ISSUE)));
  }
  function fillAreas(){
    const select=byId('area-filter'),selected=select.value;
    const items=[node('option','', 'جميع المجالات')];items[0].value='ALL';
    const areas=[...new Set(state.tasks.map(x=>x.area))].sort();
    for(const a of areas){const opt=node('option','',a);opt.value=a;items.push(opt);}
    replace(select,items);select.value=areas.includes(selected)?selected:'ALL';
  }
  function taskCard(t) {
    const box=node('article','task-item');
    box.append(node('span','task-id',t.id));
    const detail=node('div','');
    const status=node('div','status-pill '+t.status.toLowerCase(),t.status);
    detail.append(status,node('div','task-title',t.title),node('div','task-evidence',t.area+' · '+t.evidence));
    const button=node('button','task-copy','نسخ طلب الإصلاح');
    button.type='button';button.addEventListener('click',()=>copyText(repairPrompt([t],state.head)));
    box.append(detail,button);return box;
  }
  function renderTasks() {
    const filtered=filterTasks(state.tasks,byId('search').value,byId('status-filter').value,byId('area-filter').value);
    const shown=filtered.slice(0,state.visible);
    byId('task-count').textContent=state.tasks.length?shown.length+' / '+filtered.length+' من أصل '+state.tasks.length:'غير متاح';
    replace(byId('task-list'),shown.length?shown.map(taskCard):[
      node('div','empty',state.tasks.length?'لا توجد مهام تطابق التصفية.':'مصفوفة المهام غير متاحة حاليًا.')]);
    byId('show-more').hidden=filtered.length<=shown.length;
  }
  function renderRuns(){
    const items=(Array.isArray(state.runs)?state.runs:[]).slice(0,7).map(run=>{
      const a=node('a','compact-row');const url=safeLink(run.html_url);a.href=url||('https://github.com/'+REPO+'/actions');a.target='_blank';a.rel='noopener noreferrer';
      const conclusion=run.conclusion||run.status||'unknown';
      a.append(node('span','mark '+conclusion));
      const content=node('span','text');
      content.append(node('strong','',run.name||'GitHub workflow'),
        node('small','',conclusion+' · '+(run.event||'')+' · '+shortSHA(run.head_sha)));
      a.append(content,node('em','','↗'));return a;
    });
    replace(byId('ci-list'),items.length?items:[node('div','empty','لم تظهر تشغيلات على SHA المرجعي ضمن النتائج المتاحة؛ هذا لا يعني أن الاختبارات نجحت.')]);
  }
  function renderPRs() {
    const items=(Array.isArray(state.prs)?state.prs:[]).slice(0,8).map(pr=>{
      const a=node('a','compact-row');a.href=safeLink(pr.html_url)||('https://github.com/'+REPO+'/pulls');
      a.target='_blank';a.rel='noopener noreferrer';
      a.append(node('span','mark '+(pr.draft?'in_progress':'success')));
      const content=node('span','text');
      content.append(node('strong','','#'+pr.number+' · '+pr.title),
        node('small','',pr.draft?'مسودة · مراجعة مطلوبة':'مفتوح للمراجعة'));
      a.append(content,node('em','','↗'));return a;
    });
    replace(byId('pr-list'),items.length?items:[node('div','empty','لا توجد طلبات دمج مفتوحة أو تعذّر تحميل القائمة.')]);
  }
  async function refresh() {
    const btn=byId('refresh');btn.disabled=true;byId('connection').textContent='جاري تحديث البيانات...';
    state.tasks=[];state.prs=null;state.runs=null;state.head=null;state.sync=null;
    const errors=[];
    try {
      const pr=await getJSON('/pulls/25');
      const sha=pr.head&&pr.head.sha;
      if(!/^[0-9a-f]{40}$/i.test(sha||''))throw Error('PR #25 head SHA is unavailable');
      state.head=sha;
      const results=await Promise.allSettled([
        getLedger(sha),getJSON('/pulls?state=open&per_page=100'),getJSON('/actions/runs?head_sha='+sha+'&per_page=30')
      ]);
      const names=['Recovery ledger','Open pull requests','GitHub Actions'];
      for(let i=0;i<results.length;i++){
        const r=results[i];
        if(r.status==='rejected'){errors.push(names[i]+': '+r.reason.message);continue;}
        if(i===0)state.tasks=r.value;
        if(i===1)state.prs=r.value;
        if(i===2)state.runs=r.value.workflow_runs||[];
      }
      state.sync=new Date().toISOString();
    } catch(e) {errors.push('PR #25: '+e.message);}
    state.errors=errors;
    byId('connection').textContent=errors.length?('بيانات جزئية · '+errors.join(' | ')):'متصل · آخر بيانات GitHub المتاحة';
    btn.disabled=false;
    fillAreas();renderMetrics();renderRisks();renderTasks();renderRuns();renderPRs();
    document.dispatchEvent(new CustomEvent('df:project-refreshed'));
  }
  async function copyText(value) {
    try {
      if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(value);
      else {
        const t=node('textarea','',value);t.style.position='fixed';t.style.opacity='0';
        document.body.append(t);t.select();
        if(!document.execCommand('copy'))throw Error('Clipboard unavailable');
        t.remove();
      }
      setNotice('نُسخت التعليمات. راجعها قبل إرسالها أو تنفيذها.');
    }catch(e){setNotice('تعذر النسخ تلقائيًا؛ افتح اللوحة عبر HTTPS واسمح باستخدام الحافظة.');}
  }
  function exportData() {
    const data={
      schema_version:1,source:'GitHub public API and PR #25 recovery ledger',
      exported_at:new Date().toISOString(),inspected_ref:state.head,
      partial_sources:state.errors,device_qa:'NOT_TESTED',
      tasks:state.tasks, prs:(state.prs||[]).map(p=>({number:p.number,title:p.title,html_url:p.html_url,draft:p.draft})),
      workflows:(state.runs||[]).map(r=>({id:r.id,name:r.name,status:r.status,conclusion:r.conclusion,head_sha:r.head_sha,html_url:r.html_url})),
      imported_audit:state.audit
    };
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=node('a');
    a.href=url;a.download='deep-focus-control-center.json';document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    setNotice('تم تجهيز تصدير JSON؛ تحقّق من وقت ومصدر البيانات.');
  }
  async function importAudit(file) {
    if(!file)return;
    if(file.size>2_000_000) {byId('audit-label').textContent='الملف كبير جدًا (الحد 2MB).';return;}
    try {
      const payload=JSON.parse(await file.text());
      if(payload.schema_version!==1||!Array.isArray(payload.findings)||
        !payload.totals||payload.verification!=='STATIC_SOURCE_ONLY')throw Error('Invalid schema');
      state.audit=payload;
      byId('audit-label').textContent='تقرير مستورد محليًا · '+(payload.generated_at||'وقت غير معروف')+
        ' · '+payload.findings.length+' نتيجة · SHA: '+shortSHA(payload.inspected_ref);
      const children=payload.findings.map(f=>{
        const line=node('article','audit-line');
        line.append(node('strong','',String(f.severity).toUpperCase()+' · '+f.id+' — '+f.title),
          node('div','',f.detail),node('small','',f.remediation||''));
        return line;
      });
      replace(byId('audit-findings'),children.length?children:[node('div','empty','لا توجد نتائج ضمن هذا الملف.')]);
      renderRisks();
      document.dispatchEvent(new CustomEvent('df:project-refreshed'));
    }catch(e){byId('audit-label').textContent='تعذر فتح الملف: التقرير غير صالح أو غير متوافق.';}
  }
  function boot() {
    byId('refresh').addEventListener('click',refresh);
    for(const id of ['search','status-filter','area-filter'])byId(id).addEventListener(
      id==='search'?'input':'change',()=>{state.visible=25;renderTasks();});
    byId('show-more').addEventListener('click',()=>{state.visible+=25;renderTasks();});
    byId('copy-prompt').addEventListener('click',()=>copyText(repairPrompt(state.tasks,state.head)));
    byId('export-data').addEventListener('click',exportData);
    byId('audit-file').addEventListener('change',e=>importAudit(e.target.files[0]));
    refresh();
  }
  function getSnapshot(){
    return JSON.parse(JSON.stringify({schema_version:1,inspected_ref:state.head,tasks:state.tasks,
      prs:state.prs||[],runs:state.runs||[],findings:state.audit?.findings||[],
      audit:state.audit,sync:state.sync,errors:state.errors}));
  }
  return {boot,parseTasks,countTasks,filterTasks,repairPrompt,shortSHA,getSnapshot};
});
