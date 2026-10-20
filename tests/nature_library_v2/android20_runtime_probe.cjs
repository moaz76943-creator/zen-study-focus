'use strict';
const http=require('node:http'),fs=require('node:fs'),assert=require('node:assert/strict');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function getList(){
 return new Promise((resolve,reject)=>{
  const req=http.get('http://127.0.0.1:9225/json/list',res=>{
   let buf='';res.setEncoding('utf8');res.on('data',s=>buf+=s);res.on('end',()=>{try{resolve(JSON.parse(buf));}catch(e){reject(e);}});
  });
  req.on('error',reject);req.setTimeout(3500,()=>req.destroy(Error('DevTools timeout')));
 });
}
async function main(){
 let page;
 for(let t=0;t<30;t++){
  try{const pages=await getList();page=pages.find(p=>p.type==='page'&&p.url==='file:///android_asset/web/audio_review/index.html');if(page)break;}catch(_){}
  await sleep(500);
 }
 assert.ok(page,'The QA app failed to show its actual sound-library WebView');
 const addr=new URL(page.webSocketDebuggerUrl);
 assert.ok(['127.0.0.1','localhost'].includes(addr.hostname));
 addr.hostname='127.0.0.1';addr.port='9225';
 const ws=new WebSocket(addr.toString());
 await new Promise((resolve,reject)=>{
  const t=setTimeout(()=>reject(Error('QA WebView CDP connect timeout')),7000);
  ws.addEventListener('open',()=>{clearTimeout(t);resolve();},{once:true});
  ws.addEventListener('error',()=>{clearTimeout(t);reject(Error('QA WebView CDP connect error'));},{once:true});
 });
 let id=0;
 function evalJs(expression){
  return new Promise((resolve,reject)=>{
   const current=++id;
   const onMessage=e=>{
    const j=JSON.parse(e.data);if(j.id!==current)return;
    clearTimeout(timer);ws.removeEventListener('message',onMessage);
    if(j.error||j.result?.exceptionDetails)reject(Error('CDP evaluation failed'));
    else resolve(j.result?.result?.value);
   };
   const timer=setTimeout(()=>{ws.removeEventListener('message',onMessage);reject(Error('CDP evaluation timed out'));},12000);
   ws.addEventListener('message',onMessage);
   ws.send(JSON.stringify({id:current,method:'Runtime.evaluate',params:{expression,awaitPromise:true,returnByValue:true}}));
  });
 }
 try{
  let state=null;
  const expression='(() => {const a=[...document.querySelectorAll("audio")];const names=a.map(x=>decodeURIComponent(new URL(x.currentSrc||x.src).pathname.split("/").pop()));return {ready:document.readyState,url:location.href,visible:document.visibilityState,count:a.length,groups:[...document.querySelectorAll("[data-sound-group]")].map(x=>x.getAttribute("data-sound-group")),uniqueNames:new Set(names).size,nativeBridge:typeof window.ZenNative!=="undefined"};})()';
  for(let i=0;i<18;i++){state=await evalJs(expression);if(state.ready==='complete'&&state.count===20)break;await sleep(400);}
  assert.equal(state.url,'file:///android_asset/web/audio_review/index.html');
  assert.equal(state.visible,'visible');
  assert.equal(state.ready,'complete');
  assert.equal(state.count,20);
  assert.equal(state.uniqueNames,20);
  assert.equal(state.groups.length,6);
  assert.equal(state.nativeBridge,false,'Privileged data bridge must not be in Audio QA');
  const first=await evalJs('(async()=>{const a=document.querySelector("audio");a.muted=true;a.volume=0.15;try{await a.play();return {ok:true,time:a.currentTime,ready:a.readyState,error:a.error?.code??null};}catch(e){return {ok:false,reason:String(e)}}})()');
  assert.equal(first.ok,true,'First actual Ogg audio could not begin playing');
  await sleep(2200);
  const later=await evalJs('(()=>{const a=document.querySelector("audio");const time=a.currentTime;const error=a.error?.code??null;a.pause();return {time,error};})()');
  assert.ok(later.time>0.5,'Decoded real audio never progressed on Android WebView');
  assert.equal(later.error,null);
  const result={status:'ANDROID_AUDIO_QA_VISIBLE_AND_AUDIO_PLAYBACK_PASS',state,first,later,approved_for_release:false};
  if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(result,null,2));
  console.log(JSON.stringify({status:result.status,tracks:state.count,groups:state.groups.length,playbackSeconds:later.time}));
 }finally{ws.close();}
}
main().catch(e=>{console.error('AUDIO20_WEBVIEW_FAIL:',String(e));process.exitCode=1;});
