'use strict';
/* Track 15: public GitHub monitoring only. No PAT, workflow triggers or merge operations. */
(function(){
 if(typeof document==='undefined')return;
 const core=globalThis.DeepFocusTrack15Core;
 if(!core)return;
 const API='https://api.github.com/repos/'+core.REPO, $=id=>document.getElementById(id);
 const make=(tag,text,cls)=>{const el=document.createElement(tag);if(cls)el.className=cls;
   if(text!=null)el.textContent=String(text);return el;};
 const panel=(target,title,details,url)=>{
   const article=make('article',null,'track15-item');
   article.append(make('strong',title),make('small',details));
   if(url){const a=make('a','الدليل على GitHub ↗');a.href=url;a.target='_blank';
     a.rel='noopener noreferrer';article.append(a);}
   $(target).append(article);
 };
 let busy=false,lockUntil=0,previous=null;
 function status(message,quality){
   const el=$('track15-status');
   el.textContent=quality+' · '+message;el.dataset.quality=quality;
 }
 async function api(path){
   const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
   try{
     const response=await fetch(API+path,{
       signal:controller.signal,credentials:'omit',cache:'no-store',
       headers:{Accept:'application/vnd.github+json'}});
     if(!response.ok){
       const delay=core.retryDelay(response.status,response.headers);
       if(delay)lockUntil=Math.max(lockUntil,Date.now()+delay);
       const err=Error('GitHub HTTP '+response.status+
         (delay?' · rate limit / access denied':''));
       err.code=response.status;throw err;
     }
     return await response.json();
   }finally{clearTimeout(timeout);}
 }
 function render(snapshot,quality){
   const {pull37,pull138,issues,agentLedger,run,jobs,artifacts,errors,fetchedAt}=snapshot;
   ['track15-candidates','track15-issues','track15-jobs','track15-agents',
     'track15-artifacts','track15-gates'].forEach(id=>$(id).replaceChildren());
   const stale=quality!=='LIVE';
   for(const [num,p] of [[37,pull37],[138,pull138]]){
     panel('track15-candidates','PR #'+num+(num===138?' · مرشح التكامل الرئيسي':' · لوحة v3.5'),
       (p?'HEAD '+p.sha+' · '+(p.draft?'DRAFT':'READY'):'HEAD غير متحقق')+
       (stale?' · لا تعدّه Live':''),
       core.pullUrl(num));
   }
   for(const num of [64,69,110]){
     const item=issues[num];
     panel('track15-issues','Issue #'+num+(item?' · '+String(item.title||'').slice(0,110):''),
       item?'GitHub: '+String(item.state||'unknown').toUpperCase()+(stale?' · STALE':' · LIVE'):'NOT_TESTED',
       core.issueUrl(num));
   }
   const classes=core.classifyJobs(jobs,run?.head_sha,pull138?.sha);
   for(const [key,title] of [['node','Node'],['python','Python'],['chromium','Chromium'],
     ['androidBuild','Android build'],['androidDevice','Android device / SAF / TalkBack']]){
     const evidence=!stale?classes[key]:'NOT_TESTED';
     panel('track15-jobs',title+' · '+evidence,
       evidence==='PASS'?'GitHub job on exact PR #138 SHA (not device acceptance)':
       evidence==='FAIL'?'GitHub job failed on PR #138 HEAD':
       'لا يوجد دليل مباشر ومؤكد على أحدث SHA',
       run?core.runUrl(run.id):null);
   }
   const agents=core.parseAgentLedger(agentLedger?.body,pull138?.sha);
   for(const row of agents.agents){
     const state=stale?'STALE':row.status;
     panel('track15-agents',row.id+' · '+state,
       'سجل QA مصدره Issue #69'+(agents.sourceSha?' · SHA '+agents.sourceSha.slice(0,12):' · غير متاح'),
       core.issueUrl(69));
   }
   const artifactsList=core.listArtifacts(artifacts,run?.id,pull138?.sha);
   if(!artifactsList.length)panel('track15-artifacts','NOT_TESTED',
     'لا توجد Artifacts موثوقة من تشغيل مطابق لهذا الرأس؛ لا تخمّن APK/AAB أو بصمة.');
   for(const a of artifactsList){
     panel('track15-artifacts',a.name+' · '+a.kind,
       'Archive SHA256: '+(a.archiveSha256||'NOT_TESTED')+
       ' · APK/AAB binary SHA256: NOT_TESTED · Size: '+(a.size??'—')+' B',
       a.url);
   }
   panel('track15-gates','20-language gaps · NOT_TESTED',
     'لا يوجد تدقيق فجوات per-language مربوط ومتحقق على SHA #138 في هذه الاستجابة.',
     core.issueUrl(104));
   panel('track15-gates','Nature audio commercial licences · NOT_APPROVED',
     'لا تُستنتج الموافقات من نجاح اختبارات Node أو وجود الملفات.',
     core.issueUrl(105));
   panel('track15-gates','Security + v21 data integrity · NOT_TESTED',
     'يتطلبان دليل مراجعة مستقل على HEAD مطابق، ولا تمنحهما اللوحة موافقة.',
     core.issueUrl(64));
   panel('track15-gates','Release · NOT_APPROVED',
     'لا توقيع ولا دمج تلقائي؛ تبقى كل بوابات الإصدار مستقلة.');
   const when=new Date(fetchedAt).toLocaleString('en-GB',{timeZone:'Asia/Amman'});
   status('آخر طلب: '+when+(errors.length?' · أخطاء: '+errors.join(' | ').slice(0,260):'')+
     ' · مصدر الوكلاء '+(agents.sourceSha||'غير متاح'),quality);
 }
 async function refresh(){
   if(busy)return;
   if(Date.now()<lockUntil){
     status('الطلبات محدودة لتجنب تجاوز GitHub API. المراجعة التالية بعد '+
       new Date(lockUntil).toLocaleTimeString('en-GB',{timeZone:'Asia/Amman'})+
       (previous?' · الأرقام السابقة STALE':''),'RATE_LIMITED');return;
   }
   busy=true;$('track15-refresh').disabled=true;
   try {
   status('جارٍ قراءة PR #37 و#138 وIssues #64/#69/#110…','LOADING');
   const paths=['/pulls/37','/pulls/138','/issues/64','/issues/69','/issues/110'];
   const replies=await Promise.allSettled(paths.map(api));
   const failures=[],values={};
   replies.forEach((r,i)=>{if(r.status==='fulfilled')values[paths[i]]=r.value;
     else failures.push(paths[i]+' '+String(r.reason?.message||'error'));});
   const pull37=core.normalizePull(values['/pulls/37'],37);
   const pull138=core.normalizePull(values['/pulls/138'],138);
   let run=null,jobs=[],artifacts=[];
   if(pull138){
     try{
       const response=await api('/actions/runs?head_sha='+pull138.sha+'&per_page=40');
       if(!Array.isArray(response.workflow_runs))throw Error('Actions payload invalid');
       const candidates=response.workflow_runs.filter(r=>r?.head_sha===pull138.sha&&
         Number.isSafeInteger(r.id)&&r.id>0).sort((a,b)=>b.id-a.id);
       run=candidates.find(r=>/verify.deep.focus.rescue|rescue.*verify/i.test(r.name||''))||candidates[0]||null;
       if(run){
         const details=await Promise.allSettled([
           api('/actions/runs/'+run.id+'/jobs?per_page=100'),
           api('/actions/runs/'+run.id+'/artifacts?per_page=100')
         ]);
         if(details[0].status==='fulfilled'&&Array.isArray(details[0].value.jobs))jobs=details[0].value.jobs;
         else failures.push('Jobs: NOT_TESTED');
         if(details[1].status==='fulfilled'&&Array.isArray(details[1].value.artifacts))
           artifacts=details[1].value.artifacts;
         else failures.push('Artifacts: NOT_TESTED');
       }
     }catch(e){failures.push('Actions: '+String(e.message||e));}
   }else failures.push('PR #138 HEAD: NOT_TESTED');
   const issueValues=Object.fromEntries([64,69,110].map(n=>[n,values['/issues/'+n]||null]));
   const snapshot={pull37,pull138,issues:issueValues,agentLedger:issueValues[69],
     run,jobs,artifacts,errors:failures,fetchedAt:new Date().toISOString()};
   const quality=pull138&&pull37&&[64,69,110].every(n=>issueValues[n])&&
     !failures.length?'LIVE':'PARTIAL';
   if(!pull138&&previous){render(previous,'STALE');}
   else{previous=snapshot;render(snapshot,quality);}
   /* Min 12 minutes between full scans: ~8 unauthenticated REST calls per scan. */
   lockUntil=Math.max(lockUntil,Date.now()+12*60*1000);
   } finally {
     busy=false;$('track15-refresh').disabled=false;
   }
 }
 function boot(){
   if(!$('track15'))return;
   $('track15-refresh').addEventListener('click',()=>{refresh().catch(e=>
     status('فشل غير متوقع: '+String(e.message||e),'NOT_TESTED'));});
   status('لا توجد قراءة بعد؛ اضغط الفحص أو افتح القسم.','NOT_TESTED');
   if(typeof IntersectionObserver==='function'){
     const observer=new IntersectionObserver(entries=>{
       if(entries.some(e=>e.isIntersecting)){observer.disconnect();refresh().catch(e=>
         status('تعذر الفحص: '+String(e.message||e),'NOT_TESTED'));}});
     observer.observe($('track15'));
   }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
 else boot();
})();
