'use strict';
/* Mobile-first editor: locally stage exact allowlisted values; never writes to GitHub anonymously. */
(function(){
  if(typeof document==='undefined')return;
  const core=globalThis.DeepFocusStudioCore;
  if(!core)return;
  const REPO='moaz76943-creator/zen-study-focus';
  const $=id=>document.getElementById(id);
  const node=(tag,text)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=String(text);return x;};
  const HEX=/^[a-f0-9]{40}$/i;
  let baseline=null,current=null,screen='timer',agentSha=null,designSha=null;
  const fields=[
    ['theme-primary','theme','primary',false],
    ['theme-cyan','theme','cyan',false],
    ['theme-background','theme','background',false],
    ['theme-radius','theme','cardRadius',true],
    ['theme-scale','theme','fontScale',true],
    ['screen-accent','screen','accent',false],
    ['screen-radius','screen','cardRadius',true],
    ['screen-spacing','screen','spacing',true]
  ];
  const notice=(id,text)=>{$(id).textContent=text;};
  async function readRef(path) {
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),14000);
    try{
      const response=await fetch('https://api.github.com/repos/'+REPO+path,{credentials:'omit',signal:controller.signal,cache:'no-store'});
      if(!response.ok)throw Error('GitHub API '+response.status);
      return await response.json();
    }finally{clearTimeout(timer);}
  }
  async function loadRefs(){
    const result=await Promise.allSettled([readRef('/pulls/25'),readRef('/commits/main')]);
    if(result[0].status==='fulfilled'&&HEX.test(result[0].value.head?.sha||''))agentSha=result[0].value.head.sha;
    if(result[1].status==='fulfilled'&&HEX.test(result[1].value.sha||''))designSha=result[1].value.sha;
    updateIssueLinks();renderSources();
  }
  function sourceLink(file){
    const anchor=node('a',file);anchor.target='_blank';anchor.rel='noopener noreferrer';
    const branch=agentSha||'integration/deep-focus-recovery-00-final-20261019';
    anchor.href='https://github.com/'+REPO+'/blob/'+branch+'/'+file;
    return anchor;
  }
  function renderSources(){
    const spec=core.SCREENS[screen],links=[
      ...spec.files.map(file=>sourceLink(file)),
      ...spec.tests.map(folder=>sourceLink(folder))
    ];
    $('studio-sources').replaceChildren(...links);
  }
  function render(){
    if(!current)return;
    const s=current.screens[screen];
    for(const [id,scope,key] of fields)$(id).value=(scope==='theme'?current.theme:s)[key];
    $('theme-radius-value').textContent=String(current.theme.cardRadius)+'px';
    $('theme-scale-value').textContent=String(current.theme.fontScale)+'%';
    $('screen-radius-value').textContent=String(s.cardRadius)+'px';
    $('screen-spacing-value').textContent=String(s.spacing)+'px';
    const preview=$('studio-preview'),card=preview.querySelector('.mock-card'),cta=preview.querySelector('.mock-cta');
    preview.style.background=current.theme.background;
    preview.style.fontSize=current.theme.fontScale+'%';
    preview.style.rowGap=s.spacing+'px';
    card.style.borderRadius=s.cardRadius+'px';
    card.style.color=s.accent;
    cta.style.background=current.theme.primary;
    $('mock-title').textContent=core.SCREENS[screen].label;
    renderSources();
    const dirty=JSON.stringify(baseline)!==JSON.stringify(current);
    notice('studio-status',dirty?'هناك تعديلات محلية لم تُطبّق على التطبيق بعد. نزّل الملفات أو افتح طلب مراجعة.':'الإعدادات مطابقة للنسخة المحمّلة. لا توجد تغييرات معلّقة.');
    updateIssueLinks();
    document.dispatchEvent(new CustomEvent('df:studio-changed'));
  }
  function bindFields(){
    for(const [id,scope,key,numeric] of fields){
      $(id).addEventListener('input',()=>{
        if(!current)return;
        try{
          const value=numeric?Number($(id).value):$(id).value;
          current=core.updateSetting(current,scope==='theme'?'theme':screen,key,value);
          render();
        }catch(e){notice('studio-status','قيمة غير صالحة: '+e.message);}
      });
    }
  }
  function download(filename,body,type){
    const blob=new Blob([body],{type:type||'text/plain;charset=utf-8'});
    const url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download=filename;
    document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function setLink(id,request,ready){
    const a=$(id);
    a.setAttribute('aria-disabled',ready?'false':'true');
    a.href=ready?core.issueLink(request):'#'+(id==='studio-review'?'studio':'agent-studio');
    a.target=ready?'_blank':'_self';
    a.rel='noopener noreferrer';
  }
  function agentRequest(){
    return core.makeAgentRequest($('agent-type').value,$('agent-screen').value,
      $('agent-goal').value,agentSha);
  }
  function updateIssueLinks(){
    try{setLink('studio-review',core.makeDesignRequest(current,designSha),true);}
    catch(e){setLink('studio-review',null,false);}
    try{setLink('agent-issue',agentRequest(),true);
      notice('agent-status','مهمة جاهزة للمراجعة. فتح Issue لا يبدأ تشغيل نموذج AI تلقائيًا.');
    }catch(e){setLink('agent-issue',null,false);
      notice('agent-status','أدخل هدفًا واضحًا من 8 أحرف على الأقل، وتحقق من اتصال GitHub.');}
  }
  function populate(){
    const screenOpts=Object.entries(core.SCREENS).map(([id,entry])=>{
      const e=node('option',entry.label);e.value=id;return e;
    });
    $('studio-screen').replaceChildren(...screenOpts);
    $('agent-screen').replaceChildren(...Object.entries(core.SCREENS).map(([id,entry])=>{
      const e=node('option',entry.label);e.value=id;return e;
    }));
    $('agent-type').replaceChildren(...Object.entries(core.AGENTS).map(([id,entry])=>{
      const e=node('option',entry.label);e.value=id;return e;
    }));
    $('agent-screen').value='timer';$('agent-type').value='ui';
  }
  async function clipboard(message){
    if(!navigator.clipboard||!window.isSecureContext)throw Error('Clipboard requires HTTPS');
    await navigator.clipboard.writeText(message);
  }
  async function boot(){
    populate();bindFields();
    $('studio-screen').addEventListener('change',()=>{screen=$('studio-screen').value;render();});
    $('studio-reset').addEventListener('click',()=>{
      if(!baseline)return;current=core.validateConfig(baseline);render();
    });
    $('studio-json').addEventListener('click',()=>{
      if(current)download('design-config.json',JSON.stringify(current,null,2)+'\n','application/json');
    });
    $('studio-css').addEventListener('click',()=>{
      if(current)download('control_center_overrides.css',core.renderCSS(current),'text/css');
    });
    $('agent-copy').addEventListener('click',async()=>{
      try{const task=agentRequest();await clipboard(task.title+'\n\n'+task.body);
        notice('agent-status','تم نسخ تعليمات الوكيل. تحتاج إلى إرسالها إلى وكيل متصل للتنفيذ.');}
      catch(e){notice('agent-status','تعذر النسخ: '+e.message);}
    });
    for(const id of ['agent-type','agent-screen','agent-goal']){
      $(id).addEventListener(id==='agent-goal'?'input':'change',updateIssueLinks);
    }
    $('studio-review').addEventListener('click',e=>{
      if($('studio-review').getAttribute('aria-disabled')==='true') {
        e.preventDefault();notice('studio-status','لا يمكن إنشاء طلب موثوق قبل التحقق من SHA الفرع الرئيسي في GitHub.');
      }
    });
    $('agent-issue').addEventListener('click',e=>{
      if($('agent-issue').getAttribute('aria-disabled')==='true'){
        e.preventDefault();notice('agent-status','تحقق من المهمة وSHA أولًا.');
      }
    });
    try{
      const response=await fetch('./design-config.json',{credentials:'omit',cache:'no-store'});
      if(!response.ok)throw Error('HTTP '+response.status);
      baseline=core.validateConfig(await response.json());
      current=core.validateConfig(baseline);render();
    }catch(e){
      notice('studio-status','تعذر فتح إعدادات التصميم: '+e.message+'؛ افتح اللوحة عبر خادم HTTPS.');
    }
    await loadRefs().catch(e=>{notice('agent-status','تعذر التحقق من GitHub: '+e.message);});
  }
  function getState(){
    if(!current||!baseline)return null;
    return {current:core.validateConfig(current),baseline:core.validateConfig(baseline),screen};
  }
  function applyConfig(next){
    if(!baseline)throw Error('Design editor is not ready');
    current=core.validateConfig(next);
    render();
  }
  function selectScreen(next){
    if(!core.SCREENS[next])throw Error('Unknown screen');
    screen=next;
    $('studio-screen').value=next;
    render();
  }
  globalThis.DeepFocusStudioUI={getState,applyConfig,selectScreen};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
