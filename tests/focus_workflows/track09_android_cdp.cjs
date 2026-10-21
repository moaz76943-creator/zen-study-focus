'use strict';
// Read-only Track09 DOM inspection of the actual debug APK's Android WebView.
// This does NOT certify user touches, force-stop restoration or native ACK.
const fs=require('node:fs');
const path=process.argv[2];
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const report={source:'Android emulator WebView / local CDP',source_sha:process.env.TRACK09_SOURCE_SHA||null,
 status:'NOT_TESTED',checks:{},reason:null,readOnly:true,releaseApproved:false};
let ws=null,seq=0;
async function targets(){
 const response=await fetch('http://127.0.0.1:9222/json/list',{signal:AbortSignal.timeout(4500)});
 if(!response.ok)throw Error('Local CDP target list unavailable');
 return response.json();
}
async function evaluate(expression){
 return new Promise((resolve,reject)=>{
  const id=++seq;
  const timer=setTimeout(()=>{ws.removeEventListener('message',receive);reject(Error('CDP timeout'));},25000);
  function receive(event){
   let msg;try{msg=JSON.parse(event.data);}catch(_){return;}
   if(msg.id!==id)return;
   clearTimeout(timer);ws.removeEventListener('message',receive);
   if(msg.error||msg.result?.exceptionDetails)return reject(Error('WebView evaluation failed'));
   resolve(msg.result?.result?.value);
  }
  ws.addEventListener('message',receive);
  ws.send(JSON.stringify({id,method:'Runtime.evaluate',
   params:{expression,returnByValue:true}}));
 });
}
async function main(){
 let list=[];
 for(let i=0;i<12;i++){
  try{list=await targets();if(list.some(x=>x.type==='page'&&x.url==='file:///android_asset/web/index.html'))break;}
  catch(_){}
  await sleep(1000);
 }
 const page=list.find(x=>x.type==='page'&&x.url==='file:///android_asset/web/index.html');
 if(!page?.webSocketDebuggerUrl)throw Error('No debuggable bundled WebView target');
 const url=new URL(page.webSocketDebuggerUrl);
 if(url.protocol!=='ws:'||!['127.0.0.1','localhost'].includes(url.hostname)||url.port!=='9222')
  throw Error('Non-local CDP endpoint refused');
 ws=new WebSocket(url);
 await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('WebSocket connection timeout')),10000);
  ws.addEventListener('open',()=>{clearTimeout(timer);resolve();},{once:true});
  ws.addEventListener('error',()=>{clearTimeout(timer);reject(Error('WebSocket connection error'));},{once:true});
 });
 const expression="(() => {"+
  "const goals=document.querySelectorAll('#dailyGoalsRows .goal-row');"+
  "const input=document.getElementById('goalsEditGrid');"+
  "const modal=document.getElementById('dailyGoalsModal');"+
  "const nav=document.getElementById('navCalendar');"+
  "const calendar=document.getElementById('sec-calendar');"+
  "return {ready:document.readyState,origin:location.href,goals:goals.length,"+
  "renderGoal:typeof renderDailyGoals==='function',"+
  "readHistory:typeof gsRecordedMinutes==='function',"+
  "navigateDay:typeof goToHomeAgenda==='function',"+
  "quickTraining:typeof startQuickTraining==='function',"+
  "calendar:!!calendar,navCalendar:!!nav,modal:!!modal,"+
  "trainingPanel:!!document.getElementById('qtProgressPanel'),"+
  "inputContainer:!!input,sessionCount:(()=>{try{return typeof cfg==='object'&&cfg!==null&&Array.isArray(cfg.sessionHistory)?cfg.sessionHistory.length:null;}catch(_){return null;}})(),"+
  "generatedNumbers:(document.getElementById('dailyGoalsRows')?.textContent||''),"+
  "packagePage:!!document.getElementById('mainPlayBtn')};"+
  "})()";
 let state;
 for(let i=0;i<30;i++){
  state=await evaluate(expression);
  if(state?.ready==='complete'&&state.goals===4)break;
  await sleep(500);
 }
 const checks={
  bundledOrigin:state?.origin==='file:///android_asset/web/index.html',
  documentReady:state?.ready==='complete',
  goalRows:state?.goals===4,
  goalSourceAndHistory:!!state?.renderGoal&&!!state?.readHistory,
  realCalendarControls:!!state?.calendar&&!!state?.navCalendar&&!!state?.navigateDay,
  quickTrainingControls:!!state?.quickTraining&&!!state?.trainingPanel,
  goalEditor:!!state?.modal&&!!state?.inputContainer,
  westernDigits:!/[\u0660-\u0669\u06f0-\u06f9]/.test(state?.generatedNumbers||''),
  timerPresent:!!state?.packagePage
 };
 report.checks=checks;
 report.sessionCount=state?.sessionCount;
 report.status=Object.values(checks).every(Boolean)?'PASS':'FAIL';
 if(report.status!=='PASS')report.reason='Observed missing WebView components: '+Object.keys(checks).filter(k=>!checks[k]).join(',');
}
main().catch(error=>{report.status='NOT_TESTED';report.reason=String(error.message).slice(0,350);})
.finally(()=>{
 try{ws?.close();}catch(_){}
 if(path)fs.writeFileSync(path,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report));
 if(report.status!=='PASS')process.exitCode=1;
});
