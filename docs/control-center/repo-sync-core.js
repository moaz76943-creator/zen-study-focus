'use strict';
/* Public GitHub snapshot normalization — never assumes Android release readiness. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DeepFocusRepoSyncCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const REPO='moaz76943-creator/zen-study-focus';
  const SHA=/^[0-9a-f]{40}$/i;
  const MAX_RUNS=500,MAX_PRS=100;
  function safeSha(value){
    return typeof value==='string'&&SHA.test(value)?value:null;
  }
  function trustedGitHubUrl(value){
    if(typeof value!=='string'||value.length>600)return null;
    try {
      const url=new URL(value);
      if(url.protocol!=='https:'||url.username||url.password||
        url.hostname!=='github.com'||!url.pathname.startsWith('/'+REPO+'/'))return null;
      return url.href;
    }catch{return null;}
  }
  function ciStatus(runs,sha){
    if(!safeSha(sha))return {status:'NOT_VERIFIED',runId:null,url:null,count:0,workflows:0};
    const matches=(Array.isArray(runs)?runs:[]).filter(r=>
      r&&r.head_sha===sha&&Number.isSafeInteger(r.id)&&r.id>0);
    const newest=[...matches].sort((a,b)=>b.id-a.id)[0];
    const byWorkflow=new Map();
    for(const run of [...matches].sort((a,b)=>b.id-a.id)){
      const identity=Number.isSafeInteger(run.workflow_id)&&run.workflow_id>0?
        'id:'+run.workflow_id:
        typeof run.name==='string'&&run.name.length?'name:'+run.name:'run:'+run.id;
      if(!byWorkflow.has(identity))byWorkflow.set(identity,run);
    }
    const current=[...byWorkflow.values()].map(r=>{
      if(['failure','cancelled','timed_out','action_required','startup_failure'].includes(r.conclusion))return 'FAIL';
      if(['queued','in_progress','pending','waiting','requested'].includes(r.status))return 'RUNNING';
      if(r.conclusion==='success')return 'PASS';
      return 'NOT_VERIFIED';
    });
    const status=current.includes('FAIL')?'FAIL':
      current.includes('RUNNING')?'RUNNING':
      current.includes('NOT_VERIFIED')?(current.includes('PASS')?'PARTIAL':'NOT_VERIFIED'):
      current.includes('PASS')?'PASS':'NOT_VERIFIED';
    return {status,runId:newest?.id||null,
      url:trustedGitHubUrl(newest?.html_url)||null,count:matches.length,
      workflows:byWorkflow.size};
  }
  function buildRepoHealth({pulls=[],runs=[],errors=[],timestamp=null}={}){
    if(!Array.isArray(pulls)||pulls.length>MAX_PRS||!Array.isArray(runs)||runs.length>MAX_RUNS)
      throw Error('Repository response limit exceeded');
    if(!Array.isArray(errors)||errors.length>15)throw Error('Invalid integration errors');
    const cleanPulls=pulls.filter(x=>x&&[25,37].includes(x.number));
    for(const p of cleanPulls){
      if(!safeSha(p.head?.sha)||!safeSha(p.base?.sha))throw Error('Invalid pull SHA');
    }
    const byNumber=new Map(cleanPulls.map(p=>[p.number,p]));
    const verified=Boolean(byNumber.get(25)&&byNumber.get(37)&&errors.length===0);
    const toPR=n=>{
      const p=byNumber.get(n);
      return p?{number:n,sha:p.head.sha,baseSha:p.base.sha,draft:p.draft===true,
        url:trustedGitHubUrl(p.html_url)||'https://github.com/'+REPO+'/pull/'+n,
        ci:verified?ciStatus(runs,p.head.sha):
          {...ciStatus(runs,p.head.sha),status:'NOT_VERIFIED',partial:true}}:null;
    };
    const pr25=toPR(25),pr37=toPR(37);
    const drift=verified?(pr25.sha===pr37.baseSha?'CURRENT':'BASE_MOVED'):'NOT_VERIFIED';
    const recent=runs.filter(r=>r&&Number.isSafeInteger(r.id)&&r.id>0&&
      safeSha(r.head_sha)&&trustedGitHubUrl(r.html_url))
      .sort((a,b)=>b.id-a.id).slice(0,12).map(r=>({
        id:r.id,name:String(r.name||'GitHub Actions').slice(0,120),
        branch:String(r.head_branch||'').slice(0,100),sha:r.head_sha,
        status:ciStatus([r],r.head_sha).status,
        url:trustedGitHubUrl(r.html_url)
      }));
    return {verified,drift,pr25,pr37,release:'NOT_APPROVED',
      recent,errors:errors.map(x=>String(x).slice(0,180)),timestamp};
  }
  function reviewQueue(prs,{term='',filter='all',limit=15}={}){
    if(!Array.isArray(prs)||prs.length>MAX_PRS)throw Error('Review queue source limit exceeded');
    if(typeof term!=='string'||term.length>120)throw Error('Invalid PR search');
    if(!['all','draft','ready'].includes(filter))throw Error('Invalid PR filter');
    if(!Number.isInteger(limit)||limit<1||limit>25)throw Error('Invalid PR limit');
    const query=term.trim().toLocaleLowerCase();
    const items=prs.filter(pr=>pr&&Number.isSafeInteger(pr.number)&&pr.number>0&&
      trustedGitHubUrl(pr.html_url)&&
      new URL(pr.html_url).pathname==='/'+REPO+'/pull/'+pr.number).map(pr=>({
      number:pr.number,
      title:String(pr.title||'Untitled PR').slice(0,240),
      draft:pr.draft===true,
      sha:safeSha(pr.head?.sha),
      branch:String(pr.head?.ref||'').slice(0,140),
      updatedAt:typeof pr.updated_at==='string'?pr.updated_at.slice(0,32):null,
      url:trustedGitHubUrl(pr.html_url)
    })).filter(pr=>(filter==='all'||pr.draft===(filter==='draft'))&&
      (!query||[String(pr.number),pr.title,pr.branch].some(t=>t.toLocaleLowerCase().includes(query))));
    items.sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))||b.number-a.number);
    return {total:items.length,drafts:items.filter(x=>x.draft).length,items:items.slice(0,limit)};
  }
  return {REPO,safeSha,trustedGitHubUrl,ciStatus,buildRepoHealth,reviewQueue};
});
