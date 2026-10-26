'use strict';
// Strict disposable Android E2E: CDP reads real WebView state, ADB physically taps/back.
// Never monkeypatch window.confirm, simulate clicks or modify v21 packets.
const fs=require('node:fs'),cp=require('node:child_process'),assert=require('node:assert/strict');
const {parseWebViewBounds,cssPointToAndroid}=require('../android_e2e_recovery/android_device_touch.cjs');
const {readWebViewFrame}=require('../android_e2e_recovery/android_ui_hierarchy.cjs');
const serial=process.env.DF_TRACK05_SERIAL||'emulator-5554',file=process.argv[2];
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const adb=(...args)=>cp.execFileSync('adb',['-s',serial,...args],{encoding:'utf8',timeout:25000}).trim();
const cases=[];let ws,seq=0;const pending=new Map();
function record(name,status,detail,evidence){const r={name,status,detail,evidence:evidence||null};cases.push(r);console.log(JSON.stringify(r))}
async function connect(){
 const pid=adb('shell','pidof','com.zenstudy.focus').split(/\s/)[0];
 if(!/^\d+$/.test(pid))throw Error('TRANSPORT: no app PID');
 adb('forward','tcp:9222','localabstract:webview_devtools_remote_'+pid);
 let pages=[],target;
 for(let n=0;n<20;n++){
  try{pages=await(await fetch('http://127.0.0.1:9222/json/list',{signal:AbortSignal.timeout(4000)})).json()}catch(_){}
  target=pages.find(p=>p.type==='page'&&p.url==='file:///android_asset/web/index.html');
  if(target)break;await pause(500);
 }
 if(!target)throw Error('TRANSPORT: no Android asset WebView CDP target');
 const url=new URL(target.webSocketDebuggerUrl);
 if(url.protocol!=='ws:'||url.port!=='9222'||!['localhost','127.0.0.1'].includes(url.hostname))throw Error('TEST_INFRA: unsafe CDP url');
 ws=new WebSocket(url);
 await new Promise((res,rej)=>{const t=setTimeout(()=>rej(Error('TRANSPORT: websocket timeout')),10000);
 ws.addEventListener('open',()=>{clearTimeout(t);res()},{once:true});
 ws.addEventListener('error',()=>{clearTimeout(t);rej(Error('TRANSPORT: websocket error'))},{once:true})});
 ws.addEventListener('message',event=>{let p;try{p=JSON.parse(event.data)}catch(_){return}
 const req=pending.get(p.id);if(!req)return;pending.delete(p.id);clearTimeout(req.timer);
 if(p.error||p.result?.exceptionDetails)req.reject(Error('TEST_PROTOCOL: '+JSON.stringify(p.error||p.result.exceptionDetails).slice(0,300)));
 else req.resolve(p.result)});
 await call('Runtime.enable');
}
function call(method,params={}){
 return new Promise((res,rej)=>{const id=++seq,timer=setTimeout(()=>{pending.delete(id);rej(Error('TRANSPORT: '+method+' timeout'))},20000);
 pending.set(id,{resolve:res,reject:rej,timer});ws.send(JSON.stringify({id,method,params}))});
}
async function evalJs(code){const r=await call('Runtime.evaluate',{expression:code,returnByValue:true});return r.result?.value}
async function ready(){for(let n=0;n<25;n++){if(await evalJs("document.readyState==='complete'&&typeof toggleTimerPlay==='function'"))return;await pause(500)}throw Error('TRANSPORT: app readiness timeout')}
async function restart(){
 ws.close();try{adb('forward','--remove','tcp:9222')}catch(_){}
 adb('shell','am','force-stop','com.zenstudy.focus');adb('shell','am','start','-n','com.zenstudy.focus/.MainActivity');
 await pause(3500);await connect();await ready();
}
async function tap(selector){
 const geo=await evalJs("(()=>{const e=document.querySelector("+JSON.stringify(selector)+");if(!e)return null;e.scrollIntoView({behavior:'instant',block:'center',inline:'nearest'});const r=e.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,h=document.elementFromPoint(x,y);return {x,y,width:r.width,height:r.height,viewportWidth:document.documentElement.clientWidth,viewportHeight:window.innerHeight,hit:!!h&&(h===e||e.contains(h))}})()");
 if(!geo||!geo.hit||geo.width<=0||geo.height<=0||geo.x<0||geo.y<0||geo.x>=geo.viewportWidth||geo.y>=geo.viewportHeight)throw Error('UI_TARGET_OCCLUDED: '+selector);
 const frame=await readWebViewFrame(adb,{parseBounds:parseWebViewBounds,pause});
 const p=cssPointToAndroid(geo,frame);adb('shell','input','tap',String(p.x),String(p.y));await pause(350);
}
async function state(){return evalJs("({id:timerSessionId,mode:currentTimerModeKey,total:timerTotal,left:timerLeft,running:timerRunning,activeMs:timerActiveMs,history:cfg.sessionHistory?.length||0,sessions:cfg.sessions})")}
async function nativeXml(){
 for(let i=0;i<4;i++){
  adb('shell','uiautomator','dump','/sdcard/track05-native.xml');
  const xml=adb('shell','cat','/sdcard/track05-native.xml');
  if(xml.includes('Deep Focus')&&!xml.includes('file://')&&xml.includes('android:id/button1'))return xml;
  await pause(400);
 }
 throw Error('TRANSPORT: branded native confirmation not observable');
}
async function approve(){
 const xml=await nativeXml(),node=(xml.match(/<node\b[^>]*>/g)||[]).find(n=>n.includes('resource-id="android:id/button1"'));
 const m=node&&/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/.exec(node);
 if(!m)throw Error('TRANSPORT: native OK button unavailable');
 const [a,b,c,d]=m.slice(1).map(Number);assert.ok(c>a&&d>b);
 adb('shell','input','tap',String(Math.round((a+c)/2)),String(Math.round((b+d)/2)));await pause(500);
}
async function test(name,fn){
 try{record(name,'PASS','Observed Android outcome',await fn())}
 catch(e){const msg=String(e.message||e).slice(0,320);record(name,/^(TRANSPORT:|TEST_INFRA:|TEST_PROTOCOL:|DEPENDENCY_NOT_TESTED:)/.test(msg)?'NOT_TESTED':'FAIL',msg)}
}
async function main(){
 assert.equal(process.env.DF_TRACK05_DISPOSABLE,'1','TEST_INFRA: explicit fresh profile required');
 assert.match(serial,/^emulator-\d+$/);assert.equal(adb('shell','getprop','ro.kernel.qemu'),'1');
 await connect();await ready();
 await test('preflight',async()=>{assert.equal(await evalJs('location.href'),'file:///android_asset/web/index.html');return {physicalDevice:false,webview:true}});
 if(cases.at(-1).status!=='PASS')return;
 await test('start-pause-resume',async()=>{
  await tap('#navTimer');await tap('#modeFocusBtn');await tap('#mainPlayBtn');
  const a=await state();assert.ok(a.running&&a.id&&a.mode==='focus');
  await pause(2400);await tap('#mainPlayBtn');const b=await state();assert.equal(b.id,a.id);assert.equal(b.running,false);
  await pause(1300);assert.equal((await state()).left,b.left);
  await tap('#mainPlayBtn');await pause(1900);const c=await state();assert.equal(c.id,a.id);assert.ok(c.running&&c.left<b.left);
  return {sessionId:a.id,start:a.left,paused:b.left,resumed:c.left};
 });
 if(cases.at(-1).status!=='PASS')return;
 await test('20-locales-native-back-preserves-session',async()=>{
  const locales=['en','ar','es','zh','hi','fr','de','ru','pt','ja','id','tr','ko','vi','it','bn','ur','fa','pl','nl'];
  for(const lang of locales){
   await evalJs('applyLanguage('+JSON.stringify(lang)+')');
   const before=await state();await tap('#modeShortBtn');await nativeXml();
   adb('shell','input','keyevent','4');await pause(400);
   const after=await state();
   assert.equal(after.id,before.id,lang+' session identity');
   assert.equal(after.total,before.total,lang+' duration');
   assert.equal(after.mode,before.mode,lang+' mode');
   assert.equal(after.running,true,lang+' running');
   assert.equal(after.sessions,before.sessions,lang+' completion count');
  }
  return {locales,tested:locales.length,realNativeCancel:true};
 });
 await test('pause-force-stop-reopen',async()=>{
  if(!(await state()).running)throw Error('DEPENDENCY_NOT_TESTED: no active focus session');
  await tap('#mainPlayBtn');const before=await state();
  await restart();const after=await state();
  assert.equal(after.id,before.id);assert.equal(after.left,before.left);
  assert.equal(after.activeMs,before.activeMs);assert.equal(after.running,false);
  return {id:after.id,seconds:after.left};
 });
 await test('running-force-stop-reopen',async()=>{
  const before=await state();await tap('#mainPlayBtn');const start=await state();
  assert.equal(start.id,before.id);await pause(1300);await restart();
  const after=await state();assert.equal(after.id,start.id);assert.equal(after.running,true);assert.ok(after.left<start.left);
  return {id:after.id,seconds:after.left};
 });
 await test('native-accept-short-long',async()=>{
  await tap('#modeShortBtn');await approve();const a=await state();assert.equal(a.mode,'short');assert.equal(a.id,null);
  await tap('#mainPlayBtn');await pause(900);await tap('#mainPlayBtn');
  assert.equal((await state()).sessions,a.sessions,'Rest must not credit Focus');
  await tap('#modeLongBtn');await approve();const b=await state();assert.equal(b.mode,'long');assert.equal(b.id,null);
  return {shortSec:a.total,longSec:b.total,restCredited:false};
 });
}
main().catch(e=>record('bootstrap','NOT_TESTED',String(e.message||e).slice(0,250))).finally(()=>{
 const out={headSha:process.env.GITHUB_SHA||null,source:'actual disposable Android emulator + CDP + ADB',cases,summary:{pass:cases.filter(x=>x.status==='PASS').length,fail:cases.filter(x=>x.status==='FAIL').length,notTested:cases.filter(x=>x.status==='NOT_TESTED').length},releaseApproved:false};
 if(file)fs.writeFileSync(file,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out.summary));
 try{ws?.close()}catch(_){}
 if(out.summary.fail)process.exitCode=1;else if(out.summary.notTested)process.exitCode=2;
});