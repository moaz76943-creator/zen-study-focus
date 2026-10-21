#!/usr/bin/env node
'use strict';
/* Run on the GitHub runner against the emulator's *real* Android WebView.
   Synthetic fixtures are ephemeral in one Runtime.evaluate invocation: no
   localStorage, native bridge, v21 mutations or fabricated session credits. */
const fs=require('node:fs');
const assert=require('node:assert/strict');
const output=process.argv[2];
assert.ok(output,'Evidence JSON output path required');
const endpoint='http://127.0.0.1:9222/json/list';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
let ws,id=0;
async function attach(){
 let targets;
 for(let i=0;i<20;i++){
   try{
     const res=await fetch(endpoint,{signal:AbortSignal.timeout(4000)});
     if(res.ok){targets=await res.json();if(targets.length)break;}
   }catch(_){}
   await delay(400);
 }
 const target=targets?.find(x=>x.type==='page'&&x.url==='file:///android_asset/web/index.html');
 assert.ok(target?.webSocketDebuggerUrl,'Android asset WebView CDP target unavailable');
 const url=new URL(target.webSocketDebuggerUrl);
 assert.ok(url.protocol==='ws:'&&['127.0.0.1','localhost'].includes(url.hostname)&&url.port==='9222');
 ws=new WebSocket(url);
 await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('CDP websocket open timeout')),10000);
   ws.addEventListener('open',()=>{clearTimeout(timer);resolve();},{once:true});
   ws.addEventListener('error',()=>{clearTimeout(timer);reject(Error('CDP websocket failed'));},{once:true});
 });
}
async function evaluate(expression){
 const current=++id;
 return await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{ws.removeEventListener('message',onMessage);reject(Error('CDP execution timeout'));},60000);
   function onMessage(message){
     let data;try{data=JSON.parse(message.data)}catch{return}
     if(data.id!==current)return;
     clearTimeout(timer);ws.removeEventListener('message',onMessage);
     if(data.error||data.result?.exceptionDetails)return reject(Error('WebView JS error '+JSON.stringify(data.error||data.result.exceptionDetails).slice(0,300)));
     resolve(data.result?.result?.value);
   }
   ws.addEventListener('message',onMessage);
   ws.send(JSON.stringify({id:current,method:'Runtime.evaluate',params:{expression,returnByValue:true,awaitPromise:true}}));
 });
}
const js=`(()=> {
  'use strict';
  const notesCore=window.DeepFocusNotesCoreV21;
  const tasksCore=window.DeepFocusTasksCoreV21;
  const analyticsCore=window.DeepFocusAnalyticsRecovery;
  if(!notesCore?.search||!tasksCore?.searchTasks||!analyticsCore?.buildReport)throw Error('Production source modules not loaded');
  const notes=Array.from({length:5000},(_,i)=>({id:i,title:'Note '+i,
    body:i%100===0?'target_keyword lecture':'ordinary lecture',isStarter:false,createdAt:i,updatedAt:i,catKey:'quick'}));
  const tasks={cfg:{},tasksList:Array.from({length:1000},(_,i)=>({
    id:i,title:i%10===0?'Target task '+i:'Other task '+i,date:'2026-10-19',
    catKey:'study',done:false,isStarter:false,status:'todo'}))};
  const state={sessionHistory:Array.from({length:10000},(_,i)=>({
    id:'verified-'+i,date:'2026-10-19',minutes:25,domain:'study',mode:'focus',completed:true}))};
  const operations=[
    ['notes.search/5000',()=>notesCore.search(notes,{query:'target_keyword',limit:30}),
      r=>r.total===50&&r.items.length===30],
    ['tasks.search/1000',()=>tasksCore.searchTasks(tasks,{query:'Target'}),
      r=>r.length===100&&r[0].id===0],
    ['analytics.report/10000',()=>analyticsCore.buildReport(state,{
      today:'2026-10-19',startDate:'2026-10-19',endDate:'2026-10-19'}),
      r=>r.quality.accepted===10000&&r.quality.duplicates===0&&r.totals.sessions===10000&&r.totals.minutes===250000]
  ];
  const timings=[];
  for(const [name,fn,verify] of operations){
    for(let i=0;i<2;i++)if(!verify(fn()))throw Error(name+' warmup output mismatch');
    const ms=[];
    for(let i=0;i<9;i++){
      const start=performance.now();const result=fn();
      ms.push(performance.now()-start);
      if(!verify(result))throw Error(name+' result mismatch');
    }
    ms.sort((a,b)=>a-b);
    timings.push({name,medianMs:ms[4],p95Ms:ms[8],maxMs:ms[8],over50ms:ms.filter(x=>x>50).length});
  }
  const tabs=[['navTasks','sec-tasks'],['navCalendar','sec-calendar'],['navNotes','sec-notes'],
    ['navTimer','sec-timer'],['navTraining','sec-timer'],['navSounds','sec-sounds'],['navAnalytics','sec-analytics']];
  const navigation=[];
  for(const [button,section] of tabs){
    const b=document.getElementById(button),s=document.getElementById(section);
    if(!b||!s){navigation.push({button,section,ok:false,reason:'missing DOM'});continue;}
    b.click();navigation.push({button,section,ok:s.classList.contains('active')});
  }
  if(navigation.some(x=>!x.ok))throw Error('Offline DOM navigation failure '+JSON.stringify(navigation));
  if(location.href!=='file:///android_asset/web/index.html')throw Error('Unexpected app origin');
  if(notes.length!==5000||tasks.tasksList.length!==1000||state.sessionHistory.length!==10000)
    throw Error('Fixture count mutation');
  return {source:'real emulator Android WebView / JS core, synthetic non-persisted fixtures',
    url:location.href,readiness:document.readyState,
    platform:navigator.userAgent,clock:'WebView performance.now, not Android startup/CPU',
    fixtures:{notes:notes.length,tasks:tasks.tasksList.length,sessions:state.sessionHistory.length},
    metrics:timings,offlineDomNavigation:navigation,
    generatedNumbers:/^[0-9]{2}:[0-9]{2}$/.test(document.getElementById('timerDigitsTxt')?.textContent||'')};
})()`;
let record={status:'NOT_TESTED',source_sha:process.env.GITHUB_SHA||null,webview:null};
(async()=>{
 await attach();
 for(let i=0;i<25;i++){
   const ready=await evaluate("document.readyState==='complete' && typeof toggleTimerPlay==='function'");
   if(ready)break;
   if(i===24)throw Error('WebView app readiness timeout');
   await delay(500);
 }
 record.webview=await evaluate(js);
 assert.equal(record.webview.offlineDomNavigation.length,7);
 assert.ok(record.webview.generatedNumbers,'Expected Western ASCII timer digits');
 record.status='PASS';
})().catch(e=>{record.status='FAIL';record.error=String(e.message).slice(0,1000);process.exitCode=1;})
.finally(()=>{try{ws?.close()}catch(_){}fs.writeFileSync(output,JSON.stringify(record,null,2)+'\n');
 console.log(JSON.stringify(record,null,2));});
