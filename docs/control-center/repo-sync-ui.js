'use strict';
/* Source-pinned, read-only live GitHub repository diagnostics; no secrets or write actions. */
(function(){
  if(typeof document==='undefined')return;
  const core=globalThis.DeepFocusRepoSyncCore;
  if(!core)return;
  const REPO=core.REPO, API='https://api.github.com/repos/'+REPO;
  const $=id=>document.getElementById(id);
  const node=(tag,value,cls)=>{
    const el=document.createElement(tag);
    if(cls)el.className=cls;
    if(value!==undefined)el.textContent=String(value);
    return el;
  };
  const label={PASS:'PASS',FAIL:'FAIL',RUNNING:'RUNNING',NOT_VERIFIED:'NOT VERIFIED'};
  let busy=false,model=null;
  function link(href,title){
    const a=node('a',title,'repo-sync-link');
    const allowed=core.trustedGitHubUrl(href);
    a.href=allowed||('https://github.com/'+REPO);
    a.rel='noopener noreferrer';a.target='_blank';
    return a;
  }
  function endpoint(path){
    const url=API+path;
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
    return fetch(url,{signal:controller.signal,credentials:'omit',cache:'no-store',
      headers:{Accept:'application/vnd.github+json'}}).then(async response=>{
      if(!response.ok)throw Error('GitHub '+response.status+
        (response.status===403||response.status===429?' · حد الطلبات أو منع الوصول':''));
      return response.json();
    }).finally(()=>clearTimeout(timeout));
  }
  function message(text){$('repo-sync-status').textContent=text;}
  function tile(pr){
    const div=node('article',undefined,'repo-sync-card');
    if(!pr){
      div.append(node('strong','تعذر التحقق من PR'),node('small','المصدر غير متاح حاليًا'));
      return div;
    }
    div.append(node('strong','PR #'+pr.number+(pr.number===25?' · تكامل التطبيق':pr.number===70?' · إصلاح Android P0':' · لوحة التحكم')),
      node('small','HEAD '+(pr.number===70?pr.sha:pr.sha.slice(0,12))),
      node('small','PR '+(pr.draft?'DRAFT':'READY')+' · مصدر GitHub حي'),
      node('small','BASE '+pr.baseSha.slice(0,12)),
      node('span',label[pr.ci.status]||'NOT VERIFIED','repo-sync-chip status-'+pr.ci.status.toLowerCase()),
      node('small','نتائج تشغيلات SHA الحالي: '+pr.ci.count));
    const buttons=node('div',undefined,'repo-sync-actions');
    buttons.append(link(pr.url,'فتح PR ↗'));
    if(pr.ci.url)buttons.append(link(pr.ci.url,'فحص CI ↗'));
    div.append(buttons);return div;
  }

  // Track 04: distinguish live GitHub refs from dated test/audit evidence.
  function renderTrack04(){
    const parent=$('repo-sync-cards');
    if(!parent)return;
    let root=$('repo-sync-recovery');
    if(!root){
      root=node('div',undefined,'repo-sync-recovery');
      root.id='repo-sync-recovery';
      root.setAttribute('aria-label','أدلة Android واللغات والصوت والأمان');
      parent.insertAdjacentElement('afterend',root);
    }
    const state=model.pr70Verified?'LIVE_GITHUB':'NOT_VERIFIED';
    const heading=node('div',undefined,'repo-sync-toolbar');
    heading.append(node('strong','TRACK 04 · حالة الاسترداد'),
      node('small','GitHub: '+state+' · نتائج التدقيق: SNAPSHOT 2026-10-20'));
    root.replaceChildren(heading);
    const details=node('div',undefined,'repo-sync-grid');
    const card=(title,summary,source,status)=>{
      const el=node('article',undefined,'repo-sync-card');
      el.append(node('strong',title),node('span',status,'repo-sync-chip'),node('p',summary));
      if(source)el.append(link(source,'فتح الدليل ↗'));
      return el;
    };
    const a=model.android, current=a.status==='SOURCE_REPORTED';
    const aText=current?
      'WebView/ADB: 3 PASS · 0 FAIL · 17 NOT_TESTED. UIAutomator: 20 NOT_TESTED. جهاز فعلي: NOT_TESTED. الإصدار غير معتمد.':
      'أدلة Android المسجلة لا تطابق الرأس الحي أو تعذر التحقق منه؛ لا توجد نتيجة PASS جديدة.';
    details.append(card('اختبارات Android',aText,a.runUrl,a.status));
    const l=model.locale;
    details.append(card('الترجمة · 20 لغة',
      '4608 فجوة مصدرية في تدقيق محفوظ، وليست قياسًا حيًا جديدًا. SHA الدليل: '+l.sha.slice(0,12),
      l.sourceUrl,l.status));
    const audio=model.audio;
    details.append(card('الأصوات والتراخيص',
      'بوابة الأصوات في السجل: 1 PASS / 2 FAIL. اعتماد التسجيلات والاستماع على Android ما زالا مطلوبين.',
      audio.sourceUrl,audio.status));
    details.append(card('الأمان والخصوصية',
      'وصول GitHub للقراءة فقط دون GitHub Token في كود العميل المفحوص. ترويسات HTTP والأذونات تحتاج مراجعة مستقلة؛ لا اعتماد أمني.',
      null,'NOT_VERIFIED'));
    root.append(details,node('p',
      'LIVE: رؤوس PR وActions من GitHub. SNAPSHOT: الأدلة المؤرخة المرتبطة بـSHA محدد؛ تصبح STALE عند تغير PR #70. لا دمج أو تشغيل أو نشر من اللوحة.',
      'safety-note'));
  }
  function render(){
    if(!model)return;
    $('repo-sync-cards').replaceChildren(tile(model.pr25),tile(model.pr37),tile(model.pr70));
    renderTrack04();
    const state=$('repo-sync-drift');
    if(!model.verified)state.textContent='تحقق جزئي: لا تعتمد حالة الدمج أو نتائج CI قبل استعادة الاتصال بالمصادر.';
    else if(model.drift==='BASE_MOVED')state.textContent='تحذير: تغير HEAD لفرع التكامل PR #25، ولم تُحدّث قاعدة PR #37 إلى نفس SHA. راجع إعادة التزامن الآمنة قبل الدمج.';
    else state.textContent='قاعدة PR #37 تطابق رأس التكامل PR #25 عند آخر فحص. لا يعني هذا الموافقة على الدمج أو النشر.';
    state.className='repo-sync-drift'+(model.drift==='BASE_MOVED'?' repo-sync-warning':'');
    const list=$('repo-sync-workflows'),rows=model.recent.map(run=>{
      const item=node('div',undefined,'repo-sync-run');
      const summary=node('div');
      summary.append(node('strong',run.name),node('small',run.branch+' · '+run.sha.slice(0,12)));
      item.append(summary,node('span',label[run.status]||run.status,'repo-sync-chip status-'+run.status.toLowerCase()),link(run.url,'السجل ↗'));
      return item;
    });
    list.replaceChildren(...(rows.length?rows:[node('p','لا توجد تشغيلات مؤكدة في الاستجابة. هذا لا يعني نجاح الاختبارات.')]));
    const suffix=model.errors.length?' · '+model.errors.join(' | '):'';
    const when=model.timestamp?new Date(model.timestamp).toLocaleString('en-GB',{timeZone:'Asia/Amman'}):'—';
    message((model.verified?'تم جلب مراجع GitHub':'المصدر غير مكتمل')+' · '+when+suffix+
      ' · اعتماد Android/الإصدار: NOT APPROVED');
  }
  async function refresh(){
    if(busy)return;
    busy=true;$('repo-sync-refresh').disabled=true;
    message('جارٍ فحص PR #25 وPR #37 وPR #70 وتشغيلات GitHub Actions…');
    const paths=['/pulls/25','/pulls/37','/pulls/70','/actions/runs?per_page=50'];
    const first=await Promise.allSettled(paths.map(endpoint));
    const errors=[],pulls=[],runs=[];
    first.forEach((value,i)=>{
      if(value.status!=='fulfilled'){errors.push(paths[i]+': '+String(value.reason?.message||'failure'));return;}
      if(i<3)pulls.push(value.value);
      else if(Array.isArray(value.value.workflow_runs))runs.push(...value.value.workflow_runs);
      else errors.push('Recent Actions response invalid');
    });
    const exactPaths=pulls.map(p=>core.safeSha(p.head?.sha)?
      '/actions/runs?head_sha='+p.head.sha+'&per_page=30':null).filter(Boolean);
    const exact=await Promise.allSettled(exactPaths.map(endpoint));
    exact.forEach((v,i)=>{
      if(v.status==='fulfilled'&&Array.isArray(v.value.workflow_runs))runs.push(...v.value.workflow_runs);
      else errors.push(exactPaths[i]+': '+String(v.reason?.message||'invalid result'));
    });
    const byRun=new Map(runs.filter(r=>r&&Number.isSafeInteger(r.id)).map(r=>[r.id,r]));
    try{
      model=core.buildRepoHealth({pulls,runs:[...byRun.values()].slice(0,500),errors,
        timestamp:new Date().toISOString()});
      render();
    }catch(e){
      message('تعذر التحقق من بيانات GitHub: '+e.message+'. افتح المستودع مباشرة.');
    }finally{
      busy=false;$('repo-sync-refresh').disabled=false;
    }
  }
  function boot(){
    if(!$('repo-sync'))return;
    $('repo-sync-refresh').addEventListener('click',refresh);
    refresh();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
