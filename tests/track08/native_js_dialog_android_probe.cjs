'use strict';
/* Prove genuine Android system AlertDialog host rather than browser-origin popup.
 * Tests JS confirm Cancel / Accept, JS alert Accept and prompt text+Cancel.
 * All stimuli are synthetic (no task, timer, notes or app user state touched).
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const {execFileSync}=require('node:child_process');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const E=process.argv[2]||'/tmp/df-p0-dialogs';
fs.mkdirSync(E,{recursive:true});
const adb=(...args)=>execFileSync('adb',args,{encoding:'utf8',timeout:16000,maxBuffer:3*1024*1024});
function pages(){return new Promise((resolve,reject)=>{
 http.get('http://127.0.0.1:9223/json/list',res=>{
  let buf='';res.setEncoding('utf8');
  res.on('data',x=>buf+=x);res.on('end',()=>{try{resolve(JSON.parse(buf));}catch(e){reject(e);}});
 }).on('error',reject).setTimeout(3500,function(){this.destroy(Error('DevTools list timeout'));});
});}
function buttons(xml){
 const nodes=[...xml.matchAll(/<node\b[^>]*\/>/g)].map(m=>m[0]);
 return nodes.filter(n=>/class="android\.widget\.Button"/.test(n)).map(n=>{
  const bounds=n.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
  const text=n.match(/text="([^"]*)"/);
  if(!bounds)return null;
  return {text:text?.[1]||'',x:Math.floor((+bounds[1]+ +bounds[3])/2),
    y:Math.floor((+bounds[2]+ +bounds[4])/2)};
 }).filter(Boolean);
}
async function dialog(expected){
 let last='';
 for(let n=0;n<4;n++){
  try{
   adb('shell','uiautomator','dump','/sdcard/df-p0-dialog.xml');
   last=adb('shell','cat','/sdcard/df-p0-dialog.xml');
   if(last.includes('Deep Focus')&&last.includes(expected)){
    assert.doesNotMatch(last,/file:\/\/|تعرض الصفحة في|The page at/,'Browser-origin dialog leaked');
    return last;
   }
  }catch(e){last=String(e);}
  await sleep(750);
 }
 throw Error('REAL_NATIVE_DIALOG_NOT_PROVEN '+expected+' '+last.slice(0,350));
}
async function main(){
 assert.equal(typeof WebSocket,'function','Node 22 WebSocket required');
 let target;
 for(let i=0;i<20;i++){
  try{target=(await pages()).find(p=>p.type==='page'&&p.url==='file:///android_asset/web/index.html');if(target)break;}catch(_){}
  await sleep(500);
 }
 assert.ok(target,'No actual trusted WebView target');
 const url=new URL(target.webSocketDebuggerUrl);assert.equal(url.protocol,'ws:');
 assert.ok(['127.0.0.1','localhost'].includes(url.hostname));
 url.hostname='127.0.0.1';url.port='9223';
 const ws=new WebSocket(url);
 await new Promise((resolve,reject)=>{
  let timer=setTimeout(()=>reject(Error('CDP open timed out')),10000);
  ws.addEventListener('open',()=>{clearTimeout(timer);resolve();},{once:true});
  ws.addEventListener('error',()=>{clearTimeout(timer);reject(Error('CDP open failed'));},{once:true});
 });
 let next=0;const waiting=new Map();
 ws.addEventListener('message',ev=>{
  let reply;try{reply=JSON.parse(ev.data);}catch(_){return;}
  const pending=waiting.get(reply.id);
  if(!pending)return;
  waiting.delete(reply.id);clearTimeout(pending.timer);
  if(reply.error||reply.result?.exceptionDetails){pending.reject(Error('CDP JavaScript failed '+JSON.stringify(reply.error||reply.result.exceptionDetails).slice(0,600)));return;}
  pending.resolve(reply.result?.result);
 });
 const evaluate=expr=>{
  const id=++next;
  return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{waiting.delete(id);reject(Error('Native dialog CDP completion timed out'));},60000);
   waiting.set(id,{resolve,reject,timer});
   ws.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression:expr,returnByValue:true,awaitPromise:false}}));
  });
 };
 const results=[];
 try{
  // Actual modal Cancel must return JS false; never replace user's timer session.
  const cancelled=evaluate('window.confirm("DF Confirm CANCEL Arabic: تغيير النشاط سينهي الجلسة الحالية")');
  let xml=await dialog('DF Confirm CANCEL Arabic:');
  fs.writeFileSync(E+'/cancel-dialog.xml',xml);
  fs.writeFileSync(E+'/cancel-dialog.png',execFileSync('adb',['exec-out','screencap','-p'],{timeout:18000,maxBuffer:9*1024*1024}));
  adb('shell','input','keyevent','KEYCODE_BACK');
  assert.equal((await cancelled).value,false,'Back/Cancel must reject action');
  results.push({operation:'confirm_cancel',status:'PASS',nativeTitle:'Deep Focus',jsResult:false});
  // Explicit positive button, real onJsConfirm -> true.
  const confirmed=evaluate('window.confirm("DF Confirm ACCEPT")');
  xml=await dialog('DF Confirm ACCEPT');
  const options=buttons(xml);
  assert.ok(options.length>=1,'No native actionable dialog button in UI hierarchy');
  const positive=options.sort((a,b)=>b.x-a.x)[0];
  adb('shell','input','tap',String(positive.x),String(positive.y));
  assert.equal((await confirmed).value,true,'Native affirmative must return true');
  results.push({operation:'confirm_accept',status:'PASS',button:positive.text,jsResult:true});
  // Alert acknowledges without browser origin; the return value is undefined.
  const alertPromise=evaluate('window.alert("DF Alert CHECK")');
  xml=await dialog('DF Alert CHECK');
  const ok=buttons(xml).sort((a,b)=>b.x-a.x)[0];
  assert.ok(ok,'Missing native alert OK');
  adb('shell','input','tap',String(ok.x),String(ok.y));
  const alertResult=await alertPromise;
  assert.equal(alertResult.type,'undefined');
  results.push({operation:'alert_accept',status:'PASS'});
  // Prompt maintains user supplied default and returns content only on acceptance.
  const prompted=evaluate('window.prompt("DF Prompt CHECK", "نص للاختبار")');
  xml=await dialog('DF Prompt CHECK');
  assert.ok(xml.includes('نص للاختبار'),'Native EditText default not preserved');
  const yes=buttons(xml).sort((a,b)=>b.x-a.x)[0];
  assert.ok(yes,'Missing native prompt affirmative');
  adb('shell','input','tap',String(yes.x),String(yes.y));
  assert.equal((await prompted).value,'نص للاختبار','Native prompt text lost');
  results.push({operation:'prompt_accept',status:'PASS',preservedText:true});
  const cancelPrompt=evaluate('window.prompt("DF Prompt CANCEL", "محفوظ")');
  await dialog('DF Prompt CANCEL');
  adb('shell','input','keyevent','KEYCODE_BACK');
  const cancelledPrompt=await cancelPrompt;
  assert.equal(cancelledPrompt.type,'object');
  assert.equal(cancelledPrompt.value,null,'Prompt cancel must be null');
  results.push({operation:'prompt_cancel',status:'PASS'});

  // Verify the actual app's destructive Timer buttons in the disposable QA
  // profile. Each native BACK must keep the same in-progress focus session.
  const stateExpr='({mode:currentTimerModeKey,total:timerTotal,session:timerSessionId,running:timerRunning,active:timerActiveMs,label:customSessionLabel})';
  const focus=async()=>{
    const info=(await evaluate('(()=>{if(timerRunning)toggleTimerPlay();selectTimerMode(25,"focus",document.getElementById("modeFocusBtn"));toggleTimerPlay();return '+stateExpr+';})()')).value;
    assert.equal(info.running,true,'Synthetic focus session did not start');
    return info;
  };
  const rejectionCopy=(await evaluate('quickText("replacePrompt")')).value;
  assert.ok(rejectionCopy&&rejectionCopy.length>10,'Missing localized active-session warning');
  const guardedControls=[
    ['modeShortBtn','document.getElementById("modeShortBtn").click()'],
    ['modeLongBtn','document.getElementById("modeLongBtn").click()'],
    ['resetTimerNow','document.querySelector(\'button[onclick="resetTimerNow()"]\').click()'],
    ['skipTimerPhase','document.querySelector(\'button[onclick="skipTimerPhase()"]\').click()'],
    ['sportRest45','document.getElementById("sportRest45").click()']
  ];
  for(const [name,click] of guardedControls){
    const before=await focus();
    const result=evaluate('(()=>{'+click+';return '+stateExpr+';})()');
    const hierarchy=await dialog(rejectionCopy);
    assert.ok(hierarchy.includes('Deep Focus'),'Missing branded native dialog for '+name);
    adb('shell','input','keyevent','KEYCODE_BACK');
    const after=(await result).value;
    for(const field of ['mode','total','session','running','label']){
      assert.deepEqual(after[field],before[field],name+': Cancel changed '+field);
    }
    results.push({operation:name+'_cancel',status:'PASS',nativeTitle:'Deep Focus',sessionPreserved:true});
  }
  const customBefore=await focus();
  const customForm=(await evaluate('(()=>{document.getElementById("modeCustomBtn").click();document.getElementById("inpCustomMins").value="47";document.getElementById("inpCustomTitle").value="QA custom label";return document.getElementById("customTimerModal").classList.contains("open");})()')).value;
  assert.equal(customForm,true,'Custom Timer modal not open');
  const customCancel=evaluate('(()=>{document.querySelector(\'#customTimerModal button[onclick="applyCustomTimerNow()"]\').click();return {state:'+stateExpr+',modalOpen:document.getElementById("customTimerModal").classList.contains("open"),entered:document.getElementById("inpCustomTitle").value};})()');
  await dialog(rejectionCopy);
  adb('shell','input','keyevent','KEYCODE_BACK');
  const afterCustom=(await customCancel).value;
  assert.equal(afterCustom.modalOpen,true,'Custom modal closed on cancellation');
  assert.equal(afterCustom.entered,'QA custom label','Custom form erased on Cancel');
  assert.equal(afterCustom.state.label,customBefore.label,'Custom label modified before acceptance');
  assert.equal(afterCustom.state.session,customBefore.session,'Custom cancel lost current focus');
  assert.equal(afterCustom.state.running,true,'Custom cancel stopped current focus');
  results.push({operation:'custom_timer_cancel',status:'PASS',userDraftPreserved:true});
  const customAccept=evaluate('(()=>{document.querySelector(\'#customTimerModal button[onclick="applyCustomTimerNow()"]\').click();return {state:'+stateExpr+',modalOpen:document.getElementById("customTimerModal").classList.contains("open")};})()');
  const acceptXml=await dialog(rejectionCopy);
  const yes=buttons(acceptXml).sort((a,b)=>b.x-a.x)[0];
  assert.ok(yes,'Missing native YES for custom timer');
  adb('shell','input','tap',String(yes.x),String(yes.y));
  const afterAccept=(await customAccept).value;
  assert.equal(afterAccept.state.mode,'custom');
  assert.equal(afterAccept.state.total,47*60);
  assert.equal(afterAccept.state.running,false);
  assert.equal(afterAccept.state.label,'QA custom label (47m)');
  assert.equal(afterAccept.modalOpen,false);
  results.push({operation:'custom_timer_accept',status:'PASS',actualMinutes:47});

  const summary={results,source:'real Android WebView+native UIAutomator; synthetic QA-only focus session',release_approved:false};
  fs.writeFileSync(E+'/android-native-dialog-results.json',JSON.stringify(summary,null,2));
  console.log('ANDROID_P0_ALL_JS_DIALOGS_PASS',JSON.stringify(summary));
 }finally{ws.close();}
}
main().catch(e=>{console.error('ANDROID_P0_NATIVE_DIALOG_FAIL',String(e));process.exitCode=1;});
