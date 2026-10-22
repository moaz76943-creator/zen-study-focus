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

function uiNodes(xml){return [...xml.matchAll(/<node[^>]*>/g)].map(m=>m[0]);}
function saveSafPickerEvidence(label,xml){
 // Never collect personal devices or files; require the disposable CI flag.
 if(process.env.DF_ANDROID_DISPOSABLE!=='1'||!process.env.RUNNER_TEMP)return;
 const dir=require('node:path').join(process.env.RUNNER_TEMP,'p0-android');
 if(!fs.existsSync(dir))return;
 const key=String(label).replace(/[^a-z0-9_-]/gi,'_').slice(0,60);
 try{fs.writeFileSync(require('node:path').join(dir,'saf-'+key+'.xml'),xml||dumpUI());}catch(_){}
 try{const shot=cp.execFileSync('adb',['-s','emulator-5554','exec-out','screencap','-p'],{timeout:20000});fs.writeFileSync(require('node:path').join(dir,'saf-'+key+'.png'),shot);}catch(_){}
}

function dumpUI(){adb('shell','uiautomator','dump','/sdcard/df02_saf.xml');return adb('shell','cat','/sdcard/df02_saf.xml');}
function tapUI(node){
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
 // adb push is NOT enough on Android 11: unindexed files can be invisible in
 // ACTION_OPEN_DOCUMENT. Use the actual scoped MediaStore Downloads provider.
 const collection='content://media/external/downloads';
 let uri=null;
 try{
  // AOSP "content insert" intentionally prints NO inserted URI. Resolve the
  // new row via MediaStore instead; do not assume empty stdout means failure.
  adb('shell','content','insert','--uri',collection,
   '--bind','_display_name:s:'+name,'--bind','mime_type:s:text/plain',
   '--bind','relative_path:s:Download/');
  // adb shell strips SQL quote characters in --where on some Android
  // builds. Query the disposable collection and match names locally.
  const rows=adb('shell','content','query','--uri',collection,
   '--projection','_id:_display_name');
  const matches=rows.split('\n').filter(line=>line.includes('_display_name='+name));
  const match=matches.map(line=>line.match(/(?:^|[\s,])_id=(\d+)(?:,|\s|$)/)).find(Boolean);
  if(!match)throw Error('MediaStore query cannot resolve inserted QA document by exact name');
  uri=collection+'/'+match[1];
  // API30 shell ContentProvider write/read uses a mismatched provider
  // attribution identity. The inserted MediaStore row indexes the file;
  // write the disposable bytes through shell-visible shared storage.
  const device='/sdcard/Download/'+name;
  const host=require('node:os').tmpdir()+'/df02-saf-'+process.pid+'.txt';
  try{
   fs.writeFileSync(host,code,'utf8');
   cp.execFileSync('adb',['-s','emulator-5554','push',host,device],{timeout:20000,stdio:'ignore'});
   const bytes=cp.execFileSync('adb',['-s','emulator-5554','shell','cat',device],{timeout:20000});
   assert.ok(bytes.equals(Buffer.from(code,'utf8')),'Staged indexed file bytes mismatched');
  }finally{
   try{fs.unlinkSync(host);}catch(_){}
  }
  return uri;
 }catch(e){
  if(uri){try{adb('shell','content','delete','--uri',uri);}catch(_){}}
  throw Error('TRANSPORT: cannot create verified disposable MediaStore import fixture: '+String(e.message).slice(0,120));
 }
}

async function openDocument(name,code){
 stageImportFixtureInMediaStore(name,code);await pause(900);
 await evaluate("setTimeout(()=>ZenNative.importBackupFromFile(),0);true");
 let xml=(await nativeUI('real DocumentsUI',x=>x)).xml;
 let row=uiNodes(xml).find(n=>n.includes('text="'+name+'"'));
 if(!row){
  let downloads=uiNodes(xml).find(n=>/text="Downloads"/i.test(n));
  if(!downloads){const menu=uiNodes(xml).find(n=>/content-desc="(?:Show roots|Open navigation drawer|Navigate up)"/i.test(n));if(menu){tapUI(menu);await pause(500);xml=dumpUI();}downloads=uiNodes(xml).find(n=>/text="Downloads"/i.test(n));}
  if(!downloads)throw Error('TRANSPORT: Downloads root unavailable');
  tapUI(downloads);row=(await nativeUI('exact fixture '+name,x=>uiNodes(x).find(n=>n.includes('text="'+name+'"')))).item;
 }
 saveSafPickerEvidence(name+'_visible',null);tapUI(row);await pause(700);
 xml=dumpUI();
 if(/documentsui/i.test(xml)){
  const open=uiNodes(xml).find(n=>/text="OPEN"|resource-id="[^"]*action_menu_select"/i.test(n));
  if(open){tapUI(open);await pause(600);}
 }
 saveSafPickerEvidence(name+'_selected',null);
}
async function confirmDialog(accept){
 const u=await nativeUI('app-owned confirmation',x=>/text="Deep Focus"/.test(x)&&uiNodes(x).find(n=>n.includes('resource-id="android:id/button'+(accept?'1':'2')+'"')),false);
 saveSafPickerEvidence(accept?'consent_accept':'consent_cancel',u.xml);tapUI(u.item);await pause(500);
}
async function safMain(){
 requireEmulator();await connect();
 await run('saf_fixture_and_native_ack',async()=>{
  assert.equal(await write('after.cfg.lang="en";after.cfg.df07Unknown={keep:["legacy",7]};after.cfg.df07Seq=0;after.tasksList.push({id:71001,title:"DF07 isolated durability task",done:false,unknownTask:{keep:"عربي ۱۲"}});after.notesList.push({id:71002,title:"DF07 isolated durability note",body:"Exact Unicode ٣",unknownNote:{keep:42}})'),true);
  assert.equal((await receipt()).valid,true);
 });
 if(report.results.at(-1).status!=='PASS')return;
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
  let rejected=false;for(let i=0;i<8;i++){if(await evaluate("/Backup invalid/.test(document.getElementById('toastText').textContent)")){rejected=true;break;}await pause(200);}
  assert.equal(rejected,true,'Corrupt file must reach actual JS validator');
  assert.deepEqual(await snapshot(),before);assert.deepEqual(await receipt(),ack);
 });
 await run('saf_oversized_rejected',async()=>{
  const before=await snapshot(),ack=await receipt();await openDocument('p0-saf-oversized.txt','x'.repeat(8*1024*1024+1));
  const xml=(await nativeUI('native oversize rejection toast',x=>x.includes('Unable to read backup')&&x,false)).xml;
  saveSafPickerEvidence('oversized_rejected',xml);assert.deepEqual(await snapshot(),before);assert.deepEqual(await receipt(),ack);
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
async function main(){await safMain();}
main().catch(e=>report.results.push({name:'bootstrap',status:'NOT_TESTED',detail:String(e.message||e).slice(0,700)})).finally(()=>{
 try{ws?.close();}catch(_){}for(const p of pending.values())clearTimeout(p.timer);
 report.counts=Object.fromEntries(['PASS','FAIL','NOT_TESTED'].map(s=>[s,report.results.filter(x=>x.status===s).length]));
 fs.writeFileSync(process.argv[2]||'p0-android.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 if(!report.results.length||report.results.some(x=>x.status!=='PASS'))process.exitCode=1;
});
