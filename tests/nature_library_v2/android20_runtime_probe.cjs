'use strict';
const http=require('node:http'),fs=require('node:fs'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
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
 const expected=Number(process.env.AUDIO_QA_EXPECTED_TRACKS);assert.ok(Number.isInteger(expected)&&expected>0&&expected<=20);
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
  for(let i=0;i<18;i++){state=await evalJs(expression);if(state.ready==='complete'&&state.count===expected)break;await sleep(400);}
  assert.equal(state.url,'file:///android_asset/web/audio_review/index.html');
  assert.equal(state.visible,'visible');
  assert.equal(state.ready,'complete');
  assert.equal(state.count,expected);
  assert.equal(state.uniqueNames,expected);
  assert.equal(state.groups.length,6);
  assert.equal(state.nativeBridge,false,'Privileged data bridge must not be in Audio QA');
  const traces=[];
  async function tap(selector){
    await evalJs(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center'})`);
    await sleep(250);
    execFileSync('adb',['shell','uiautomator','dump','/sdcard/audio20.xml'],{timeout:15000});
    const xml=execFileSync('adb',['shell','cat','/sdcard/audio20.xml'],{encoding:'utf8',timeout:5000});
    const node=xml.match(/<node[^>]*class="android\.webkit\.WebView"[^>]*>/);
    assert.ok(node,'WebView frame unavailable: TEST_TRANSPORT_FAILURE');
    const bounds=node[0].match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
    assert.ok(bounds,'WebView bounds unavailable: TEST_TRANSPORT_FAILURE');
    const [left,top,right,bottom]=bounds.slice(1).map(Number);
    const pos=await evalJs(`(()=>{const e=document.querySelector(${JSON.stringify(selector)}),r=e.getBoundingClientRect();const x=r.left+r.width/2,y=r.top+r.height/2;return {x,y,w:innerWidth,h:innerHeight,hit:e.contains(document.elementFromPoint(x,y))};})()`);
    assert.ok(pos.hit&&pos.x>0&&pos.y>0&&pos.x<pos.w&&pos.y<pos.h,'Blocked control');
    const sx=(right-left)/pos.w,sy=(bottom-top)/pos.h;
    assert.ok(Math.abs(sx-sy)/Math.max(sx,sy)<.025,'Stale frame scale: TEST_TRANSPORT_FAILURE');
    const x=Math.round(left+pos.x*sx),y=Math.round(top+pos.y*sy);
    execFileSync('adb',['shell','input','tap',String(x),String(y)],{timeout:5000});
    traces.push({selector,x,y});
  }
  await evalJs(`(()=>{window.audioQaErrors=[];document.querySelectorAll('audio').forEach(a=>{a.muted=true;a.addEventListener('error',()=>audioQaErrors.push({id:a.dataset.id,code:a.error?.code}));});})()`);
  const originals=[];
  for(let i=0;i<expected;i++){
    // Groups reset nth-of-type; address the actual flattened card index instead.
    await evalJs(`document.querySelectorAll('.clip[data-playable]')[${i}].setAttribute('data-testing','current')`);
    await tap('[data-testing="current"] [data-play]');
    await sleep(1100);
    const observed=await evalJs(`(()=>{const a=document.querySelectorAll('audio')[${i}];return {id:a.dataset.id,time:a.currentTime,paused:a.paused,error:a.error?.code??null,src:a.currentSrc};})()`);
    assert.ok(!observed.paused&&observed.time>.25&&!observed.error,'Original did not decode/play: '+observed.id);
    originals.push(observed);
    await tap('[data-testing="current"] [data-stop]');
    const stopped=await evalJs(`(()=>{const a=document.querySelectorAll('audio')[${i}];return a.paused&&a.currentTime===0})()`);
    assert.ok(stopped,'Stop button did not stop/reset actual track');
    await evalJs(`document.querySelector('[data-testing="current"]').removeAttribute('data-testing')`);
  }
  await evalJs(`(()=>{const select=document.getElementById('source-mode');select.value='loop';select.dispatchEvent(new Event('change'));})()`);
  const loops=[];
  for(let i=0;i<expected;i++){
    const decoded=await evalJs(`(async()=>{const a=document.querySelectorAll('audio')[${i}];await a.play();return {duration:a.duration,src:a.currentSrc,id:a.dataset.id};})()`);
    assert.ok(decoded.duration>10&&decoded.src.includes('/loops/'),'Prepared loop missing');
    await evalJs(`document.querySelectorAll('audio')[${i}].currentTime=${decoded.duration}-.2`);
    await sleep(1100);
    const seam=await evalJs(`(()=>{const a=document.querySelectorAll('audio')[${i}];const result={id:a.dataset.id,time:a.currentTime,paused:a.paused,error:a.error?.code??null};a.pause();return result;})()`);
    assert.ok(seam.time>0&&seam.time<2&&!seam.paused&&!seam.error,'Loop wrap failed: '+seam.id);
    loops.push(seam);
  }
  await evalJs(`(async()=>{stopAllAudio();await Promise.all([...document.querySelectorAll('audio')].map(a=>a.play()));})()`);
  await sleep(1200);
  const mix=await evalJs(`(()=>{const a=[...document.querySelectorAll('audio')];return {count:a.length,active:a.filter(x=>!x.paused&&!x.error).length,gain:a.reduce((n,x)=>n+x.volume,0)};})()`);
  assert.equal(mix.active,expected);assert.ok(mix.gain<=.800001);
  await evalJs(`(()=>{const master=document.getElementById('master-volume');master.value=0;master.dispatchEvent(new Event('input'));})()`);
  assert.ok(await evalJs(`[...document.querySelectorAll('audio')].every(a=>a.volume===0)`),'Master zero is not silence');
  await evalJs(`(()=>{document.getElementById('master-volume').value=60;rebalance();})()`);
  // Optional real wall-time endurance. Not accelerated, not a listening verdict.
  const enduranceSeconds=Number(process.env.AUDIO_QA_ENDURANCE_SECONDS||0);
  assert.ok([0,1800].includes(enduranceSeconds),'Unbounded endurance duration rejected');
  const checkpoints=[];
  const started=Date.now();
  while(Date.now()-started<enduranceSeconds*1000){
    await sleep(Math.min(30000,enduranceSeconds*1000-(Date.now()-started)));
    const checkpoint=await evalJs(`(()=>{const a=[...document.querySelectorAll('audio')];return {active:a.filter(x=>!x.paused&&!x.error).length,tracks:a.map(x=>({id:x.dataset.id,time:x.currentTime,error:x.error?.code??null})),gain:a.reduce((n,x)=>n+x.volume,0),errors:audioQaErrors};})()`);
    checkpoint.elapsedSeconds=(Date.now()-started)/1000;
    assert.equal(checkpoint.active,expected,'A track stopped during endurance');
    assert.ok(checkpoint.gain<=.800001);assert.deepEqual(checkpoint.errors,[]);
    checkpoints.push(checkpoint);
    console.log('AUDIO20_ENDURANCE_CHECK',Math.round(checkpoint.elapsedSeconds),checkpoint.active);
  }
  await tap('button[onclick="stopAllAudio()"]');
  assert.ok(await evalJs(`[...document.querySelectorAll('audio')].every(a=>a.paused&&a.currentTime===0)`));
  assert.deepEqual(await evalJs('audioQaErrors'),[]);
  const result={status:'ANDROID_AUDIO_QA_ALL_ORIGINALS_LOOPS_CONTROLS_PASS',state,originals,loops,mix,traces,
    endurance:{seconds:(Date.now()-started)/1000,requested:enduranceSeconds,checkpoints,status:enduranceSeconds===1800?'PASS':'NOT_TESTED'},
    scope:'Muted decode/progression and real ADB button delivery; not human audio or seamless-listening approval',
    background:'NOT_TESTED',lockedScreen:'NOT_TESTED',bluetooth:'NOT_TESTED',physicalDevice:'DEVICE_NOT_TESTED',approved_for_release:false};
  if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(result,null,2));
  console.log(JSON.stringify({status:result.status,tracks:state.count,originals:originals.length,loops:loops.length,endurance:result.endurance.status}));
 }finally{ws.close();}
}
main().catch(e=>{console.error('AUDIO20_WEBVIEW_FAIL:',String(e));process.exitCode=1;});
