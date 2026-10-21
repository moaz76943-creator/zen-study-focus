'use strict';
// TRACK 07-00: disposable Android emulator ONLY. No real user files or release mode.
const fs=require('node:fs'),cp=require('node:child_process'),assert=require('node:assert/strict');
const PKG='com.zenstudy.focus',PREFIX='DF07 isolated durability ';
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const adb=(...args)=>cp.execFileSync('adb',['-s','emulator-5554',...args],{encoding:'utf8',timeout:20000}).trim();
const report={source:'Android API30 real WebView + native AtomicFile; disposable emulator only',sha:process.env.GITHUB_SHA||null,results:[],release_approved:false};
let ws,id=0,pending=new Map();
function requireEmulator(){
 if(process.env.DF_ANDROID_DISPOSABLE!=='1'||adb('shell','getprop','ro.kernel.qemu')!=='1')throw Error('TRANSPORT: disposable emulator attestation missing');
 if(!adb('shell','pm','path',PKG).includes(PKG))throw Error('TRANSPORT: debug package not installed');
}
async function connect(){
 const pid=adb('shell','pidof',PKG).split(/\s/)[0];
 if(!/^\d+$/.test(pid))throw Error('TRANSPORT: application PID missing');
 adb('forward','tcp:9222','localabstract:webview_devtools_remote_'+pid);
 let pages=[];
 for(let n=0;n<15;n++){try{pages=await(await fetch('http://127.0.0.1:9222/json/list',{signal:AbortSignal.timeout(4000)})).json();if(pages.length)break;}catch(_){}await pause(500);}
 const page=pages.find(p=>p.type==='page'&&p.url==='file:///android_asset/web/index.html');
 if(!page)throw Error('TRANSPORT: bundled WebView target absent');
 const url=new URL(page.webSocketDebuggerUrl);
 if(url.protocol!=='ws:'||!['localhost','127.0.0.1'].includes(url.hostname)||url.port!=='9222')throw Error('TRANSPORT: unexpected DevTools URL');
 ws=new WebSocket(url);
 await new Promise((resolve,reject)=>{
  const t=setTimeout(()=>reject(Error('TRANSPORT: websocket connect timeout')),10000);
  ws.addEventListener('open',()=>{clearTimeout(t);resolve();},{once:true});
  ws.addEventListener('error',()=>{clearTimeout(t);reject(Error('TRANSPORT: websocket failed'));},{once:true});
 });
 ws.addEventListener('message',event=>{
  let msg;try{msg=JSON.parse(event.data);}catch(_){return;}
  const req=pending.get(msg.id);if(!req)return;
  pending.delete(msg.id);clearTimeout(req.timer);
  if(msg.error||msg.result?.exceptionDetails)req.reject(Error('APP_EVALUATION: '+JSON.stringify(msg.error||msg.result.exceptionDetails).slice(0,500)));
  else req.resolve(msg.result);
 });
 await command('Runtime.enable');
 for(let n=0;n<20;n++){
  if(await evaluate("document.readyState==='complete'&&!!window.DF22Integration&&!!window.ZenNative"))return;
  await pause(500);
 }
 throw Error('TRANSPORT: integrated Android page not ready');
}
function command(method,params={}){
 return new Promise((resolve,reject)=>{
  const seq=++id;
  const timer=setTimeout(()=>{pending.delete(seq);reject(Error('TRANSPORT: CDP '+method+' timeout'));},20000);
  pending.set(seq,{resolve,reject,timer});
  ws.send(JSON.stringify({id:seq,method,params}));
 });
}
async function evaluate(expr){const value=await command('Runtime.evaluate',{expression:expr,returnByValue:true,awaitPromise:true});return value.result?.value;}
async function snapshot(){return evaluate('JSON.parse(JSON.stringify(DF22Integration.getSnapshot()))');}
async function receipt(){return evaluate("(()=>{const x=ZenNative.readDurableV21();if(x==='NONE'||x==='ERROR')return {error:x};const p=JSON.parse(x).packets;const D=DeepFocusDataCompatV21;return {valid:Object.keys(p).length===6&&Object.entries(p).every(([k,v])=>v===localStorage.getItem(k)&&(!v||D.inspectPacket(v).ok)),bytes:x.length};})()");}
async function fixture(){return evaluate("(()=>{const s=DF22Integration.getSnapshot();return {task:s.tasksList.find(t=>t.title==='DF07 isolated durability task'),note:s.notesList.find(n=>n.title==='DF07 isolated durability note'),unknown:s.cfg.df07Unknown,seq:s.cfg.df07Seq};})()");}
async function write(body){return evaluate('(()=>{const before=DF22Integration.getSnapshot(),after=JSON.parse(JSON.stringify(before));'+body+';return DF22Integration.write(before,after)===true;})()');}
async function restart(){
 try{ws?.close();}catch(_){}
 adb('shell','am','force-stop',PKG);adb('shell','am','start','-n',PKG+'/.MainActivity');
 await pause(2200);await connect();
}
async function run(name,fn){
 try{const detail=await fn();report.results.push({name,status:'PASS',detail:detail||'State assertions passed on real Android emulator'});}
 catch(e){const message=String(e.message||e).slice(0,700);report.results.push({name,status:message.startsWith('TRANSPORT:')?'NOT_TESTED':'FAIL',detail:message});}
 console.log(JSON.stringify(report.results[report.results.length-1]));
}
async function injectWriteFailure(key){
 const before=await fixture(),disk=await receipt();
 const result=await evaluate("(()=>{const before=DF22Integration.getSnapshot(),after=JSON.parse(JSON.stringify(before));after.cfg.df07Seq=(after.cfg.df07Seq||0)+300;const orig=Storage.prototype.setItem;let threw=false;Storage.prototype.setItem=function(k,v){if(k==="+JSON.stringify(key)+"&&!threw){threw=true;throw new DOMException('DF07 fault','QuotaExceededError');}return orig.call(this,k,v);};try{DF22Integration.write(before,after);return {error:'UNEXPECTED_SUCCESS',threw};}catch(e){return {error:String(e.message),threw};}finally{Storage.prototype.setItem=orig;}})()");
 assert.equal(result.threw,true,'Exact '+key+' fault not reached');
 assert.notEqual(result.error,'UNEXPECTED_SUCCESS','Write must not be published');
 assert.deepEqual(await fixture(),before,'Injected WebView write failure mutated user-visible state');
 assert.deepEqual(await receipt(),disk,'Injected WebView failure advanced native checkpoint');
 assert.equal(await evaluate('DeepFocusDataCompatV21.inspectPending(localStorage).pending'),false,'Journal left behind after successful rollback');
 return 'Injected Storage.setItem failure at '+key+'; rollback and unchanged native receipt confirmed';
}
async function main(){
 requireEmulator();await connect();
 await run('baseline_six_packet_ack',async()=>{
  const a=await snapshot(),ti=Math.max(0,...a.tasksList.map(x=>x.id))+1001,ni=Math.max(0,...a.notesList.map(x=>x.id))+1001;
  if(a.tasksList.some(x=>x.title==='DF07 isolated durability task')||a.notesList.some(x=>x.title==='DF07 isolated durability note'))throw Error('TRANSPORT: fixture already exists; fresh emulator required');
  const body='after.tasksList.push({id:'+ti+',title:"DF07 isolated durability task",done:false,checklist:[{id:'+ (ti+1)+',title:"FixtureCheck",done:false,unknownChild:{keep:true}}],unknownTask:{keep:[1,"عربي"]}});after.notesList.push({id:'+ni+',title:"DF07 isolated durability note",body:"Unicode العربية ٣ — exact",unknownNote:{keep:42}});after.cfg.df07Unknown={keep:["v21",5]};after.cfg.df07Seq=0';
  assert.equal(await write(body),true);
  const r=await receipt();assert.equal(r.valid,true,'All six native packets must match WebView');
  const f=await fixture();assert.equal(f.task.id,ti);assert.equal(f.note.id,ni);
  return 'Initial fixture IDs '+ti+'/'+ni+', unknown fields and all six verified native receipt packets';
 });
 if(report.results.at(-1).status!=='PASS')return;
 await run('native_atomicfile_ack_io_failure',async()=>{
  const before=await fixture(),disk=await receipt();
  let dir=null;
  try{
   const cwd=adb('shell','run-as',PKG,'pwd');
   if(!cwd.includes(PKG))throw Error('TRANSPORT: run-as not available');
   dir=cwd+'/files/v21_durable_packets_v1.new';
   // The API30 AtomicFile staging pathname is blocked, never its last-good base file.
   try{adb('shell','run-as',PKG,'mkdir',dir);}catch(e){throw Error('TRANSPORT: AtomicFile staging path unavailable or already present');}
   const answer=await evaluate("(()=>{const before=DF22Integration.getSnapshot(),after=JSON.parse(JSON.stringify(before));after.cfg.df07Seq++;try{DF22Integration.write(before,after);return 'UNEXPECTED_SUCCESS';}catch(e){return String(e.message);}})()");
   assert.match(answer,/NATIVE_DURABLE_ACK_FAILED/,'I/O fault must be rejected by genuine native bridge');
   assert.deepEqual(await fixture(),before);
  }finally{if(dir){try{adb('shell','run-as',PKG,'rmdir',dir);}catch(_){}}}
  assert.deepEqual(await receipt(),disk,'AtomicFile error changed last-good checkpoint');
  return 'Real native .new staging write denied; ACK fails closed, app state and last-good checkpoint retained';
 });
 await run('primary_write_failure',()=>injectWriteFailure('zen_fortress_tasks_v21'));
 await run('mirror_write_failure',()=>injectWriteFailure('zen_fortress_tasks_v21_mirror'));
 await run('both_webview_copies_corrupt_native_replay',async()=>{
  const before=await fixture();
  const evidence=await evaluate("(()=>{const k='zen_fortress_tasks_v21';localStorage.setItem(k,'DF07_FAULT');localStorage.setItem(k+'_mirror','DF07_FAULT');const D=DeepFocusDataCompatV21;const corrupted=!D.inspectPacket(localStorage.getItem(k)).ok&&!D.inspectPacket(localStorage.getItem(k+'_mirror')).ok;DF22Preflight.replayNative(localStorage);return {corrupted,primary:D.inspectPacket(localStorage.getItem(k)).ok,mirror:D.inspectPacket(localStorage.getItem(k+'_mirror')).ok};})()");
  assert.deepEqual(evidence,{corrupted:true,primary:true,mirror:true});
  assert.deepEqual(await fixture(),before);assert.equal((await receipt()).valid,true);
  await restart();assert.deepEqual(await fixture(),before);
  return 'Both WebView copies corrupted, Android native receipt restored six packets; post-process-restart fixture equality';
 });
 await run('interrupted_journal_replay',async()=>{
  const before=await fixture();
  const e=await evaluate("(()=>{const D=DeepFocusDataCompatV21,original=D.captureRaw(localStorage);localStorage.setItem(D.JOURNAL_KEY,JSON.stringify({version:1,state:'committed',original,expected:original}));const wasPending=D.inspectPending(localStorage).pending;DF22Preflight.replayNative(localStorage);return {wasPending,pendingAfter:D.inspectPending(localStorage).pending};})()");
  assert.deepEqual(e,{wasPending:true,pendingAfter:false});
  await restart();assert.deepEqual(await fixture(),before);
  return 'Injected valid interrupted committed journal on WebView; native replay cleaned journal and retained fixture after process restart';
 });
 await run('five_acks_one_immediate_kill',async()=>{
  for(let i=1;i<=5;i++){
   assert.equal(await write('after.cfg.df07Seq='+i+';const task=after.tasksList.find(t=>t.title==="DF07 isolated durability task");task.checklist[0].done=!task.checklist[0].done;after.notesList.find(n=>n.title==="DF07 isolated durability note").body+="|"+'+i),true);
   assert.equal((await receipt()).valid,true,'Native receipt must ACK every edit '+i);
  }
  const before=await fixture();assert.equal(before.seq,5);
  await restart();assert.deepEqual(await fixture(),before,'Five consecutive ACKs not restored after one process kill');
  assert.equal((await receipt()).valid,true);
  return 'Five consecutive cross-family edits + five native receipts + one immediate process kill; exact fixture IDs, nested unknown fields and note content retained';
 });
 await run('activity_destroy_recreate',async()=>{
  const before=await fixture(),pid=adb('shell','pidof',PKG).split(/\s/)[0];
  await evaluate("window.__df07ActivityNonce='destroy-required'");
  // Explicit NEW_TASK + CLEAR_TASK destroys the old Android Activity even
  // though Manifest configChanges makes ordinary rotation insufficient.
  adb('shell','am','start','-n',PKG+'/.MainActivity','-f','0x10008000');
  await pause(2300);
  try{ws?.close();}catch(_){}
  await connect();
  const newpid=adb('shell','pidof',PKG).split(/\s/)[0];
  if(pid!==newpid)throw Error('TRANSPORT: system killed process; isolated Activity recreation not proven');
  const marker=await evaluate('window.__df07ActivityNonce');
  if(marker!==undefined)throw Error('TRANSPORT: Activity not recreated after explicit NEW_TASK/CLEAR_TASK');
  assert.deepEqual(await fixture(),before,'Recreated Android Activity lost fixture data');
  return 'Explicit task clear recreated Android Activity in same process; WebView state reset and saved task/note IDs/unknown fields retained';
 });
 await run('backup_restore_on_android_webview',async()=>{
  const before=await fixture();
  const code=await evaluate('generateEncryptedBackupCode()');
  assert.ok(code.startsWith('ZEN21::'),'v21 wire-format mismatch');
  assert.equal(await write('after.notesList.find(n=>n.title==="DF07 isolated durability note").body="temporary mutation";after.cfg.df07Seq=99'),true);
  assert.notDeepEqual(await fixture(),before);
  // Test-only consent on a disposable emulator. User backups are never read.
  const restored=await evaluate("(()=>{const f=window.confirm;window.confirm=()=>true;try{return verifyAndRestoreBackupCode("+JSON.stringify(code)+");}finally{window.confirm=f;}})()");
  assert.equal(restored,true,'Android app rejected valid v21 backup');
  assert.deepEqual(await fixture(),before,'Backup restore did not retain every fixture ID/field');
  await restart();assert.deepEqual(await fixture(),before);
  return 'Actual Android WebView backup-code restore + native ACK + process restart, exact unknown fields/IDs preserved; SAF document picker is separate NOT_TESTED';
 });
 await run('saf_document_picker_export',async()=>{
  const code=await evaluate('generateEncryptedBackupCode()');
  assert.ok(code.startsWith('ZEN21::'));
  await evaluate('ZenNative.exportBackupToFile('+JSON.stringify(code)+')');
  try {
   await pause(1400);
   const focus=adb('shell','dumpsys','window','windows').slice(0,10000);
   const xmlpath='/sdcard/df07_saf_picker.xml';
   try{adb('shell','uiautomator','dump',xmlpath);}catch(e){throw Error('TRANSPORT: DocumentsUI hierarchy unavailable');}
   const xml=adb('shell','cat',xmlpath);
   if(!/documentsui|DocumentsUI|Save|SAVE|حفظ|Documents|Downloads/i.test(xml+focus))throw Error('TRANSPORT: SAF chooser not observable on emulator');
   // SAF UI visibility is not export success: no Save/readback has occurred.
   throw Error('TRANSPORT: SAF picker opened, but real document Save + readback / file picker import not instrumented');
  }finally{
   // SAF filename IME may consume the first Back: close any picker and explicitly
   // return to our app before starting independent legacy UIAutomator probes.
   for(let n=0;n<3;n++){
    const current=adb('shell','dumpsys','window','windows');
    if(/mCurrentFocus[^\n]*com\.zenstudy\.focus/.test(current))break;
    adb('shell','input','keyevent','4');await pause(350);
   }
   adb('shell','am','start','-n',PKG+'/.MainActivity');
   await pause(600);
  }
 });
}
main().catch(e=>{report.results.push({name:'bootstrap',status:'NOT_TESTED',detail:String(e.message||e).slice(0,700)});}).finally(()=>{
 try{ws?.close();}catch(_){}
 for(const p of pending.values())clearTimeout(p.timer);
 report.counts=Object.fromEntries(['PASS','FAIL','NOT_TESTED'].map(s=>[s,report.results.filter(x=>x.status===s).length]));
 fs.writeFileSync(process.argv[2]||'track07-durability.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
 if(report.results.some(x=>x.status!=='PASS'))process.exitCode=1;
});
