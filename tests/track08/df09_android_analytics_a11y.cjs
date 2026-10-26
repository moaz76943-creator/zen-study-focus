'use strict';
// Real disposable Android WebView/CDP probe. No browser emulator or mocked WebView.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const cp=require('node:child_process');
const codes='en ar es zh hi fr de ru pt ja id tr ko vi it bn ur fa pl nl'.split(' ');
const folder=process.env.DF09_NATIVE_EVIDENCE||'/tmp/df09-analytics-native';
const timeout=ms=>new Promise(r=>setTimeout(r,ms));
const adb=(...args)=>cp.execFileSync('adb',args,{encoding:'utf8',timeout:18000,maxBuffer:1024*1024}).trim();
fs.mkdirSync(folder,{recursive:true});
const report={kind:'ANDROID_WEBVIEW_DOM_CDP_REAL_QA_DEBUG_APK',
  sourceSha:process.env.GITHUB_SHA||'UNKNOWN',androidApi:process.env.DF09_ANDROID_API||'UNKNOWN',
  results:[],status:'NOT_TESTED',nativeAccessibility:'NOT_TESTED',physicalPhone:'NOT_TESTED',
  nativeDialogs:'NOT_TESTED',safCsv:'NOT_TESTED',releaseApproved:false};
function probe(codes){
  const rows=[];
  for(const code of codes){
    const issues=[],host=document.createElement('div');
    host.setAttribute('data-df09-device-fixture','');
    document.body.appendChild(host);
    let instance;
    try{
      if(typeof window.DeepFocusAnalyticsStudioV21?.mount!=='function')
        throw Error('Missing canonical Analytics Studio runtime');
      instance=window.DeepFocusAnalyticsStudioV21.mount(host,()=>({
        cfg:{sessionHistory:[{id:'df09-real-webview-fixture',date:'2026-10-19',
          domain:'study',minutes:30,completed:true}]},tasksList:[],projects:[]
      }),{locale:code,today:'2026-10-20',startDate:'2026-10-01',endDate:'2026-10-20'});
      const panel=instance.element;
      const direction=['ar','fa','ur'].includes(code)?'rtl':'ltr';
      if(panel.getAttribute('lang')!==code)issues.push('LANG');
      if(panel.getAttribute('dir')!==direction)issues.push('DIRECTION');
      if(!panel.querySelector('h2')?.textContent?.trim())issues.push('HEADING');
      const dates=[...panel.querySelectorAll('input[type=date]')];
      if(dates.length!==2||dates.some(x=>getComputedStyle(x).direction!=='ltr'))issues.push('DATE_LTR');
      const svgs=[...panel.querySelectorAll('svg.dfa-svg')];
      if(svgs.length!==2||svgs.some(x=>x.getAttribute('role')!=='img'||!x.getAttribute('aria-label')?.trim()))
        issues.push('CHART_ACCESSIBLE_LABEL');
      if(instance.getReport()?.totals?.minutes!==30)issues.push('FIXTURE_TOTAL_30');
      if(/[\u0660-\u0669\u06f0-\u06f9\u0966-\u096f\u09e6-\u09ef]/.test(panel.textContent||''))
        issues.push('NON_WESTERN_UI_DIGITS');
      const translated=window.DF99Locale?.coverage?.([code],'analytics',['title'])?.[0]?.translated===1;
      rows.push({locale:code,status:issues.length?'FAIL':'PASS',issues,
        accessibleChartCount:svgs.length,minutes:instance.getReport()?.totals?.minutes,
        reviewedTranslation:Boolean(translated)});
    }catch(e){issues.push(String(e.message||e).slice(0,170));rows.push({locale:code,status:'FAIL',issues});}
    finally{instance?.destroy?.();host.remove();}
  }
  return {rows,url:location.href,loadedScripts:document.scripts.length,
    readyState:document.readyState,source:'installed Android WebView DOM'};
}
async function getTarget(){
  let last;
  for(let i=0;i<25;i++){
    try{
      const response=await fetch('http://127.0.0.1:9223/json/list',{signal:AbortSignal.timeout(2500)});
      if(response.ok){
        const targets=await response.json();
        const t=targets.find(x=>x.type==='page'&&
          (x.url==='file:///android_asset/web/index.html'||x.url?.includes('/android_asset/web/index.html')));
        if(t?.webSocketDebuggerUrl)return t;
        last=Error('No bundled app WebView target');
      }
    }catch(e){last=e;}
    await timeout(1000);
  }
  throw Error('Real WebView CDP target absent: '+String(last?.message||'').slice(0,150));
}
async function main(){
  const pid=adb('shell','pidof','com.zenstudy.focus.qa').split(/\s+/)[0];
  assert.match(pid,/^\d+$/,'QA package PID not available');
  adb('forward','tcp:9223','localabstract:webview_devtools_remote_'+pid);
  const target=await getTarget();
  const url=new URL(target.webSocketDebuggerUrl);
  url.hostname='127.0.0.1';url.port='9223';
  assert.ok(['ws:','wss:'].includes(url.protocol));
  const ws=new WebSocket(url);
  await new Promise((resolve,reject)=>{
    const t=setTimeout(()=>reject(Error('Real WebView WebSocket open timed out')),14000);
    ws.addEventListener('open',()=>{clearTimeout(t);resolve();},{once:true});
    ws.addEventListener('error',()=>{clearTimeout(t);reject(Error('WebView socket unavailable'));},{once:true});
  });
  try{
    const expression='('+probe.toString()+')('+JSON.stringify(codes)+')';
    const result=await new Promise((resolve,reject)=>{
      const t=setTimeout(()=>reject(Error('Android CDP Runtime.evaluate timed out')),40000);
      const listener=event=>{
        let response;try{response=JSON.parse(event.data);}catch(_){return;}
        if(response.id!==1)return;
        clearTimeout(t);ws.removeEventListener('message',listener);
        if(response.error||response.result?.exceptionDetails)
          return reject(Error('Actual WebView execution error: '+JSON.stringify(response.error||response.result.exceptionDetails).slice(0,350)));
        resolve(response.result?.result?.value);
      };
      ws.addEventListener('message',listener);
      ws.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{
        expression,returnByValue:true,awaitPromise:false}}));
    });
    assert.equal(result?.url,'file:///android_asset/web/index.html','Must inspect installed APK WebView, not a remote browser');
    assert.equal(result.rows?.length,20,'Twenty independent locale observations required');
    report.results=result.rows;
    report.status=result.rows.every(r=>r.status==='PASS')?'PASS':'FAIL';
    report.fallbackLocales=result.rows.filter(r=>!r.reviewedTranslation).map(r=>r.locale);
    report.installedWebViewUrl=result.url;
    report.pid=pid;
    assert.equal(report.status,'PASS','Android WebView chart/RTL/digits failures: '+JSON.stringify(report.results.filter(r=>r.status!=='PASS')));
    console.log(JSON.stringify({androidApi:report.androidApi,realWebViewLocalePass:20,
      fallbackReportedNotCountedAsTranslation:report.fallbackLocales,sourceSha:report.sourceSha,
      nativeAccessibility:'NOT_TESTED',nativeDialogs:'NOT_TESTED',saf:'NOT_TESTED'}));
  }finally{ws.close();}
}
main().catch(e=>{report.status='FAIL';report.error=String(e.stack||e).slice(0,850);console.error(report.error);process.exitCode=1;})
.finally(()=>{fs.writeFileSync(folder+'/ANDROID_ANALYTICS_20.json',JSON.stringify(report,null,2)+'\n');});
