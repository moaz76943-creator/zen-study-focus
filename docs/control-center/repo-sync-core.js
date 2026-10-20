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
    if(!safeSha(sha))return {status:'NOT_VERIFIED',runId:null,url:null,count:0};
    const matches=(Array.isArray(runs)?runs:[]).filter(r=>r&&r.head_sha===sha&&Number.isSafeInteger(r.id)&&r.id>0);
    const newest=[...matches].sort((a,b)=>b.id-a.id)[0];
    const statuses=matches.map(r=>{
      if(['failure','cancelled','timed_out','action_required','startup_failure'].includes(r.conclusion))return 'FAIL';
      if(r.status==='queued'||r.status==='in_progress'||r.status==='pending'||r.status==='waiting'||r.status==='requested')return 'RUNNING';
      if(r.conclusion==='success')return 'PASS';
      return 'NOT_VERIFIED';
    });
    const status=statuses.includes('FAIL')?'FAIL':
      statuses.includes('RUNNING')?'RUNNING':
      statuses.includes('PASS')?'PASS':'NOT_VERIFIED';
    return {status,runId:newest?.id||null,
      url:trustedGitHubUrl(newest?.html_url)||null,count:matches.length};
  }
  function buildRepoHealth({pulls=[],runs=[],errors=[],timestamp=null}={}){
    if(!Array.isArray(pulls)||pulls.length>MAX_PRS||!Array.isArray(runs)||runs.length>MAX_RUNS)
      throw Error('Repository response limit exceeded');
    if(!Array.isArray(errors)||errors.length>15)throw Error('Invalid integration errors');
    const cleanPulls=pulls.filter(x=>x&&[25,37,70].includes(x.number));
    for(const p of cleanPulls){
      if(!safeSha(p.head?.sha)||!safeSha(p.base?.sha))throw Error('Invalid pull SHA');
    }
    const byNumber=new Map(cleanPulls.map(p=>[p.number,p]));
    const toPR=n=>{
      const p=byNumber.get(n);
      return p?{number:n,sha:p.head.sha,baseSha:p.base.sha,draft:p.draft===true,
        url:trustedGitHubUrl(p.html_url)||'https://github.com/'+REPO+'/pull/'+n,
        ci:ciStatus(runs,p.head.sha)}:null;
    };
    const pr25=toPR(25),pr37=toPR(37),pr70=toPR(70);
    const verified=Boolean(pr25&&pr37&&errors.length===0);
    const drift=verified?(pr25.sha===pr37.baseSha?'CURRENT':'BASE_MOVED'):'NOT_VERIFIED';
    const recent=runs.filter(r=>r&&Number.isSafeInteger(r.id)&&r.id>0&&
      safeSha(r.head_sha)&&trustedGitHubUrl(r.html_url))
      .sort((a,b)=>b.id-a.id).slice(0,12).map(r=>({
        id:r.id,name:String(r.name||'GitHub Actions').slice(0,120),
        branch:String(r.head_branch||'').slice(0,100),sha:r.head_sha,
        status:ciStatus([r],r.head_sha).status,
        url:trustedGitHubUrl(r.html_url)
      }));
    const evidenceSha='3ab4ebdf6b4cded3ebaa3b0c08ff30b01e6e73e8';
    // Historical scoped PR70 evidence. Never assume a CI success equals Android device approval.
    const evidenceStatus=!pr70?'NOT_VERIFIED':pr70.sha===evidenceSha?'SOURCE_REPORTED':'STALE';
    const android={status:evidenceStatus,sha:evidenceSha,
      pass:evidenceStatus==='SOURCE_REPORTED'?3:null,
      fail:evidenceStatus==='SOURCE_REPORTED'?0:null,
      notTested:evidenceStatus==='SOURCE_REPORTED'?17:null,
      uiAutomatorNotTested:20,
      runUrl:'https://github.com/'+REPO+'/actions/runs/39376600969',
      physicalDevice:'NOT_TESTED'};
    const locale={status:evidenceStatus,missing:4608,languages:20,sha:evidenceSha,
      sourceUrl:'https://github.com/'+REPO+'/pull/70'};
    const audio={status:evidenceStatus,recordedPass:1,recordedFail:2,sha:evidenceSha,
      sourceUrl:'https://github.com/'+REPO+'/blob/'+evidenceSha+'/docs/MEDIA_LICENSES.md'};
    const security={status:'NOT_VERIFIED',tokenInPublicClient:'NOT_DETECTED_IN_REVIEW',
      httpHeaders:'REQUIRES_REVIEW'};
    return {verified,drift,pr25,pr37,pr70,
      pr70Verified:Boolean(pr70&&errors.length===0),android,locale,audio,security,
      release:'NOT_APPROVED',
      recent,errors:errors.map(x=>String(x).slice(0,180)),timestamp};
  }
  return {REPO,safeSha,trustedGitHubUrl,ciStatus,buildRepoHealth};
});
