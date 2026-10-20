'use strict';
// Real disposable Android WebView actions. Does not claim TalkBack, hearing, DND or physical-phone acceptance.
const fs=require('node:fs'),cp=require('node:child_process'),assert=require('node:assert/strict');
const {validateTouchTarget,missingPrerequisites,classifyFailure}=require('./cdp_touch_target.cjs');
const {parseWebViewBounds,cssPointToAndroid}=require('./android_device_touch.cjs');
const CASES=['preflight','navigation','dialog_back','touch_scroll','western_numerals','accessibility_smoke','notes_create_edit','tasks_create','task_subtasks','save_failure','copy_export','language_live_change','timer_start_pause','completion_notification','process_death_recovery','orientation_restore','long_text','talkback','data_integrity','calendar_and_sounds'];
const results=new Map(CASES.map(id=>[id,{id,status:'NOT_TESTED',detail:'Outside this instrumented action scope; requires separate device/manual evidence'}]));
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const adb=(...args)=>cp.execFileSync('adb',['-s','emulator-5554',...args],{encoding:'utf8',timeout:20000});
let ws,serial=0,pending=new Map();
const touchTrace=[];
async function connect(){
 const pid=adb('shell','pidof','com.zenstudy.focus').trim().split(/\s/)[0];
 assert.match(pid,/^\d+$/);adb('forward','tcp:9222','localabstract:webview_devtools_remote_'+pid);
 let targets=[];
 for(let i=0;i<15;i++){try{targets=await(await fetch('http://127.0.0.1:9222/json/list',{signal:AbortSignal.timeout(4000)})).json();if(targets.length)break;}catch(_){}await pause(500);}
 const target=targets.find(t=>t.type==='page'&&t.url==='file:///android_asset/web/index.html');
 if(!target)throw Error('TRANSPORT: bundled page unavailable');
 const u=new URL(target.webSocketDebuggerUrl);assert.ok(['127.0.0.1','localhost'].includes(u.hostname)&&u.protocol==='ws:'&&u.port==='9222');
 ws=new WebSocket(u);
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('TRANSPORT: websocket open timeout')),10000);ws.addEventListener('open',()=>{clearTimeout(timer);resolve();},{once:true});ws.addEventListener('error',()=>{clearTimeout(timer);reject(Error('TRANSPORT: websocket error'));},{once:true});});
 ws.addEventListener('message',event=>{let data;try{data=JSON.parse(event.data);}catch(_){return;}const request=pending.get(data.id);if(!request)return;pending.delete(data.id);clearTimeout(request.timer);if(data.error||data.result?.exceptionDetails)request.reject(Error((data.error?'TEST_PROTOCOL: ':'TEST_EVALUATION: ')+JSON.stringify(data.error||data.result.exceptionDetails).slice(0,500)));else request.resolve(data.result);});
 await call('Runtime.enable');
}
function call(method,params={}){return new Promise((resolve,reject)=>{const id=++serial;const timer=setTimeout(()=>{pending.delete(id);reject(Error('TRANSPORT: '+method+' timed out'));},20000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}));});}
async function evaluate(expression){return (await call('Runtime.evaluate',{expression,returnByValue:true})).result?.value;}
async function ready(){for(let i=0;i<30;i++){if(await evaluate("document.readyState==='complete' && typeof toggleTimerPlay==='function' && !!window.DF22Integration"))return;await pause(1000);}throw Error('App readiness deadline exceeded');}
async function touch(expression){
 // The Android bottom bar is horizontally scrollable in RTL/LTR. A DOM node can
 // have width/height > 0 while its center is completely off-screen or occluded.
 const r=await evaluate(`(()=>{
   const n=${expression};
   if(!n)return {present:false,selector:${JSON.stringify(expression)}};
   n.scrollIntoView({behavior:'instant',block:'center',inline:'nearest'});
   const bounds=n.getBoundingClientRect();
   const x=bounds.left+bounds.width/2,y=bounds.top+bounds.height/2;
   const hit=document.elementFromPoint(x,y);
   const hitName=hit?hit.tagName.toLowerCase()+
     (hit.id?'#'+hit.id:'')+(hit.className&&typeof hit.className==='string'
       ?'.'+hit.className.trim().split(/\\s+/).slice(0,2).join('.'):''):'none';
   return {present:true,selector:${JSON.stringify(expression)},x,y,
     width:bounds.width,height:bounds.height,
     viewportWidth:document.documentElement.clientWidth,
     viewportHeight:window.innerHeight,
     hitWithin:!!hit&&(n===hit||n.contains(hit)),hit:hitName};
 })()`);
 const target=validateTouchTarget(r);
 // The API30 run proved CDP synthetic touch did not emit ANY WebView touch/click event,
 // even for a visible, unobstructed 44px target. Use Android's actual input pipeline.
 let hierarchy;
 try {
   adb('shell','uiautomator','dump','/sdcard/deep_focus_device_touch.xml');
   hierarchy=adb('shell','cat','/sdcard/deep_focus_device_touch.xml');
 } catch(e) {
   throw Error('TRANSPORT: Cannot read real Android WebView frame: '+String(e.message).slice(0,180));
 }
 const box=parseWebViewBounds(hierarchy);
 const physical=cssPointToAndroid({...target,viewportWidth:r.viewportWidth,viewportHeight:r.viewportHeight},box);
 try {
   adb('shell','input','tap',String(physical.x),String(physical.y));
 } catch(e) {
   throw Error('TRANSPORT: Android ADB input tap rejected: '+String(e.message).slice(0,180));
 }
 await pause(250);
 const evidence={selector:expression,x:target.x,y:target.y,hit:r.hit,viewportWidth:r.viewportWidth,
   viewportHeight:r.viewportHeight,adb:physical,webViewBounds:box,source:'actual adb input tap'};
 touchTrace.push(evidence);
 return evidence;
}
const element=selector=>`document.querySelector(${JSON.stringify(selector)})`;
const tap=selector=>touch(element(selector));
const button=(container,text)=>`[...${element(container)}.querySelectorAll('button')].find(n=>n.textContent.trim()===${JSON.stringify(text)})`;
async function fill(selector,text){await tap(selector);await evaluate(`${element(selector)}.value=''`);await call('Input.insertText',{text});}
async function dismissNoteKeyboardForSave(){
 const before=await evaluate("({open:document.getElementById('noteModal').classList.contains('open'),body:document.getElementById('inpNoteBody').value,viewport:window.innerHeight})");
 assert.equal(before?.open,true,'Cannot dismiss keyboard when note editor is closed');
 // Normal Android Back while IME owns focus dismisses keyboard before a visible Save tap.
 adb('shell','input','keyevent','4');
 let after;
 for(let n=0;n<14;n++){
   await pause(200);
   after=await evaluate("({open:document.getElementById('noteModal').classList.contains('open'),body:document.getElementById('inpNoteBody').value,viewport:window.innerHeight})");
   if(!after?.open||after?.viewport>=before.viewport+80)break;
 }
 assert.equal(after?.open,true,'Android Back closed the unsaved note editor instead of dismissing keyboard');
 assert.equal(after?.body,before.body,'draft body changed when hiding keyboard');
 return {beforeHeight:before.viewport,afterHeight:after.viewport};
}

async function check(expression,message){assert.equal(await evaluate(expression),true,message);}
async function run(id,fn){try{const detail=await fn();results.set(id,{id,status:'PASS',detail:typeof detail==='string'?detail:'Executed on disposable Android WebView using ADB taps, CDP text input and observed state'});}catch(e){results.set(id,{id,status:(/^(TRANSPORT:|DEPENDENCY_NOT_TESTED:)/).test(e.message)?'NOT_TESTED':'FAIL',classification:classifyFailure(e),detail:e.message});}console.log(JSON.stringify(results.get(id)));}
async function restart(){ws.close();adb('shell','am','force-stop','com.zenstudy.focus');adb('shell','am','start','-n','com.zenstudy.focus/.MainActivity');await pause(3000);await connect();await ready();}
async function main(){
 if(process.env.DF_ANDROID_DISPOSABLE!=='1')throw Error('TRANSPORT: fresh disposable-profile acknowledgement is required');
 await connect();await ready();
 await run('preflight',()=>check("location.href==='file:///android_asset/web/index.html' && !!document.querySelector('#mainPlayBtn')",'Actual local app identity'));
 await run('navigation',async()=>{
   // Diagnostic-only event capture: no synthetic clicks and no PASS substitution.
   await evaluate("window.__dfNavTrace=[];window.__dfNavErrors=[];document.querySelector('.bottom-nav-capsule').addEventListener('touchstart',e=>window.__dfNavTrace.push({kind:'touchstart',trusted:e.isTrusted}),true);document.querySelector('.bottom-nav-capsule').addEventListener('touchend',e=>window.__dfNavTrace.push({kind:'touchend',trusted:e.isTrusted}),true);document.querySelector('.bottom-nav-capsule').addEventListener('click',e=>window.__dfNavTrace.push({kind:'click',id:e.target.closest('.bnav-btn')?.id||'',trusted:e.isTrusted}),true);window.addEventListener('error',e=>window.__dfNavErrors.push(e.message),true)");
   for(const [id,section] of [['navTasks','sec-tasks'],['navCalendar','sec-calendar'],['navNotes','sec-notes'],['navTimer','sec-timer'],['navTraining','sec-timer'],['navSounds','sec-sounds'],['navAnalytics','sec-analytics']]){
     const physical=await tap('#'+id);
     const observed=await evaluate(`(()=>{
       const target=document.querySelector('#${section}');
       return {sectionActive:!!target&&target.classList.contains('active'),
         navActive:[...document.querySelectorAll('.bnav-btn.active')].map(n=>n.id),
         visibleTab:${JSON.stringify(id)},
         physical:${JSON.stringify(physical)},
         clickHandler:typeof document.getElementById(${JSON.stringify(id)}).onclick,
         touchEvents:window.__dfNavTrace.slice(-6),
         runtimeErrors:window.__dfNavErrors.slice(-3)};
     })()`);
     assert.ok(observed?.sectionActive&&observed.navActive.length===1&&observed.navActive[0]===id,
       'After actual touch of #'+id+': '+JSON.stringify(observed));
   }
 });
 await run('notes_create_edit',async()=>{
  await tap('#navNotes');await tap('#nsNewButton');await fill('#inpNoteTitle','Android fixture ٢');await fill('#inpNoteBody','Unicode العربية ٣ — preserved');await dismissNoteKeyboardForSave();await tap('#nsSaveButton');
  await check("notesList.some(n=>n.title==='Android fixture ٢'&&n.body==='Unicode العربية ٣ — preserved'&&!n.isStarter)",'Created Unicode note');
  await touch(`[...document.querySelectorAll('.nsux-card')].find(n=>n.querySelector('h3')?.textContent==='Android fixture ٢')?.querySelector('.nsux-actions button')`);await fill('#inpNoteBody','Edited Unicode العربية ٣');await dismissNoteKeyboardForSave();await tap('#nsSaveButton');
  await check("notesList.filter(n=>n.title==='Android fixture ٢').length===1 && notesList.find(n=>n.title==='Android fixture ٢').body==='Edited Unicode العربية ٣'",'One edited record');
 });
 await run('tasks_create',async()=>{
  await tap('#navTasks');await fill('.df-quick input','Android fixture task');await tap('.df-quick button[type=submit]');
  await check("tasksList.filter(t=>t.title==='Android fixture task'&&!t.isStarter).length===1",'One real task');
  // Undated quick-added tasks may not appear in Today. This DOM view change is
  // fixture setup only; create/complete/reopen remain physical ADB interactions.
  await check("(()=>{const sel=document.querySelector('.df-view-mode');if(!sel)return false;sel.value='all';sel.dispatchEvent(new Event('change',{bubbles:true}));return [...document.querySelectorAll('.df-task')].some(n=>n.querySelector('.df-title')?.textContent==='Android fixture task')})()",'Quick-added task appears in all-items view');
  const card=`[...document.querySelectorAll('.df-task')].find(n=>n.querySelector('.df-title')?.textContent==='Android fixture task')`;
  await touch(`${card}.querySelector('.df-primary-action')`);await check("tasksList.find(t=>t.title==='Android fixture task').done===true",'Complete');
  await touch(`${card}.querySelector('.df-primary-action')`);await check("tasksList.find(t=>t.title==='Android fixture task').done===false",'Reopen');
 });
 await run('timer_start_pause',async()=>{
  await tap('#navTimer');await evaluate("selectTimerMode(1,'focus',null)");const count=await evaluate('cfg.sessions');
  await tap('#mainPlayBtn');await pause(2200);await tap('#mainPlayBtn');const left=await evaluate('timerLeft');assert.ok(left<=59&&left>=54,'Actual elapsed seconds');
  await pause(1200);assert.equal(await evaluate('timerLeft'),left,'Paused clock stable');await tap('#mainPlayBtn');await pause(1200);await tap('#mainPlayBtn');
  await evaluate('resetTimerNow()');assert.equal(await evaluate('cfg.sessions'),count,'Reset cannot grant focus credit');
 });
 await run('save_failure',async()=>{
  await tap('#navNotes');await tap('#nsNewButton');await fill('#inpNoteTitle','Quota fixture');await fill('#inpNoteBody','Do not lose edits');await dismissNoteKeyboardForSave();
  const old=await evaluate('JSON.stringify(notesList)');
  await evaluate("window.fixtureSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('Fixture quota','QuotaExceededError')}");
  try{await tap('#nsSaveButton');assert.equal(await evaluate('JSON.stringify(notesList)'),old);await check("document.querySelector('#noteModal').classList.contains('open')",'Failed save keeps editor');}
  finally{await evaluate('Storage.prototype.setItem=window.fixtureSetItem;delete window.fixtureSetItem');}
  await tap('#nsSaveButton');await check("notesList.some(n=>n.title==='Quota fixture')",'Retry committed');
 });
 await run('language_live_change',async()=>{
  await tap('#navNotes');await tap('#nsNewButton');await fill('#inpNoteTitle','Unsaved ٢');await evaluate("applyLanguage('ar')");
  await check("document.querySelector('#nsux-preview-toggle').textContent==='معاينة' && document.querySelector('#inpNoteTitle').value==='Unsaved ٢'",'Open-editor locale and authored text');
  await evaluate("applyLanguage('en')");await dismissNoteKeyboardForSave();await tap('#nsSaveButton');
 });
 await run('dialog_back',async()=>{await tap('#navNotes');await tap('#nsNewButton');adb('shell','input','keyevent','4');await pause(500);await check("!document.querySelector('#noteModal').classList.contains('open')",'Android Back closes empty editor');});
 await run('western_numerals',async()=>{await evaluate("applyLanguage('ar')");await tap('#navTimer');await check("/^[0-9]{2}:[0-9]{2}$/.test(document.querySelector('#timerDigitsTxt').textContent)",'ASCII timer in RTL');await evaluate("applyLanguage('en')");});
 await run('calendar_and_sounds',async()=>{
  await tap('#navCalendar');await tap('.cal-day-cell');await check("document.querySelectorAll('.cal-day-cell[aria-pressed=true]').length===1",'Actual day selection');
  await evaluate("window.fixtureMedia=[];window.fixturePlay=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){window.fixtureMedia.push(this);return window.fixturePlay.call(this)}");
  await tap('#navSounds');await tap('.sound-Rich-tile.sbg-forest .stile-play-btn');await tap('.sound-Rich-tile.sbg-wind .stile-play-btn');await pause(1000);
  await check("window.fixtureMedia.length===2 && window.fixtureMedia.every(a=>!a.paused&&!a.error&&a.readyState>=2) && Object.keys(activePlayers).length===2",'Two local decoded media channels');
  await evaluate("stopAllAudio();HTMLMediaElement.prototype.play=window.fixturePlay;delete window.fixturePlay");await check('Object.keys(activePlayers).length===0','Stop all releases tracks');
 });
 await run('completion_notification',async()=>{
  await tap('#navTimer');await evaluate("selectTimerMode(1,'focus',null)");const before=await evaluate('cfg.sessionHistory?.length||0');
  await tap('#mainPlayBtn');adb('shell','input','keyevent','3');await pause(62000);adb('shell','am','start','-n','com.zenstudy.focus/.MainActivity');await pause(2500);
  // Activity recreation may have replaced the devtools target. Reattach only to the same local app.
  ws.close();await connect();await ready();await pause(1000);
  assert.equal(await evaluate('cfg.sessionHistory.length'),before+1,'One real completed work session');
  await check('cfg.sessionHistory[cfg.sessionHistory.length-1].minutes===1','One real elapsed minute');
  return 'Actual 1-minute work session background/return credit once; notification appearance/hearing/DND remain NOT_TESTED';
 });
 await run('data_integrity',async()=>{await evaluate("window.fixtureBackup=generateEncryptedBackupCode();window.fixtureConfirm=window.confirm;window.confirm=()=>true");try{await check('verifyAndRestoreBackupCode(window.fixtureBackup)===true','Real ZEN21 roundtrip');}finally{await evaluate('window.confirm=window.fixtureConfirm;delete window.fixtureBackup;delete window.fixtureConfirm');}});
 await run('process_death_recovery',async()=>{
  const missing=missingPrerequisites(results,['notes_create_edit','tasks_create']);
  if(missing.length)throw Error('DEPENDENCY_NOT_TESTED: saved note/task fixtures were not verified: '+missing.join(','));
  await restart();await check("notesList.some(n=>n.title==='Android fixture ٢'&&n.body==='Edited Unicode العربية ٣') && tasksList.some(t=>t.title==='Android fixture task'&&!t.done)",'Real process restart preserves note/task');});
}
main().catch(e=>{results.set('preflight',{id:'preflight',status:e.message.startsWith('TRANSPORT:')?'NOT_TESTED':'FAIL',classification:classifyFailure(e),detail:e.message});}).finally(()=>{
 try{ws?.close();}catch(_){}for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('TRANSPORT: disposed'));}pending.clear();
 const rows=[...results.values()],report={source:'Real Android WebView ADB taps with CDP inspection/text input, fresh disposable profile',sha:process.env.GITHUB_SHA||null,api:process.env.ANDROID_TEST_API||null,results:rows,touches:touchTrace,counts:Object.fromEntries(['PASS','FAIL','NOT_TESTED'].map(s=>[s,rows.filter(r=>r.status===s).length])),release_approved:false};
 fs.writeFileSync(process.argv[2]||'android-dom-actions.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(rows.some(r=>r.status!=='PASS'))process.exitCode=1;
});
