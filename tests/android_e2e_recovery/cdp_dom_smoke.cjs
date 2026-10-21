#!/usr/bin/env node
'use strict';
/* Read-only CDP inspection of a debuggable Android WebView on a disposable
 * GitHub Actions emulator. No production bridge calls, app-data writes or fake
 * PASS when Android debugging or page bootstrap is unavailable.
 */
const fs=require('node:fs');
const output=process.argv[2]||null;
const endpoint='http://127.0.0.1:9222/json/list';
const pause=ms=>new Promise(done=>setTimeout(done,ms));
let report={source:'real Android WebView via local ADB-forwarded CDP',status:'NOT_TESTED',
  generated_at:new Date().toISOString(),android_api:process.env?.ANDROID_TEST_API||null,details:null,dom:null};
async function listTargets(){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),4000);
  try{
    const r=await fetch(endpoint,{signal:controller.signal});
    if(!r.ok)throw Error('CDP HTTP '+r.status);
    return await r.json();
  }finally{clearTimeout(timer);}
}
async function openWebSocket(url){
  const u=new URL(url);
  if(u.protocol!=='ws:'||!['127.0.0.1','localhost'].includes(u.hostname)||u.port!=='9222'){
    throw Error('Rejected nonlocal CDP websocket');
  }
  return await new Promise((resolve,reject)=>{
    const ws=new WebSocket(url);
    const timer=setTimeout(()=>{ws.close();reject(Error('CDP websocket timeout'));},7000);
    ws.addEventListener('open',()=>{clearTimeout(timer);resolve(ws);},{once:true});
    ws.addEventListener('error',()=>{clearTimeout(timer);reject(Error('CDP connection error'));},{once:true});
  });
}
let serial=0;
async function query(ws,expression,method="Runtime.evaluate"){
  return await new Promise((resolve,reject)=>{
    const id=++serial;
    const timer=setTimeout(()=>{ws.removeEventListener('message',message);reject(Error('CDP evaluation timed out'));},30000);
    const message=e=>{
      let payload;
      try{payload=JSON.parse(e.data);}catch(_){return;}
      if(payload.id!==id)return;
      clearTimeout(timer);ws.removeEventListener('message',message);
      if(payload.error||payload.result?.exceptionDetails)return reject(Error('CDP runtime evaluation failed'));
      resolve(method==='Runtime.evaluate'?payload.result?.result?.value:payload.result);
    };
    ws.addEventListener('message',message);
    ws.send(JSON.stringify({id,method,params:method==='Runtime.evaluate'?{expression,returnByValue:true}:{}}));
  });
}
const expression=`(() => {
  const play=document.querySelector('#mainPlayBtn');
  const timer=document.querySelector('#timerDigitsTxt');
  const tab=document.querySelector('#sec-timer');
  const rect=play?play.getBoundingClientRect():null;
  return {
    ready:document.readyState,
    title:document.title,
    url:location.href,
    timerSection:!!tab,
    playButton:!!play,
    playVisible:!!(rect&&rect.width>0&&rect.height>0),
    ariaLabel:play?play.getAttribute('aria-label'):null,
    timerText:timer?timer.textContent:null,
    toggleAvailable:typeof toggleTimerPlay==='function',
    appScriptAvailable:typeof switchTab==='function'
  };
})()`;
async function main(){
  let targets=[];
  for(let i=0;i<8;i++){
    try{targets=await listTargets();if(Array.isArray(targets)&&targets.length)break;}
    catch(e){if(i===7)throw e;}
    await pause(850);
  }
  const target=targets.find(t=>t.type==='page'&&/android_asset\/web\/index\.html/.test(t.url||''));
  if(!target?.webSocketDebuggerUrl)throw Error('No loaded bundled WebView DevTools page in target list');
  const ws=await openWebSocket(target.webSocketDebuggerUrl);
  try{
    report.protocol={runtime:await query(ws,null,'Runtime.enable')};
    let dom;
    const deadline=Date.now()+45000;
    report.readiness=[];
    do {
      dom=await query(ws,expression);
      report.dom=dom;
      report.readiness.push({ready:dom?.ready||null,timerSection:!!dom?.timerSection,playButton:!!dom?.playButton});
      if(dom?.ready==='complete')break;
      await pause(1000);
    } while(Date.now()<deadline);
    report.dom=dom;
    if(!dom||dom.ready!=='complete'||!dom.timerSection||!dom.playButton||
      !dom.playVisible||!dom.toggleAvailable||!dom.appScriptAvailable){
      report.status='FAIL';report.details='Observed Android WebView DOM/bootstrap failure';
      return;
    }
    if(!/^file:\/\/\/android_asset\/web\/index\.html/.test(dom.url||'')){
      report.status='FAIL';report.details='App loaded an unexpected origin';return;
    }
    report.status='PASS';
    report.details='Android WebView rendered timer/play controls and live JS handlers; no touch, audio, or backup behavior is claimed';
  }finally{ws.close();}
}
main().catch(e=>{report.details=e.message;report.status='NOT_TESTED';})
.finally(()=>{
  if(output){fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');}
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  if(report.status!=='PASS')process.exitCode=1;
});
