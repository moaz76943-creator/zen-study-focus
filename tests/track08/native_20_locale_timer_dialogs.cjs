'use strict';
// Real disposable Android WebView and *native* Deep Focus AlertDialog, all 20 locales.
// CDP initiates the real rendered mode button. Android BACK physically cancels it.
// Does not touch original app or QA user's data and NEVER stub window.confirm.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const cp=require('node:child_process');
const codes=['en','ar','es','zh','hi','fr','de','ru','pt','ja','id','tr','ko','vi','it','bn','ur','fa','pl','nl'];
const E=process.argv[2]||'/tmp/df-native-20-locale';
fs.mkdirSync(E,{recursive:true});
const adb=(...args)=>cp.execFileSync('adb',args,{encoding:'utf8',timeout:24000,maxBuffer:4*1024*1024});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const unescapeXml=s=>String(s).replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
const results=[];let ws;
function fetchTargets(){return fetch('http://127.0.0.1:9223/json/list',{signal:AbortSignal.timeout(5000)}).then(r=>r.json());}
async function main(){
 let target;
 for(let i=0;i<20;i++){
  try{target=(await fetchTargets()).find(t=>t.type==='page'&&t.url==='file:///android_asset/web/index.html');if(target)break;}catch(_){}
  await sleep(400);
 }
 assert.ok(target,'Trusted bundled WebView target not observed');
 const url=new URL(target.webSocketDebuggerUrl);
 assert.equal(url.protocol,'ws:');
 assert.ok(['localhost','127.0.0.1'].includes(url.hostname));
 url.hostname='127.0.0.1';url.port='9223';
 ws=new WebSocket(url);
 await new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>reject(Error('CDP connection timeout')),10000);
  ws.addEventListener('open',()=>{clearTimeout(timeout);resolve()},{once:true});
  ws.addEventListener('error',()=>{clearTimeout(timeout);reject(Error('CDP WebSocket connection failed'))},{once:true});
 });
 const waiting=new Map();let counter=0;
 ws.addEventListener('message',ev=>{
  let r;try{r=JSON.parse(ev.data);}catch(_){return;}
  const p=waiting.get(r.id);if(!p)return;
  waiting.delete(r.id);clearTimeout(p.timer);
  if(r.error||r.result?.exceptionDetails)p.reject(Error('CDP failed: '+JSON.stringify(r.error||r.result.exceptionDetails).slice(0,400)));
  else p.resolve(r.result?.result);
 });
 const evaluate=expr=>new Promise((resolve,reject)=>{
  const id=++counter,timer=setTimeout(()=>{waiting.delete(id);reject(Error('CDP JS response deadline for '+id));},45000);
  waiting.set(id,{timer,resolve,reject});
  ws.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression:expr,returnByValue:true}}));
 });
 await evaluate("applyLanguage('en');selectTimerMode(25,'focus',document.getElementById('modeFocusBtn'));toggleTimerPlay();true");
 const baseline=(await evaluate("({id:timerSessionId,total:timerTotal,mode:currentTimerModeKey,running:timerRunning})")).value;
 assert.ok(baseline.running&&baseline.id&&baseline.mode==='focus','Must verify actual running Timer session before destructive button testing');
 for(const lang of codes){
  await evaluate("applyLanguage("+JSON.stringify(lang)+");true");
  const expected=(await evaluate("quickText('replacePrompt')")).value;
  assert.ok(typeof expected==='string'&&expected.length>=10,'Missing context-specific localization for '+lang);
  const pending=evaluate("document.getElementById('modeShortBtn').click();true");
  pending.catch(()=>{}); // in case native UIAutomator cannot inspect the modal
  let dialogXml='';
  for(let attempt=0;attempt<4;attempt++){
   try{
    adb('shell','uiautomator','dump','/sdcard/df-native-20-locale.xml');
    const xml=adb('shell','cat','/sdcard/df-native-20-locale.xml');
    if(xml.includes('Deep Focus')&&unescapeXml(xml).includes(expected)){dialogXml=xml;break;}
   }catch(_){}
   await sleep(500);
  }
  if(!dialogXml)throw Error('REAL_NATIVE_DIALOG_NOT_OBSERVED '+lang+' expected='+expected.slice(0,65));
  assert.doesNotMatch(dialogXml,/file:\/\/|تعرض الصفحة في|The page at/,'Origin-labeled browser popup leaked in '+lang);
  adb('shell','input','keyevent','KEYCODE_BACK');
  assert.equal((await pending).value,true,'Native Back did not unblock actual mode button handler in '+lang);
  const after=(await evaluate("({id:timerSessionId,total:timerTotal,mode:currentTimerModeKey,running:timerRunning})")).value;
  assert.deepEqual(after,baseline,'Cancelled native dialog lost active session in '+lang);
  results.push({locale:lang,status:'PASS',nativeTitle:'Deep Focus',messageMatched:true,cancelPreserved:true});
 }
 const report={kind:'actual WebView+Android native confirmation across 20 locales',results,counts:{PASS:results.length,FAIL:0,NOT_TESTED:codes.length-results.length},releaseApproved:false};
 fs.writeFileSync(E+'/native-timer-20-locales.json',JSON.stringify(report,null,2));
 console.log('ANDROID_NATIVE_TIMER_20_LOCALE_PASS',JSON.stringify(report));
}
main().catch(e=>{console.error('ANDROID_NATIVE_TIMER_20_LOCALE_FAIL',e.message);process.exitCode=1;
 fs.writeFileSync(E+'/native-timer-20-locales.json',JSON.stringify({results,count:results.length,error:String(e.message),releaseApproved:false},null,2));
}).finally(()=>{try{ws?.close()}catch(_){}});
