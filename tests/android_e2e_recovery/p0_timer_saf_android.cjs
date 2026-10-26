'use strict';
// TRACK 07-00: disposable Android emulator ONLY. No real user files or release mode.
const fs=require('node:fs'),cp=require('node:child_process'),assert=require('node:assert/strict');
const PKG='com.zenstudy.focus',PREFIX='DF07 isolated durability ';
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const adb=(...args)=>cp.execFileSync('adb',['-s','emulator-5554',...args],{encoding:'utf8',timeout:20000}).trim();
const report={source:'Android real WebView + native AtomicFile; disposable emulator only',sha:cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),api:null,results:[],release_approved:false};
let ws,id=0,pending=new Map();
function requireEmulator(){
 if(process.env.DF_ANDROID_DISPOSABLE!=='1'||adb('shell','getprop','ro.kernel.qemu')!=='1')throw Error('TRANSPORT: disposable emulator attestation missing');
 if(!adb('shell','pm','path',PKG).includes(PKG))throw Error('TRANSPORT: debug package not installed');
 report.api=Number(adb('shell','getprop','ro.build.version.sdk'));
 if(![30,35].includes(report.api))throw Error('TRANSPORT: expected API30 or API35');
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
 const result=await evaluate("(()=>{const before=DF22Integration.getSnapshot(),after=JSON.parse(JSON.stringify(before));after.cfg.df07Seq=(after.cfg.df07Seq||0)+300;const orig=Storage.prototype.setItem;let threw=false;const attempted=[];Storage.prototype.setItem=function(k,v){attempted.push(String(k));if(k==="+JSON.stringify(key)+"&&!threw){threw=true;throw new DOMException('DF07 fault','QuotaExceededError');}return orig.call(this,k,v);};try{DF22Integration.write(before,after);return {error:'UNEXPECTED_SUCCESS',threw,attempted};}catch(e){return {error:String(e.message),threw,attempted};}finally{Storage.prototype.setItem=orig;}})()");
 assert.equal(result.threw,true,'Exact '+key+' fault not reached; '+JSON.stringify({path:result.error,attempted:result.attempted}));
 assert.notEqual(result.error,'UNEXPECTED_SUCCESS','Write must not be published');
 assert.deepEqual(await fixture(),before,'Injected WebView write failure mutated user-visible state');
 assert.deepEqual(await receipt(),disk,'Injected WebView failure advanced native checkpoint');
 assert.equal(await evaluate('DeepFocusDataCompatV21.inspectPending(localStorage).pending'),false,'Journal left behind after successful rollback');
 return 'Injected Storage.setItem failure at '+key+'; rollback and unchanged native receipt confirmed';
}


async function nativeIoFailureRollback(){
 if(process.env.DF_ANDROID_DISPOSABLE!=='1')throw Error('TRANSPORT: native I/O fault requires disposable emulator');
 const before=await fixture(),ack=await receipt();
 // API30/35 AtomicFile stages at .new. An empty directory there forces an
 // actual native FileOutputStream failure; never replace any existing file.
 const path='files/v21_durable_packets_v1.new';
 try{adb('shell','run-as',PKG,'mkdir',path);}
 catch(_){throw Error('TRANSPORT: cannot stage isolated native write failure');}
 try{
  const result=await evaluate("(()=>{const before=DF22Integration.getSnapshot(),after=JSON.parse(JSON.stringify(before));after.cfg.df07Seq=(after.cfg.df07Seq||0)+3339;try{DF22Integration.write(before,after);return 'UNEXPECTED_SUCCESS';}catch(error){return String(error.message);}})()");
  assert.match(result,/NATIVE_DURABLE_ACK_FAILED/,'Native file fault must reject ACK before publish');
  assert.deepEqual(await fixture(),before,'Native I/O failure published new application records');
  assert.equal(await evaluate('DeepFocusDataCompatV21.inspectPending(localStorage).pending'),false);
 }finally{
  // Remove only the empty directory created by this case; no recursive delete.
  adb('shell','run-as',PKG,'rmdir',path);
 }
 assert.deepEqual(await receipt(),ack,'Native I/O failure advanced the durable receipt');
 await restart();
 assert.deepEqual(await fixture(),before,'Failed native save changed records after process restart');
 assert.deepEqual(await receipt(),ack);
 return 'Real native AtomicFile open failure; unchanged records/native receipt verified after force-stop/relaunch';
}

function uiNodes(xml){return [...xml.matchAll(/<node[^>]*>/g)].map(m=>m[0]);}
function saveSafPickerEvidence(label,xml){
 // Never collect personal devices or files; require the disposable CI flag.
 if(process.env.DF_ANDROID_DISPOSABLE!=='1'||!process.env.RUNNER_TEMP)return;
 const dir=require('node:path').join(process.env.RUNNER_TEMP,'df-pr01-android');
 if(!fs.existsSync(dir))return;
 const key=String(label).replace(/[^a-z0-9_-]/gi,'_').slice(0,60);
 try{fs.writeFileSync(require('node:path').join(dir,'saf-'+key+'.xml'),xml||dumpUI());}catch(_){}
 try{const shot=cp.execFileSync('adb',['-s','emulator-5554','exec-out','screencap','-p'],{timeout:20000});fs.writeFileSync(require('node:path').join(dir,'saf-'+key+'.png'),shot);}catch(_){}
}

function dumpUI(){
 if(process.env.DF13_UI_PORT){
  try{
   const port=Number(process.env.DF13_UI_PORT);
   if(!Number.isInteger(port)||port<1024||port>65535)throw Error('invalid local probe port');
   const response=JSON.parse(cp.execFileSync('python3',['tests/android_e2e_recovery/native_ui_dump.py',String(port)],{encoding:'utf8',timeout:20000}));
   if(typeof response.xml!=='string'||!response.xml.includes('<hierarchy'))throw Error('native hierarchy unavailable');
   return response.xml;
  }catch(_){throw Error('TRANSPORT: persistent native accessibility probe unavailable');}
 }
 adb('shell','uiautomator','dump','/sdcard/df02_saf.xml');return adb('shell','cat','/sdcard/df02_saf.xml');
}
function readNativeEvents(clear=false){
 try{
  const port=Number(process.env.DF13_UI_PORT);
  if(!Number.isInteger(port)||port<1024||port>65535)throw Error('missing local probe');
  const value=JSON.parse(cp.execFileSync('python3',['tests/android_e2e_recovery/native_ui_dump.py',String(port),clear?'--events-clear':'--events'],{encoding:'utf8',timeout:20000}));
  if(value.error||(clear?value.cleared!==true:!Array.isArray(value.events)))throw Error('event protocol unavailable');
  return clear?[]:value.events;
 }catch(_){throw Error('TRANSPORT: native accessibility event evidence unavailable');}
}
function tapUI(node){
 const fixture=/text="p0-saf-[a-z-]+\.txt"/.test(node||'')&&/resource-id="android:id\/title"/.test(node||'');
 if(process.env.DF13_UI_PORT&&(fixture||/clickable="true"/.test(node||''))){
  try{
   const port=Number(process.env.DF13_UI_PORT);
   if(!Number.isInteger(port)||port<1024||port>65535)throw Error('invalid local port');
   const xml=node.endsWith('/>')?node:node.slice(0,-1)+'/>';
   const args=['tests/android_e2e_recovery/native_ui_dump.py',String(port),xml];
   if(fixture)args.push('--finger');
   const response=JSON.parse(cp.execFileSync('python3',args,{encoding:'utf8',timeout:20000}));
   if((fixture?response.touched:response.clicked)!==true||response.error)throw Error('native action rejected');
   return;
  }catch(_){throw Error('TRANSPORT: native picker accessibility action not acknowledged');}
 }
 const m=node?.match(/bounds="([^"]+)"/),v=m?[...m[1].matchAll(/[0-9]+/g)].map(x=>Number(x[0])):[];
 if(v.length!==4||v[2]<=v[0]||v[3]<=v[1])throw Error('TRANSPORT: Native picker control bounds missing');
 adb('shell','input','tap',String(Math.floor((v[0]+v[2])/2)),String(Math.floor((v[1]+v[3])/2)));
}
async function nativeUI(label,match,requireDocuments=true){
 for(let i=0;i<16;i++){
  try{const xml=dumpUI();if(!requireDocuments||/documentsui/i.test(xml)){const item=match(xml);if(item)return {xml,item};}}catch(_){}
  await pause(550);
 }
 throw Error('TRANSPORT: '+label+' not observable in genuine Android picker');
}
function savedBackupCandidates(){
 // Android DocumentsUI may write through MediaStore instead of a shell-visible
 // /sdcard path; text/plain may also append .txt to the suggested filename.
 // Only inspect disposable emulator documents with the fixed QA filename shape.
 const valid=/^deep-focus-\d{4}-\d{2}-\d{2}\.zenbackup(?:\.txt)?$/;
 const candidates=[],seen=new Set();
 for(const folder of ['/sdcard/Download','/sdcard/Documents','/sdcard']){
  let output='';try{output=adb('shell','find',folder,'-maxdepth','3','-type','f');}catch(_){continue;}
  for(const row of output.split('\n')){
   const path=row.replaceAll('\r','').trim();
   if(!path.startsWith(folder+'/')||!valid.test(path.split('/').at(-1))||seen.has(path))continue;
   seen.add(path);
   candidates.push({label:'shell-visible saved file',read:()=>cp.execFileSync('adb',['-s','emulator-5554','shell','cat',path],{timeout:20000})});
  }
 }
 for(const collection of ['content://media/external/downloads','content://media/external/file']){
  let output='';
  try{output=adb('shell','content','query','--uri',collection,'--projection','_id:_display_name','--where',"_display_name LIKE 'deep-focus-%'");}catch(_){continue;}
  for(const line of output.split('\n')){
   const id=line.match(/(?:^|[\s,])_id=(\d+)/),name=line.match(/(?:^|[\s,])_display_name=([^,]+)/);
   if(!id||!name||!valid.test(name[1].trim()))continue;
   const uri=collection+'/'+id[1];
   if(seen.has(uri))continue;
   seen.add(uri);
   candidates.push({label:'MediaStore selected document',read:()=>cp.execFileSync('adb',['-s','emulator-5554','shell','content','read','--uri',uri],{timeout:20000})});
  }
 }
 return candidates;
}
async function waitForSavedBackup(expectedCode){
 // A tapped Save is NOT success: compare exact real provider bytes with the
 // code generated before opening the native picker, never just a file name.
 const expected=Buffer.from(expectedCode,'utf8');
 let readableMismatch=false;
 for(let attempt=0;attempt<16;attempt++){
  for(const candidate of savedBackupCandidates()){
   let actual;try{actual=candidate.read();}catch(_){continue;}
   if(actual.equals(expected))return candidate.label;
   readableMismatch=true;
  }
  if(attempt<15)await pause(750);
 }
 if(readableMismatch)throw Error('SAF exported document bytes do not match the exact v21 backup');
 throw Error('TRANSPORT: SAF Save completed without independently readable DocumentsUI/MediaStore bytes');
}
function stageImportFixtureInMediaStore(name,code){
 // Stage bytes in disposable external storage, then ask Android MediaScanner
 // to index the *actual* file. A blank shell content insert is not a file.
 if(!/^p0-saf-[a-z-]+\.txt$/.test(name))throw Error('TRANSPORT: fixture filename rejected');
 const device='/sdcard/Download/'+name;
 const host=require('node:os').tmpdir()+'/df-pr01-saf-'+process.pid+'.txt';
 try {
  fs.writeFileSync(host,code,'utf8');
  cp.execFileSync('adb',['-s','emulator-5554','push',host,device],{timeout:25000,stdio:'ignore'});
  const remoteHash=adb('shell','sha256sum',device).split(/\s+/)[0];
  const expectedHash=require('node:crypto').createHash('sha256').update(code,'utf8').digest('hex');
  assert.equal(remoteHash,expectedHash,'Actual disposable on-device backup fixture bytes differ');
  try{adb('shell','am','broadcast','-a','android.intent.action.MEDIA_SCANNER_SCAN_FILE','-d','file://'+device);}catch(_){}
  return device;
 }catch(e){throw Error('TRANSPORT: cannot create verified disposable import fixture: '+String(e.message).slice(0,170));}
 finally{try{fs.unlinkSync(host);}catch(_){}}
}
async function openDocument(name,code){
 stageImportFixtureInMediaStore(name,code);await pause(900);
 await evaluate("setTimeout(()=>ZenNative.importBackupFromFile(),0);true");
 let xml=(await nativeUI('real DocumentsUI',x=>x)).xml;
 // Grid tiles can retain focus without opening on the captured API30 picker.
 // Select the genuine native list affordance, then locate the exact filename
 // again in the new hierarchy. Never use a preview icon or stale tile bounds.
 const listView=uiNodes(xml).find(n=>/content-desc="List view"/i.test(n)&&
  /clickable="true"/.test(n)&&! /enabled="false"/.test(n));
 if(listView){tapUI(listView);await pause(500);xml=dumpUI();}
 let row=uiNodes(xml).find(n=>n.includes('text="'+name+'"'));
 if(!row){
  let downloads=uiNodes(xml).find(n=>/text="Downloads"/i.test(n));
  if(!downloads){const menu=uiNodes(xml).find(n=>/content-desc="(?:Show roots|Open navigation drawer|Navigate up)"/i.test(n));if(menu){tapUI(menu);await pause(500);xml=dumpUI();}downloads=uiNodes(xml).find(n=>/text="Downloads"/i.test(n));}
  if(!downloads)throw Error('TRANSPORT: Downloads root unavailable');
  tapUI(downloads);row=(await nativeUI('exact fixture '+name,x=>uiNodes(x).find(n=>n.includes('text="'+name+'"')))).item;
 }
 saveSafPickerEvidence(name+'_visible',null);
 tapUI(row);await pause(800);
 // The first DocumentsUI tap can select/preview a tile instead of granting
 // ACTION_OPEN_DOCUMENT. Require the picker to exit; never infer consent from
 // a visible filename or from a scheduled JS bridge call.
 // With the persistent probe, one verified finger gesture is sufficient.
 // Never replay it or send a blind Enter into a possible consent transition.
 for(let attempt=0;attempt<(process.env.DF13_UI_PORT?0:3);attempt++){
  xml=dumpUI();
  if(!/package="com\.google\.android\.documentsui"/.test(xml))break;
  // DocumentsUI labels differ by API/vendor; require an actual enabled native button.
  const confirm=uiNodes(xml).find(n=>
   /(text|content-desc)=\"(?:Open|Select|Choose|Use this file|OK)\"/i.test(n)&&
   /clickable=\"true\"/.test(n) && !/enabled=\"false\"/.test(n));
  if(confirm)tapUI(confirm);
  else {
   const exact=uiNodes(xml).find(n=>n.includes('text="'+name+'"'));
   if(!exact)throw Error('TRANSPORT: actual DocumentsUI document selection did not complete: '+name);
   tapUI(exact);
   // Enter is a real keyboard confirmation of the selected UI element, never
   // a synthetic bridge call or assumed consent.
   adb('shell','input','keyevent','66');
  }
  await pause(850);
 }
 xml=dumpUI();
 saveSafPickerEvidence(name+'_selected',xml);
 if(/package="com\.google\.android\.documentsui"/.test(xml)){
  if(process.env.DF_ANDROID_DISPOSABLE==='1'&&process.env.RUNNER_TEMP){
   try{
    const activity=adb('shell','dumpsys','activity','activities');
    const lines=activity.split('\n').filter(line=>/topResumedActivity|mResumedActivity|mFocusedApp/.test(line));
    const events=adb('logcat','-d','-t','150','PickActivity:W','Documents:W','DirectoryFragment:W','*:S');
    const counts={};
    for(const word of ['SecurityException','Permission Denial','not allowed','cannot be shared','No Document','not enabled'])
     counts[word]=events.split(word).length-1;
    fs.writeFileSync(require('node:path').join(process.env.RUNNER_TEMP,'df-pr01-android','picker-activation-metadata.json'),JSON.stringify({foreground:lines,diagnostic_counts:counts}));
   }catch(_){}
  }
  throw Error('TRANSPORT: actual file selection did not exit DocumentsUI: '+name);
 }
}
async function confirmDialog(accept){
 const message='Restore this backup? Current tasks, notes and progress will be replaced. Export them first.';
 const u=await nativeUI('app-owned restore confirmation',xml=>{
  const nodes=uiNodes(xml);
  // Default WebView dialog title is `The page at "file://" says:` on API30.
  // Require the actual app-owned restore warning, then the explicit button ID.
  const owned=node=>node.includes('package="'+PKG+'"');
  if(!nodes.some(node=>owned(node)&&node.includes('resource-id="android:id/message"')&&node.includes('text="'+message+'"')))return false;
  return nodes.find(node=>owned(node)&&node.includes('class="android.widget.Button"')&&
   node.includes('resource-id="android:id/button'+(accept?'1':'2')+'"')&&
   node.includes('clickable="true"')&&node.includes('enabled="true"'));
 },false);
 saveSafPickerEvidence(accept?'consent_accept':'consent_cancel',u.xml);tapUI(u.item);await pause(500);
}
async function safMain(){
 requireEmulator();await connect();
 await run('saf_fixture_and_native_ack',async()=>{
  assert.equal(await write('after.cfg.lang="en";after.cfg.df07Unknown={keep:["legacy",7]};after.cfg.df07Seq=0;after.tasksList.push({id:71001,title:"DF07 isolated durability task",done:false,unknownTask:{keep:"عربي ۱۲"}});after.notesList.push({id:71002,title:"DF07 isolated durability note",body:"Exact Unicode ٣",unknownNote:{keep:42}})'),true);
  assert.equal((await receipt()).valid,true);
 });
 if(report.results.at(-1).status!=='PASS')return;
 await run('locale_native_ack_process_restart',async()=>{
  const records=await fixture();
  await evaluate("applyLanguage('ar');true");
  assert.equal((await snapshot()).cfg.lang,'ar');
  assert.equal((await receipt()).valid,true,'Locale must have a matching native receipt before kill');
  await restart();
  assert.equal((await snapshot()).cfg.lang,'ar','Acknowledged locale lost after process kill');
  assert.equal(await evaluate("document.documentElement.lang"),'ar');
  assert.deepEqual(await fixture(),records,'Locale restart changed Tasks/Notes or unknown fields');
  assert.equal((await receipt()).valid,true);
  await evaluate("applyLanguage('en');true");
  assert.equal((await receipt()).valid,true);
  return 'Actual applyLanguage path, matching six-packet native ACK, force-stop/relaunch and exact locale/records verified';
 });
 const primaryKeys=await evaluate('Object.values(DeepFocusDataCompatV21.KEYS)');
 assert.ok(Array.isArray(primaryKeys)&&primaryKeys.length===3&&new Set(primaryKeys).size===3,'Canonical v21 family keys unavailable');
 for(const key of primaryKeys.flatMap(key=>[key,key+'_mirror'])){
  await run('failed_save_rollback_'+key,()=>injectWriteFailure(key));
 }
 await run('native_ack_io_failure_rollback_restart',nativeIoFailureRollback);
 for(const [name,fn] of Object.entries(require('./native_faults.cjs').createNativeFaultCases({evaluate,snapshot,receipt,fixture,restart,adb,nativeUI,tapUI})))await run(name,fn);
 const baseline=await fixture(),code=await evaluate('generateEncryptedBackupCode()');
 await run('saf_picker_cancel',async()=>{
  const before=await snapshot(),ack=await receipt();await evaluate('setTimeout(()=>ZenNative.importBackupFromFile(),0);true');
  await nativeUI('picker',x=>x);adb('shell','input','keyevent','4');await pause(600);
  assert.deepEqual(await snapshot(),before);assert.deepEqual(await receipt(),ack);
 });
 await run('saf_valid_file_consent_cancel',async()=>{
  await openDocument('p0-saf-consent.txt',code);await confirmDialog(false);
  assert.deepEqual(await fixture(),baseline);assert.equal((await receipt()).valid,true);
 });
 await run('saf_corrupt_rejected',async()=>{
  const before=await snapshot(),ack=await receipt();await openDocument('p0-saf-corrupt.txt','ZEN21::corrupt');
  let rejected=false;for(let i=0;i<18;i++){if(await evaluate("/Backup invalid/.test(document.getElementById('toastText').textContent)")){rejected=true;break;}await pause(200);}
  assert.equal(rejected,true,'Corrupt file must reach actual JS validator');
  assert.deepEqual(await snapshot(),before);assert.deepEqual(await receipt(),ack);
 });
 await run('saf_oversized_rejected',async()=>{
  const before=await snapshot(),ack=await receipt();
  readNativeEvents(true); // Drop earlier events before selecting this exact oversized file.
  await openDocument('p0-saf-oversized.txt','x'.repeat(8*1024*1024+1));
  let evidence=[];
  for(let i=0;i<12;i++){
   evidence=readNativeEvents().filter(event=>event.kind==='backup_read_rejected');
   if(evidence.length)break;
   await pause(200);
  }
  if(!evidence.length)throw Error('TRANSPORT: native oversized-file rejection event not observed');
  if(process.env.RUNNER_TEMP)fs.writeFileSync(require('node:path').join(process.env.RUNNER_TEMP,'df-pr01-android','oversized-native-events.json'),JSON.stringify(evidence));
  saveSafPickerEvidence('oversized_rejected',null);
  assert.deepEqual(await snapshot(),before);assert.deepEqual(await receipt(),ack);
  return 'Genuine app-owned Android rejection event after exact 8 MiB + 1 byte SAF selection; records and native ACK unchanged';
 });
 await run('saf_actual_file_restore_ack_and_reopen',async()=>{
  assert.equal(await write('after.notesList.find(n=>n.id===71002).body="Temporary modified";after.cfg.df07Seq=42'),true);
  assert.notDeepEqual(await fixture(),baseline);await openDocument('p0-saf-restore.txt',code);
  await confirmDialog(true);
  for(let i=0;i<12;i++){if(JSON.stringify(await fixture())===JSON.stringify(baseline))break;await pause(300);}
  assert.deepEqual(await fixture(),baseline);assert.equal((await receipt()).valid,true);
  await restart();assert.deepEqual(await fixture(),baseline);assert.equal((await receipt()).valid,true);
 });
}
function fillUnattempted(){
 // Source inventory only; assertions/fault targets still use the actual device.
 const keys=Object.values(require('../../android/app/src/main/assets/web/data_compat_v21.js').KEYS);
 const planned=['saf_fixture_and_native_ack','locale_native_ack_process_restart',
  ...keys.flatMap(key=>['failed_save_rollback_'+key,'failed_save_rollback_'+key+'_mirror']),
  'native_ack_io_failure_rollback_restart',...require('./native_faults.cjs').CASE_NAMES,'saf_picker_cancel','saf_valid_file_consent_cancel',
  'saf_corrupt_rejected','saf_oversized_rejected','saf_actual_file_restore_ack_and_reopen'];
 for(const name of planned)if(!report.results.some(row=>row.name===name))
  report.results.push({name,status:'NOT_TESTED',detail:'Not executed; blocked by prior Android/native transport failure'});
}
async function main(){await safMain();}
main().catch(e=>report.results.push({name:'bootstrap',status:'NOT_TESTED',detail:String(e.message||e).slice(0,700)})).finally(()=>{
 try{ws?.close();}catch(_){}for(const p of pending.values())clearTimeout(p.timer);
 fillUnattempted();
 report.counts=Object.fromEntries(['PASS','FAIL','NOT_TESTED'].map(s=>[s,report.results.filter(x=>x.status===s).length]));
 fs.writeFileSync(process.argv[2]||'p0-android.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 if(!report.results.length||report.results.some(x=>x.status!=='PASS'))process.exitCode=1;
});
