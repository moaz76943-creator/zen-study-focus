'use strict';
/* Track 15: exact-SHA evidence; public GitHub read-only. No write commands or credentials. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DeepFocusTrack15Core=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const REPO='moaz76943-creator/zen-study-focus';
 const SHA=/^[a-f\d]{40}$/i;
 const NONE='NOT_TESTED';
 const FIELDS=['node','python','chromium','androidBuild','androidDevice'];
 const AGENTS=['localization','numerals','navigation','notes','tasks','analytics',
   'timer','nature_audio','privacy_security','data_integrity','performance','product_consistency'];
 function validSha(value){return typeof value==='string'&&SHA.test(value)?value.toLowerCase():null;}
 function issueUrl(number){return Number.isSafeInteger(number)&&number>0&&number<=10000000?
   'https://github.com/'+REPO+'/issues/'+number:null;}
 function pullUrl(number){return Number.isSafeInteger(number)&&number>0&&number<=10000000?
   'https://github.com/'+REPO+'/pull/'+number:null;}
 function runUrl(number){return Number.isSafeInteger(number)&&number>0?
   'https://github.com/'+REPO+'/actions/runs/'+number:null;}
 function parseAgentLedger(body,expectedSha){
   const empty={status:NONE,sourceSha:null,agents:AGENTS.map(id=>({id,status:NONE,tests:0})),android:NONE};
   if(typeof body!=='string'||body.length>100000||!validSha(expectedSha))return empty;
   const found=body.match(/<!-- DF_AGENT_LEDGER_V1\s*([\s\S]{1,25000}?)\s*END_DF_AGENT_LEDGER_V1 -->/);
   if(!found)return empty;
   try{
     const data=JSON.parse(found[1]),sourceSha=validSha(data.source_sha);
     if(data.schema_version!==1||!sourceSha||!Array.isArray(data.agent_ids)||typeof data.records!=='object')return empty;
     const stale=sourceSha!==validSha(expectedSha);
     const agents=AGENTS.map(id=>{
       const rec=data.agent_ids.includes(id)?data.records?.[id]:null;
       const checked=rec?.status==='SOURCE_TESTED'&&Number.isSafeInteger(rec.tests)&&rec.tests>0;
       return {id,status:stale?'STALE':checked?'SOURCE_TESTED':NONE,
         tests:checked?rec.tests:0};
     });
     return {status:stale?'STALE':agents.every(x=>x.status==='SOURCE_TESTED')?'SOURCE_TESTED':NONE,
       sourceSha,agents,android:NONE};
   }catch{return empty;}
 }
 function statusOf(job){
   if(['queued','in_progress','waiting','pending','requested'].includes(job?.status))return 'RUNNING';
   if(job?.conclusion==='success')return 'PASS';
   if(['failure','timed_out','cancelled','startup_failure','action_required'].includes(job?.conclusion))return 'FAIL';
   return NONE;
 }
 function classifyJobs(jobs,runSha,expectedSha){
   const out=Object.fromEntries(FIELDS.map(k=>[k,NONE]));
   if(!validSha(runSha)||validSha(runSha)!==validSha(expectedSha)||!Array.isArray(jobs))return out;
   const specs={node:/\bnode\b|\bjavascript\b/i,python:/\bpython\b|\bpytest\b/i,
     chromium:/\bchromium\b|\bchrome\b|\bplaywright\b/i,
     androidBuild:/\bgradle\b|\bassemble\b|\bandroid\s+(build|compile|jvm)\b/i};
   for(const [field,matcher] of Object.entries(specs)){
     const matches=jobs.filter(x=>x&&typeof x.name==='string'&&matcher.test(x.name));
     if(!matches.length)continue;
     const values=matches.map(statusOf);
     out[field]=values.includes('FAIL')?'FAIL':values.includes('RUNNING')?'RUNNING':
       values.includes(NONE)?NONE:'PASS';
   }
   return out;
 }
 function listArtifacts(artifacts,runId,runSha){
   if(!runUrl(runId)||!validSha(runSha)||!Array.isArray(artifacts))return [];
   return artifacts.slice(0,100).filter(a=>a&&Number.isSafeInteger(a.id)&&a.id>0&&
     typeof a.name==='string'&&!a.expired).map(a=>{
       const digest=typeof a.digest==='string'&&/^sha256:[a-f\d]{64}$/i.test(a.digest)?
         a.digest.slice(7).toLowerCase():null;
       const name=a.name.slice(0,150);
       return {id:a.id,name,kind:/\bapk\b|[-_]apk\b/i.test(name)?'APK_CANDIDATE':
         /\baab\b|[-_]aab\b/i.test(name)?'AAB_CANDIDATE':'OTHER',
         size:Number.isSafeInteger(a.size_in_bytes)?a.size_in_bytes:null,
         archiveSha256:digest,binarySha256:null,url:runUrl(runId),sourceSha:runSha};
     });
 }
 function retryDelay(status,headers={},nowMs=Date.now()){
   if(status!==403&&status!==429)return 0;
   const get=k=>headers&&typeof headers.get==='function'?headers.get(k):
     headers?.[k]??headers?.[k.toLowerCase()];
   const after=Number(get('retry-after'));
   if(get('retry-after')!=null&&Number.isFinite(after)&&after>=0)
     return Math.max(60000,Math.min(3600000,after*1000));
   const reset=Number(get('x-ratelimit-reset'));
   if(Number.isFinite(reset)&&reset>0)
     return Math.max(60000,Math.min(3600000,reset*1000-nowMs));
   return 60000;
 }
 function normalizePull(pr,num){
   const sha=validSha(pr?.head?.sha);
   if(!pr||pr.number!==num||!sha)return null;
   return {number:num,sha,draft:pr.draft===true,url:pullUrl(num)};
 }
 return {REPO,AGENTS,FIELDS,validSha,issueUrl,pullUrl,runUrl,parseAgentLedger,
   classifyJobs,listArtifacts,retryDelay,normalizePull};
});
