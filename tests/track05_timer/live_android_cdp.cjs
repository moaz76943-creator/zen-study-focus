'use strict';
// Strict disposable Android E2E: CDP reads real WebView state, ADB physically taps/back.
// Never monkeypatch window.confirm, simulate clicks or modify v21 packets.
const fs=require('node:fs'),cp=require('node:child_process'),assert=require('node:assert/strict');
const {parseWebViewBounds,cssPointToAndroid}=require('../android_e2e_recovery/android_device_touch.cjs');
const {readWebViewFrame}=require('../android_e2e_recovery/android_ui_hierarchy.cjs');
const {completionReceipt}=require('./completion_receipts.cjs');
const FOCUSED_COMPLETION_CASES=Object.freeze([
 'custom-one-minute-natural-completion-persisted-once',
 'quick-20-10-natural-work-rest-completes-without-rest-credit'
]);
// Selection changes scheduling only. Each selected callback still runs against
// the real Android device; deferred release-QA cases are never counted as PASS.
function createQaSelection(level='full'){
 if(level!=='full'&&level!=='focused')throw Error('TEST_INFRA: invalid DF_TRACK05_QA_LEVEL');
 const seen=new Set(),executed=new Set(),deferred=[];
 return {
  level,deferred,
  async run(name,fn){
   if(seen.has(name))throw Error('TEST_INFRA: duplicate timer QA case '+name);
   seen.add(name);
   if(level==='focused'&&name!=='preflight'&&!FOCUSED_COMPLETION_CASES.includes(name)){
    deferred.push({name,reason:'LEVEL_2_FULL_QA: retained for intentional full acceptance'});
    return {executed:false};
   }
   executed.add(name);
   return {executed:true,value:await fn()};
  },
  verify(){
   if(executed.size===0)throw Error('TEST_INFRA: timer QA executed no cases');
   if(level==='focused')for(const name of ['preflight',...FOCUSED_COMPLETION_CASES]){
    if(!executed.has(name))throw Error('TEST_INFRA: required focused timer QA case missing: '+name);
   }
  }
 };
}
module.exports={createQaSelection};
let qa;
const serial=process.env.DF_TRACK05_SERIAL||'emulator-5554',file=process.argv[2];
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const adb=(...args)=>{
 try{return cp.execFileSync('adb',['-s',serial,...args],{encoding:'utf8',timeout:25000,stdio:['ignore','pipe','pipe']}).trim()}
 catch(_){throw Error('TRANSPORT: ADB command failed or timed out')}
};
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
// Only the preinstalled disposable emulator may be cleared; never touch user data.
async function cleanQAProfile(){
 assert.equal(process.env.DF_TRACK05_DISPOSABLE,'1');
 assert.equal(adb('shell','getprop','ro.kernel.qemu'),'1');
 ws.close();try{adb('forward','--remove','tcp:9222')}catch(_){}
 assert.match(adb('shell','pm','clear','com.zenstudy.focus'),/Success/);
 // This suite measures timer behavior with notification permission granted.
 // Clearing the disposable profile also revokes it on API33+.
 if(Number(adb('shell','getprop','ro.build.version.sdk'))>=33)
  adb('shell','pm','grant','com.zenstudy.focus','android.permission.POST_NOTIFICATIONS');
 adb('shell','am','start','-n','com.zenstudy.focus/.MainActivity');
 await pause(3500);await connect();await ready();
}
async function tap(selector){
 const geo=await evalJs("(()=>{const e=document.querySelector("+JSON.stringify(selector)+");if(!e)return null;e.scrollIntoView({behavior:'instant',block:'center',inline:'nearest'});const r=e.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,h=document.elementFromPoint(x,y);return {x,y,width:r.width,height:r.height,viewportWidth:document.documentElement.clientWidth,viewportHeight:window.innerHeight,hit:!!h&&(h===e||e.contains(h))}})()");
 if(!geo||!geo.hit||geo.width<=0||geo.height<=0||geo.x<0||geo.y<0||geo.x>=geo.viewportWidth||geo.y>=geo.viewportHeight)throw Error('UI_TARGET_OCCLUDED: '+selector);
 const frame=await readWebViewFrame(adb,{parseBounds:parseWebViewBounds,pause});
 const p=cssPointToAndroid(geo,frame);adb('shell','input','tap',String(p.x),String(p.y));await pause(350);
}
async function verifiedNativeTimerSnapshot(){
 const v=await evalJs("(()=>{const raw=window.ZenNative?.readActiveTimerSnapshot?.();if(!raw||raw==='ERROR'||raw==='NONE')return {ok:false,reason:String(raw)};try{const p=JSON.parse(raw),valid=computeHash(p.payload)===p.sig,s=JSON.parse(p.payload);return {ok:valid,id:s.sessionId,left:s.left,running:s.running,activeMs:s.activeMs};}catch(e){return {ok:false,reason:'packet_invalid'};}})()");
 assert.equal(v.ok,true,'Actual Android native AtomicFile readback must verify');
 return v;
}
async function state(){return evalJs("({id:timerSessionId,mode:currentTimerModeKey,total:timerTotal,left:timerLeft,running:timerRunning,activeMs:timerActiveMs,history:cfg.sessionHistory?.length||0,sessions:cfg.sessions||0,lang:cfg.lang,domain:cfg.domain,training:quickTraining?.active?{sets:quickTraining.sets,set:quickTraining.currentSet,phase:quickTraining.phase,domain:quickTraining.domain,taskId:quickTraining.taskId}:null})")}
async function completedReceipts(ids,minutes,remainderSec=0){
 const values=await evalJs("({live:cfg,stored:loadFortressData('zen_fortress_cfg_v21',null)})");
 const live=completionReceipt(values.live,ids,minutes,remainderSec);
 const stored=completionReceipt(values.stored,ids,minutes,remainderSec);
 assert.deepEqual(stored,live,'Stored completion differs from actual live ledger');
 return stored;
}
async function waitForActualState(predicate,description,timeoutMs){
 const deadline=Date.now()+timeoutMs;
 while(Date.now()<deadline){
  const current=await state();
  if(predicate(current))return current;
  await pause(400);
 }
 throw Error('APP_STATE: actual timer did not '+description+' within '+timeoutMs+'ms');
}
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
 try{const result=await qa.run(name,fn);if(result.executed)record(name,'PASS','Observed Android outcome',result.value)}
 catch(e){const msg=String(e.message||e).slice(0,320);record(name,/^(TRANSPORT:|TEST_INFRA:|TEST_PROTOCOL:|DEPENDENCY_NOT_TESTED:)/.test(msg)?'NOT_TESTED':'FAIL',msg)}
}
async function main(){
 qa=createQaSelection(process.env.DF_TRACK05_QA_LEVEL||'full');
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
 // Native 20-language dialog acceptance belongs to DF-FINAL-01 #322, not the
 // independent active-timer process-kill checkpoint acceptance in #402.
 await test('pause-force-stop-reopen',async()=>{
  if(!(await state()).running)throw Error('DEPENDENCY_NOT_TESTED: no active focus session');
  await tap('#mainPlayBtn');const before=await state();
  const nativeBefore=await verifiedNativeTimerSnapshot();
  assert.equal(nativeBefore.id,before.id);
  assert.equal(nativeBefore.running,false);
  assert.equal(nativeBefore.left,before.left);
  await restart();const after=await state();
  const nativeAfter=await verifiedNativeTimerSnapshot();
  assert.deepEqual(nativeAfter,nativeBefore,'Native pause snapshot changed across force-stop');
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
 // Import only the missing physical Back/20-locale behavior from historical #136.
 // Use native Android UIAutomator for every confirmation, never a mocked JS dialog.
 await test('native-20-locale-mode-cancel',async()=>{
  const baseline=await state();
  assert.ok(baseline.running&&baseline.id&&baseline.mode==='focus');
  const locales=['en','ar','es','zh','hi','fr','de','ru','pt','ja','id','tr','ko','vi','it','bn','ur','fa','pl','nl'];
  const checked=[];
  for(const lang of locales){
   let dialogOpened=false;
   try {
    assert.equal(await evalJs("applyLanguage("+JSON.stringify(lang)+");cfg.lang"),lang);
    const before=await state();
    const expected=await evalJs("quickText('replacePrompt')");
    assert.ok(typeof expected==='string'&&expected.trim().length>5,lang+' missing translated confirm');
    await tap('#modeShortBtn');
    dialogOpened=true;
    const raw=await nativeXml();
    const decoded=raw.replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
    assert.ok(decoded.includes(expected),lang+' actual native AlertDialog omitted localized prompt');
    adb('shell','input','keyevent','4'); // real Android Back: destructive action is cancelled
    dialogOpened=false;
    await pause(600);
    const after=await state();
    for(const key of ['id','mode','total','running','history','sessions']){
      assert.equal(after[key],before[key],lang+': Back changed '+key);
    }
    assert.ok(after.left>0&&after.left<=before.left,lang+' countdown invalid after Back');
    checked.push(lang);
   } finally {
    if(dialogOpened){try{adb('shell','input','keyevent','4')}catch(_){}await pause(500)}
   }
  }
  return {locales:checked,confirmedCancels:checked.length,originalSessionId:baseline.id};
 });
 // A new disposable profile isolates training from the prior focus-session E2E.
 await test('quick-work-rest-relaunch-cancel',async()=>{
  await cleanQAProfile();
  await tap('#navTimer');
  await evalJs("document.getElementById('quickTrainingDetails').open=true;true");
  await tap("button[data-qt='presetWork']");
  await evalJs("document.getElementById('qtSets').value='2';document.getElementById('qtWork').value='04:00';document.getElementById('qtRest').value='04:00';true");
  const initial=await state();
  await tap('#qtStartButton');
  const first=await state();
  assert.ok(first.running&&first.id&&first.training?.phase==='work');
  assert.equal(first.training.set,0);assert.equal(first.training.sets,2);
  assert.equal(first.training.domain,'work');assert.equal(first.domain,'work');
  await tap("#qtProgressPanel button[data-qt='skipStep']");
  const resting=await state();
  assert.ok(resting.running&&resting.id&&resting.training?.phase==='rest');
  assert.equal(resting.training.set,0);
  assert.equal(resting.history,initial.history,'Skipped work must not credit minutes');
  assert.equal(resting.sessions,initial.sessions,'Skipped work must not add sessions');
  assert.equal(await evalJs("applyLanguage('ar');cfg.lang"),'ar');
  const localized=await state();
  assert.equal(localized.training.phase,'rest');
  assert.equal(localized.id,resting.id);
  await restart(); // real process kill and restore during Rest
  const restored=await state();
  assert.ok(restored.training?.phase==='rest'&&restored.running,'Work/Rest was lost on relaunch '+JSON.stringify({resting,localized,restored}));
  assert.equal(restored.id,resting.id,'Rest session ID changed on process restart');
  await tap("#qtProgressPanel button[data-qt='skipStep']");
  const second=await state();
  assert.equal(second.training?.phase,'work');assert.equal(second.training.set,1);
  assert.equal(second.history,initial.history);assert.equal(second.sessions,initial.sessions);
  await tap("#qtProgressPanel button[data-qt='stopTraining']");
  const native=await nativeXml();assert.ok(native.includes('Deep Focus'));
  adb('shell','input','keyevent','4');await pause(500);
  const rejected=await state();
  assert.deepEqual(rejected.training,second.training,'Android Back cancelled actual End dialog');
  assert.equal(rejected.id,second.id);assert.equal(rejected.running,true);
  await tap("#qtProgressPanel button[data-qt='stopTraining']");
  await approve();
  const ended=await state();
  assert.equal(ended.training,null);assert.equal(ended.running,false);
  assert.equal(ended.history,initial.history,'Unfinished training cannot credit completed sessions');
  assert.equal(ended.sessions,initial.sessions);
  return {domain:first.domain,phases:['work','rest','work'],restRelaunch:true,locale:'ar',cancelBackPreserved:true,endConfirmed:true,credits:ended.sessions-initial.sessions};
 });
 await test('paused-mode-change-rejected-save-reopen',async()=>{
  await cleanQAProfile();
  await tap('#navTimer');await tap('#modeFocusBtn');await tap('#mainPlayBtn');
  await pause(1500);await tap('#mainPlayBtn');
  const before=await state(),nativeBefore=await verifiedNativeTimerSnapshot();
  assert.ok(before.id&&!before.running&&before.mode==='focus');
  // Reject the real write, while consent and mode controls remain physical taps.
  // Never replace a packet with fabricated content or mock the native dialog.
  await evalJs("window.__dfModeOriginalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='zen_fortress_active_timer_v21')throw new DOMException('Disposable mode ACK fault','QuotaExceededError');return window.__dfModeOriginalSetItem.call(this,k,v);};true");
  try {
   await tap('#modeShortBtn');await approve();
   assert.deepEqual(await state(),before,'Rejected mode save changed paused session');
   assert.deepEqual(await verifiedNativeTimerSnapshot(),nativeBefore);
  } finally {
   await evalJs("Storage.prototype.setItem=window.__dfModeOriginalSetItem;delete window.__dfModeOriginalSetItem;true");
  }
  await restart();
  const after=await state();
  for(const key of ['id','mode','total','left','running','activeMs','history','sessions'])assert.equal(after[key],before[key],key+' changed after rejected mode / restart');
  return {id:before.id,modePreserved:true,nativeReceiptPreserved:true,reopen:true};
 });
 await test('custom-one-minute-natural-completion-persisted-once',async()=>{
  await cleanQAProfile();await tap('#navTimer');await tap('#modeCustomBtn');
  // One minute is the product's supported minimum. Never replace Date/timers,
  // call finalizeTimerSession, or fabricate the active snapshot for this test.
  await evalJs("document.getElementById('inpCustomMins').value='1';document.getElementById('inpCustomTitle').value='N02 actual custom';true");
  await tap('#customTimerModal .mbtn-pri');
  const saved=await state();
  assert.equal(saved.mode,'custom');assert.equal(saved.total,60);assert.equal(saved.running,false);
  assert.match(await evalJs('customSessionLabel'),/N02 actual custom/);
  await tap('#mainPlayBtn');
  const started=await state();
  assert.equal(started.mode,'custom');assert.equal(started.total,60);
  assert.ok(started.running&&started.id&&started.left>0&&started.left<=60);
  const native=await verifiedNativeTimerSnapshot();
  assert.equal(native.id,started.id);assert.equal(native.running,true);
  const began=Date.now();
  const finished=await waitForActualState(s=>!s.running&&s.sessions===1,'naturally complete custom minute',90000);
  assert.equal(finished.history,1);
  const first=await completedReceipts([started.id],[1]);
  await pause(8000);
  assert.deepEqual(await completedReceipts([started.id],[1]),first,'Completion callback duplicated credit');
  await restart();
  assert.deepEqual(await completedReceipts([started.id],[1]),first,'Reopen duplicated or lost custom completion');
  return {sessionId:started.id,requestedSeconds:60,naturalWaitMs:Date.now()-began,minutes:1,storedHistoryCount:1,reopened:true,duplicateObservationMs:8000};
 });
 await test('quick-20-10-natural-work-rest-completes-without-rest-credit',async()=>{
  await cleanQAProfile();await tap('#navTimer');
  await evalJs("document.getElementById('quickTrainingDetails').open=true;true");
  // Check the real 4/1 preset without claiming a five-minute natural run.
  await tap("button[data-qt='presetWorkout']");
  assert.deepEqual(await evalJs("({work:document.getElementById('qtWork').value,rest:document.getElementById('qtRest').value})"),{work:'04:00',rest:'01:00'});
  await tap("button[data-qt='presetTabata']");
  assert.deepEqual(await evalJs("({work:document.getElementById('qtWork').value,rest:document.getElementById('qtRest').value})"),{work:'00:20',rest:'00:10'});
  await evalJs("document.getElementById('qtSets').value='2';document.getElementById('qtSkipLast').checked=false;true");
  await tap('#qtStartButton');
  const first=await state();
  assert.ok(first.running&&first.id&&first.training?.phase==='work');
  assert.equal(first.training.set,0);assert.equal(first.training.sets,2);
  assert.equal(first.total,20);assert.equal(first.domain,'sport');
  const startedAt=Date.now(),phases=['work:0'],workIds=[first.id],restIds=[];
  const rest1=await waitForActualState(s=>s.training?.phase==='rest'&&s.training.set===0,'enter first natural rest',40000);
  assert.equal(rest1.total,10);assert.equal(rest1.sessions,1);assert.equal(rest1.history,1);
  restIds.push(rest1.id);phases.push('rest:0');
  const firstWork=await completedReceipts(workIds,[0],20);
  assert.equal(firstWork.history[0].domain,'sport');
  const work2=await waitForActualState(s=>s.training?.phase==='work'&&s.training.set===1,'finish first natural rest',25000);
  assert.equal(work2.total,20);assert.equal(work2.sessions,1);assert.equal(work2.history,1);
  assert.notEqual(work2.id,first.id);workIds.push(work2.id);phases.push('work:1');
  // Rest produced neither a record nor extra seconds in the work remainder.
  assert.deepEqual(await completedReceipts([first.id],[0],20),firstWork);
  const rest2=await waitForActualState(s=>s.training?.phase==='rest'&&s.training.set===1,'enter second natural rest',40000);
  assert.equal(rest2.total,10);assert.equal(rest2.sessions,2);assert.equal(rest2.history,2);
  restIds.push(rest2.id);phases.push('rest:1');
  const secondWork=await completedReceipts(workIds,[0,0],40);
  assert.ok(secondWork.history.every(row=>row.domain==='sport'));
  const done=await waitForActualState(s=>!s.training&&!s.running,'naturally finish two work/rest rounds',25000);
  assert.equal(done.sessions,2);assert.equal(done.history,2);phases.push('completed');
  assert.ok(restIds.every(id=>!workIds.includes(id)),'Rest reused a credited work ID');
  assert.deepEqual(await completedReceipts(workIds,[0,0],40),secondWork,'Final rest credited minutes or changed ledger');
  await pause(8000);await restart();
  assert.deepEqual(await completedReceipts(workIds,[0,0],40),secondWork,'Reopen duplicated or lost training credit');
  return {requestedWorkSeconds:20,requestedRestSeconds:10,sets:2,phases,workIds,restIds,minutes:0,workRemainderSeconds:40,naturalWaitMs:Date.now()-startedAt,reopened:true,workoutPresetVerifiedOnly:true};
 });
 await test('quick-4-1-natural-cycle-persists-four-work-minutes-and-no-rest-credit',async()=>{
  await cleanQAProfile();await tap('#navTimer');
  await evalJs("document.getElementById('quickTrainingDetails').open=true;true");
  await tap("button[data-qt='presetWorkout']");
  assert.deepEqual(await evalJs("({work:document.getElementById('qtWork').value,rest:document.getElementById('qtRest').value})"),{work:'04:00',rest:'01:00'});
  await evalJs("document.getElementById('qtSets').value='1';document.getElementById('qtSkipLast').checked=false;true");
  await tap('#qtStartButton');
  const work=await state(),began=Date.now();
  assert.ok(work.running&&work.id&&work.training?.phase==='work');
  assert.equal(work.total,240);assert.equal(work.training.sets,1);
  const native=await verifiedNativeTimerSnapshot();assert.equal(native.id,work.id);assert.equal(native.running,true);
  const rest=await waitForActualState(s=>s.training?.phase==='rest','naturally finish four work minutes',290000);
  assert.equal(rest.total,60);assert.equal(rest.sessions,1);assert.equal(rest.history,1);
  assert.notEqual(rest.id,work.id,'Rest must have its own uncredited identity');
  const credit=await completedReceipts([work.id],[4],0);
  const done=await waitForActualState(s=>!s.training&&!s.running,'naturally finish final one-minute rest',90000);
  assert.equal(done.sessions,1);assert.equal(done.history,1);
  assert.deepEqual(await completedReceipts([work.id],[4],0),credit,'Final rest credited focus minutes');
  await pause(8000);await restart();
  assert.deepEqual(await completedReceipts([work.id],[4],0),credit,'Reopen duplicated or lost 4/1 work credit');
  return {requestedWorkSeconds:240,requestedRestSeconds:60,sets:1,workId:work.id,restId:rest.id,minutes:4,naturalWaitMs:Date.now()-began,reopened:true};
 });
}
if(require.main===module)main().catch(e=>record('bootstrap','NOT_TESTED',String(e.message||e).slice(0,250))).finally(()=>{
 if(qa)try{qa.verify()}catch(error){record('qa-selection','FAIL',String(error.message).slice(0,320))}
 const out={headSha:process.env.DF_TEST_SOURCE_SHA||process.env.GITHUB_SHA||null,source:'actual disposable Android emulator + CDP + ADB',qaLevel:qa?.level||process.env.DF_TRACK05_QA_LEVEL||'full',deferredTests:qa?.deferred||[],cases,summary:{pass:cases.filter(x=>x.status==='PASS').length,fail:cases.filter(x=>x.status==='FAIL').length,notTested:cases.filter(x=>x.status==='NOT_TESTED').length},releaseApproved:false};
 if(file)fs.writeFileSync(file,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out.summary));
 try{ws?.close()}catch(_){}
 if(out.summary.fail)process.exitCode=1;else if(out.summary.notTested)process.exitCode=2;
});
