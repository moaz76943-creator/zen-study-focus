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
  function tile(pr,number){
    const div=node('article',undefined,'repo-sync-card');
    if(!pr){
      div.append(node('strong','PR #'+number+' · NOT_VERIFIED'),node('small','تعذر جلب البيانات الحية من GitHub؛ لا يُفترض نجاح أو إمكانية دمج.'));
      return div;
    }
    div.append(node('strong','PR #'+pr.number+(pr.number===25?' · تكامل التطبيق':pr.number===70?' · إصلاح Android P0':pr.number===72?' · تحسينات اللوحة':' · لوحة التحكم')),
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
    const badgeStyle={SOURCE_REPORTED:'source-reported',STALE:'stale',NOT_VERIFIED:'not-verified',
      LIVE_GITHUB:'live-github',CURRENT:'live-github',BASE_MOVED:'stale',
      PASS:'pass',FAIL:'fail',RUNNING:'running'};
    const tag=status=>'repo-sync-chip status-'+(badgeStyle[status]||'not-verified');
    const heading=node('div',undefined,'repo-sync-toolbar');
    heading.append(node('strong','TRACK 04 · حالة الاسترداد'),
      node('small','GitHub: '+state+' · نتائج التدقيق: SNAPSHOT 2026-10-20'));
    root.replaceChildren(heading);
    const details=node('div',undefined,'repo-sync-grid');
    const card=(title,summary,source,status)=>{
      const el=node('article',undefined,'repo-sync-card');
      el.append(node('strong',title),node('span',status,tag(status)),node('p',summary));
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
    const run=model.androidWorkflow;
    details.append(card('تشغيلات Android QA على GitHub',
      'حالة workflow المرتبط برأس PR #70 الحالي: '+run.status+
      '. هذه نتيجة تشغيل GitHub وليست اجتياز حالات WebView أو اختبار هاتف فعلي.',
      run.url,run.status));
    const drift=model.dashboardDrift;
    details.append(card('تكامل إصلاحات اللوحة',
      drift==='CURRENT'?'قاعدة PR #72 تطابق رأس PR #37 في GitHub. الدمج ما زال يتطلب مراجعة.':
      drift==='BASE_MOVED'?'تنبيه: قاعدة PR #72 متأخرة عن رأس PR #37. راجع التعارض قبل أي دمج.':
      'تعذر التحقق من تطابق PR #72 مع PR #37؛ لا تفترض سلامة الدمج.',
      model.pr72?.url||'https://github.com/'+REPO+'/pull/72',drift));
    root.append(details,node('p',
      'LIVE: رؤوس PR وActions من GitHub. SNAPSHOT: أدلة مؤرخة منفصلة عن حالة CI؛ تتحول إلى STALE عند تغير PR #70. نسخة الموقع المنشورة مستقلة عن GitHub. لا دمج أو تشغيل أو نشر من اللوحة.',
      'safety-note'));
  }
  function render(){
    if(!model)return;
    $('repo-sync-cards').replaceChildren(tile(model.pr25,25),tile(model.pr37,37),tile(model.pr70,70),tile(model.pr72,72));
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
    message('جارٍ فحص PR #25 وPR #37 وPR #70 وPR #72 وتشغيلات GitHub Actions…');
    const paths=['/pulls/25','/pulls/37','/pulls/70','/pulls/72','/actions/runs?per_page=50'];
    const first=await Promise.allSettled(paths.map(endpoint));
    const errors=[],pulls=[],runs=[];
    first.forEach((value,i)=>{
      if(value.status!=='fulfilled'){errors.push(paths[i]+': '+String(value.reason?.message||'failure'));return;}
      if(i<4)pulls.push(value.value);
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

  // Phone-first shortcuts; anchor-only navigation, no privileged controls.
  function mobileQuickNav(){
    if($('mobile-quick-nav')||!$('repo-sync'))return;
    const nav=node('nav',undefined,'mobile-quick-nav');
    nav.id='mobile-quick-nav';
    nav.setAttribute('aria-label','تنقل سريع على الهاتف');
    const targets=[['overview','الرئيسية'],['repo-sync','GitHub'],
      ['tasks','المهام'],['studio','التصميم'],['reports','التقارير']];
    const links=[];
    targets.forEach(([id,label])=>{
      if(!$(id))return;
      const a=node('a',label);
      a.href='#'+id;
      a.dataset.target=id;
      links.push(a);nav.append(a);
    });
    const setCurrent=()=>{
      const current=decodeURIComponent((location.hash||'#overview').slice(1));
      links.forEach(a=>{
        if(a.dataset.target===current)a.setAttribute('aria-current','location');
        else a.removeAttribute('aria-current');
      });
    };
    nav.addEventListener('click',event=>{
      const a=event.target.closest('a[data-target]');
      if(!a)return;
      links.forEach(item=>item.removeAttribute('aria-current'));
      a.setAttribute('aria-current','location');
    });
    window.addEventListener('hashchange',setCurrent);
    document.body.append(nav);
    setCurrent();
  }
  function boot(){
    if(!$('repo-sync'))return;
    $('repo-sync-refresh').addEventListener('click',refresh);
    mobileQuickNav();
    refresh();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
