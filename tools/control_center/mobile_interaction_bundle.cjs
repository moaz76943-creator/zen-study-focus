#!/usr/bin/env node
'use strict';
/* Generated browser QA fixture only. Never ship this mock to the hosted dashboard. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {buildPortable}=require('./build_portable.cjs');
const ROOT=path.resolve(__dirname,'../..');
const SCRIPT=String.raw`
(async function(){
  /* Track15 QA browser mock: only active in this disposable GitHub CI HTML. */
  if(document.readyState==='loading')await new Promise(resolve=>document.addEventListener('DOMContentLoaded',resolve,{once:true}));
  const result=document.getElementById('track15-browser-qa');
  const REPO='/repos/moaz76943-creator/zen-study-focus';
  const A='a'.repeat(40),B='b'.repeat(40);
  const body='<!-- DF_AGENT_LEDGER_V1\n'+JSON.stringify({
    schema_version:1,source_sha:B,agent_ids:['timer'],
    records:{timer:{status:'SOURCE_TESTED',tests:2}}
  })+'\nEND_DF_AGENT_LEDGER_V1 -->';
  const fixtures={
    [REPO+'/pulls/37']:{number:37,head:{sha:B},draft:true},
    [REPO+'/pulls/138']:{number:138,head:{sha:A},draft:true},
    [REPO+'/issues/64']:{title:'Daily QA',state:'open'},
    [REPO+'/issues/69']:{title:'Agent ledger',state:'open',body},
    [REPO+'/issues/110']:{title:'Control center',state:'open'},
    [REPO+'/actions/runs?head_sha='+A+'&per_page=40']:{
      workflow_runs:[{id:987,head_sha:A,name:'Verify Deep Focus Rescue'}]},
    [REPO+'/actions/runs/987/jobs?per_page=100']:{
      jobs:[{name:'Source QA',status:'completed',conclusion:'success',steps:[
        {name:'Control Center regression tests',status:'completed',conclusion:'success'},
        {name:'Desktop Chrome smoke test',status:'completed',conclusion:'success'},
        {name:'Python regression',status:'completed',conclusion:'failure'}]}]},
    [REPO+'/actions/runs/987/artifacts?per_page=100']:{artifacts:[]}
  };
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async function(url,options){
    const u=new URL(String(url),location.href);
    if(u.hostname==='api.github.com'){
      const key=u.pathname+u.search;
      if(!Object.prototype.hasOwnProperty.call(fixtures,key))
        return {ok:false,status:404,headers:{get(){return null;}},json:async()=>({})};
      return {ok:true,status:200,headers:{get(){return null;}},json:async()=>fixtures[key]};
    }
    return originalFetch(url,options);
  };
  const fails=[],button=document.getElementById('track15-refresh');
  if(!button)fails.push('Missing refresh button');
  else button.click();
  await new Promise(resolve=>setTimeout(resolve,180));
  const quality=document.getElementById('track15-status')?.dataset.quality;
  if(quality!=='LIVE')fails.push('Expected LIVE, got '+quality);
  const jobs=document.getElementById('track15-jobs')?.textContent||'';
  if(!jobs.includes('Node · PASS'))fails.push('Node button refresh evidence missing');
  if(!jobs.includes('Python · FAIL'))fails.push('Python failing evidence missing');
  const agents=document.getElementById('track15-agents')?.textContent||'';
  if(!agents.includes('STALE'))fails.push('Previous source SHA not marked stale');
  const counts=document.getElementById('track15-locales')?.children.length||0;
  if(counts!==20)fails.push('20-language grid missing: '+counts);
  const rect=button?.getBoundingClientRect();
  const width=window.innerWidth;
  const measured={viewportWidth:width,documentWidth:document.documentElement.scrollWidth,
    refreshHeight:Math.round(rect?.height||0),localeCount:counts,
    status:quality};
  if(rect&&rect.height<40)fails.push('Refresh hit target <40px');
  if(button)button.click();
  await new Promise(resolve=>setTimeout(resolve,50));
  if(document.getElementById('track15-status')?.dataset.quality!=='RATE_LIMITED')
    fails.push('Rate-limit stale UI not shown after repeated click');
  const cards=document.getElementById('track15-candidates')?.textContent||'';
  if(!cards.includes('لا تعدّه Live'))fails.push('Cached candidate still marked live');
  const nav=document.querySelector('a[href="#track15"]');
  if(nav)nav.click();else fails.push('Missing navigation link');
  if(!location.hash.includes('track15'))fails.push('Navigation did not reach Track 15');
  result.dataset.result=fails.length?'FAIL':'PASS';
  result.textContent=JSON.stringify({result:result.dataset.result,failures:fails,measured});
})().catch(error=>{
  const node=document.getElementById('track15-browser-qa');
  node.dataset.result='FAIL';node.textContent=JSON.stringify({result:'FAIL',error:String(error)});
});
`;
function buildInteractiveQA(root=ROOT){
  let html=buildPortable(root);
  const digest="'sha256-"+crypto.createHash('sha256').update(SCRIPT,'utf8').digest('base64')+"'";
  const needle="script-src ";
  if(!html.includes(needle)||html.includes('id="track15-browser-qa"'))throw Error('Unexpected portable baseline');
  html=html.replace(needle,needle+digest+' ');
  const output='<output id="track15-browser-qa" data-result="PENDING" hidden></output>';
  return html.replace('</body>',output+'\n<script>'+SCRIPT+'</script>\n</body>');
}
if(require.main===module){
 const target=path.resolve(process.argv[2]||'');
 if(process.argv.length!==3||!target.startsWith(ROOT+path.sep))throw Error('Expected output path within repository');
 fs.mkdirSync(path.dirname(target),{recursive:true});
 fs.writeFileSync(target,buildInteractiveQA(ROOT));
 console.log('Built disposable Chrome interaction QA fixture:',path.relative(ROOT,target));
}
module.exports={buildInteractiveQA};
