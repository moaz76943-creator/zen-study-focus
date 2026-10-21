'use strict';
// Track07 isolated Android UI probe. Runs only on a fresh disposable API30 emulator.
// Uses true ADB taps for controls and CDP only for input, observation and fixture setup.
const assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process');
const {validateTouchTarget}=require('../android_e2e_recovery/cdp_touch_target.cjs');
const {parseWebViewBounds,cssPointToAndroid}=require('../android_e2e_recovery/android_device_touch.cjs');
const {readWebViewFrame}=require('../android_e2e_recovery/android_ui_hierarchy.cjs');
const adb=(...args)=>cp.execFileSync('adb',['-s','emulator-5554',...args],{encoding:'utf8',timeout:20000});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const results=[];let ws=null,sequence=0;const requests=new Map();
async function cmd(method,params={}){
 return new Promise((resolve,reject)=>{
  const id=++sequence;
  const timer=setTimeout(()=>{requests.delete(id);reject(Error('TRANSPORT: '+method+' timeout'));},20000);
  requests.set(id,{resolve,reject,timer});
  ws.send(JSON.stringify({id,method,params}));
 });
}
async function js(expression){
 const out=await cmd('Runtime.evaluate',{expression,returnByValue:true});
 return out.result?.value;
}
async function connect(){
 const pid=adb('shell','pidof','com.zenstudy.focus').trim().split(/\s/)[0];
 assert.match(pid,/^\d+$/);
 adb('forward','tcp:9222','localabstract:webview_devtools_remote_'+pid);
 let targets=[];
 for(let i=0;i<15;i++){
  try{targets=await(await fetch('http://127.0.0.1:9222/json/list',{signal:AbortSignal.timeout(3500)})).json();if(targets.length)break;}
  catch(_){}
  await sleep(500);
 }
 const target=targets.find(t=>t.type==='page'&&t.url==='file:///android_asset/web/index.html');
 assert.ok(target,'Actual bundled Android WebView DevTools page unavailable');
 const u=new URL(target.webSocketDebuggerUrl);
 assert.equal(u.protocol,'ws:');assert.equal(u.port,'9222');assert.ok(['127.0.0.1','localhost'].includes(u.hostname));
 ws=new WebSocket(u);
 await new Promise((resolve,reject)=>{
  let done=false;const timeout=setTimeout(()=>{if(!done)reject(Error('TRANSPORT: websocket not ready'));},10000);
  ws.addEventListener('open',()=>{done=true;clearTimeout(timeout);resolve();},{once:true});
  ws.addEventListener('error',()=>{done=true;clearTimeout(timeout);reject(Error('TRANSPORT: websocket error'));},{once:true});
 });
 ws.addEventListener('message',event=>{
  let data;try{data=JSON.parse(event.data);}catch(_){return;}
  const request=requests.get(data.id);if(!request)return;
  clearTimeout(request.timer);requests.delete(data.id);
  if(data.error||data.result?.exceptionDetails)request.reject(Error('CDP: '+JSON.stringify(data.error||data.result.exceptionDetails).slice(0,700)));
  else request.resolve(data.result);
 });
 await cmd('Runtime.enable');
 for(let i=0;i<30;i++){
  if(await js("document.readyState==='complete' && !!window.DF22Integration && typeof renderNotesStack==='function'"))return;
  await sleep(400);
 }
 throw Error('TRANSPORT: Android app never became ready');
}
async function restart(){
 if(ws){ws.close();ws=null;}
 adb('shell','am','force-stop','com.zenstudy.focus');
 adb('shell','am','start','-n','com.zenstudy.focus/.MainActivity');
 await sleep(2400);await connect();
}
async function touch(selector){
 const expression=JSON.stringify(selector);
 const geometry="(()=>{const n=document.querySelector("+expression+");if(!n)return {present:false};n.scrollIntoView({behavior:'instant',block:'center',inline:'nearest'});const b=n.getBoundingClientRect(),x=b.left+b.width/2,y=b.top+b.height/2,h=document.elementFromPoint(x,y);return {present:true,x,y,width:b.width,height:b.height,viewportWidth:document.documentElement.clientWidth,viewportHeight:innerHeight,hitWithin:!!h&&(n===h||n.contains(h))}})()";
 validateTouchTarget(await js(geometry));
 const frame=await readWebViewFrame(adb,{parseBounds:parseWebViewBounds,pause:sleep});
 const p=validateTouchTarget(await js(geometry));
 const actual=cssPointToAndroid({x:p.x,y:p.y,viewportWidth:p.viewportWidth,viewportHeight:p.viewportHeight},frame);
 adb('shell','input','tap',String(actual.x),String(actual.y));await sleep(300);
}
async function fill(selector,value){
 await touch(selector);
 await js("document.querySelector("+JSON.stringify(selector)+").value=''");
 await cmd('Input.insertText',{text:value});
}
async function run(name,fn){
 try{const evidence=await fn();results.push({name,status:'PASS',evidence});}
 catch(e){results.push({name,status:String(e.message).startsWith('TRANSPORT:')?'NOT_TESTED':'FAIL',detail:e.message});}
}
async function main(){
 assert.equal(process.env.DF_ANDROID_DISPOSABLE,'1','Only disposable emulator allowed');
 await restart();
 await run('draft_restore_after_actual_process_death',async()=>{
  await js("applyLanguage('en')");
  await touch('#navNotes');await touch('#nsNewButton');
  const title='Android unsaved draft ٢ '+Date.now(),body='Uncommitted Unicode العربية ٣, XSS <script>doNotRun()</script>';
  await fill('#inpNoteTitle',title);await fill('#inpNoteBody',body);await sleep(1200);
  assert.equal(await js("loadFortressData('deep_focus_unsaved_note_draft_v1',null)?.body"),body,'Draft autosave not verified');
  assert.equal(await js("notesList.filter(x=>x.title==="+JSON.stringify(title)+").length"),0);
  await restart();
  await touch('#navNotes');await touch('#nsNewButton');
  assert.equal(await js("document.getElementById('nsDraftRestore').hidden"),false,'Restore draft control not offered');
  await touch('#nsDraftRestore');
  assert.equal(await js("document.getElementById('inpNoteBody').value"),body);
  assert.equal(await js("notesList.filter(x=>x.title==="+JSON.stringify(title)+").length"),0);
  // Restored fields are set programmatically; no IME is open here. Tap Save directly.
  await touch('#nsSaveButton');
  assert.equal(await js("notesList.filter(x=>x.title==="+JSON.stringify(title)+"&&x.body==="+JSON.stringify(body)+").length"),1);
  const id=await js("notesList.find(x=>x.title==="+JSON.stringify(title)+").id");
  assert.equal(typeof id,'number');
  await restart();
  assert.equal(await js("notesList.filter(x=>x.id==="+id+"&&x.body==="+JSON.stringify(body)+").length"),1);
  return {numericNoteId:id,draftRestored:true,savedExactlyOnce:true,persistedAfterKill:true};
 });
 await run('android_webview_1000_5000_note_rendering_read_only',async()=>{
  const code="(()=>{const prior=notesList,original=JSON.stringify(prior),search=document.getElementById('inpSearchNotes'),oldSearch=search.value;const raw=Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)]);let samples=[];try{for(const size of [1000,5000]){notesList=Array.from({length:size},(_,i)=>({id:900000+i,title:'QA '+i,body:i%10===0?'needle <img src=x onerror=alert(1)>':'plain',catKey:i%2?'quick':'cornell',createdAt:i+1,updatedAt:i+1,isStarter:false,notesV21:{tags:['qa'],notebookId:'qa'}}));search.value='';let t=performance.now();renderNotesStack();const initialMs=performance.now()-t,rendered=document.querySelectorAll('.nsux-card').length;search.value='needle';t=performance.now();renderNotesStack();const filteredMs=performance.now()-t;samples.push({size,initialMs,filteredMs,rendered,visible:document.getElementById('nsVisibleCount').textContent});}}finally{notesList=prior;search.value=oldSearch;renderNotesStack();}return {samples,unchanged:JSON.stringify(prior)===original,storageUnchanged:JSON.stringify(raw)===JSON.stringify(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)]))};})()";
  const evidence=await js(code);
  assert.equal(evidence?.unchanged,true,'Original notes modified by render test');
  assert.equal(evidence?.storageUnchanged,true,'Storage mutated by render-only test');
  assert.equal(evidence.samples.length,2);
  for(const sample of evidence.samples){assert.equal(sample.rendered,100);assert.ok(sample.initialMs<8000&&sample.filteredMs<8000);assert.match(sample.visible,/100 \/ [0-9]+/);}
  return evidence;
 });
}
main().catch(e=>{results.push({name:'bootstrap',status:'NOT_TESTED',detail:String(e.message)});}).finally(()=>{
 try{ws?.close();}catch(_){}
 for(const pending of requests.values()){clearTimeout(pending.timer);pending.reject(Error('TRANSPORT: disposed'));}
 const summary={sha:process.env.GITHUB_SHA,api:process.env.ANDROID_TEST_API,environment:'fresh disposable real Android WebView via ADB/CDP',results,releaseApproved:false};
 fs.writeFileSync(process.argv[2]||'notes-android-extended.json',JSON.stringify(summary,null,2));
 console.log(JSON.stringify(summary));if(results.some(x=>x.status!=='PASS'))process.exitCode=1;
});
