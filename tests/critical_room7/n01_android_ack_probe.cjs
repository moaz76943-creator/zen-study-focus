'use strict';
// Real disposable Android emulator only. No fake bridge/AtomicFile; no user data.
// Proves native receipt readback, process-death durability, rejection and startup
// fail-closed on a deliberately placed pending marker (not a power-cut test).
const fs=require('node:fs'),cp=require('node:child_process'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const PKG='com.zenstudy.focus',sleep=ms=>new Promise(r=>setTimeout(r,ms));
const file=process.argv[2];assert.ok(file,'N01 evidence file required');
const serial=process.env.DF_N01_SERIAL||'emulator-5554';
assert.match(serial,/^emulator-\d+$/);
assert.equal(process.env.DF_N01_DISPOSABLE,'1','Disposable emulator consent required');
function adb(...args){
 try{return cp.execFileSync('adb',['-s',serial,...args],{encoding:'utf8',timeout:25000,stdio:['ignore','pipe','pipe']}).trim();}
 catch(e){throw Error('TRANSPORT: '+args.slice(0,3).join(' ')+' failed: '+String(e.stderr||e.message).slice(0,180));}
}
const sha=s=>crypto.createHash('sha256').update(s,'utf8').digest('hex');
const D=require('../../android/app/src/main/assets/web/data_compat_v21.js');
function assertFixture(receipt){
 const packets=JSON.parse(receipt).packets;
 for(const [slot,key] of Object.entries(D.KEYS)){
  const raw=packets[key],mirror=packets[key+'_mirror'];
  assert.equal(D.inspectPacket(raw).ok,true,'Invalid checksum/payload: '+key);
  assert.equal(D.inspectPacket(mirror).ok,true,'Invalid mirror checksum/payload: '+key);
  assert.equal(JSON.parse(raw).payload,JSON.parse(mirror).payload,'Divergent native family: '+key);
  const value=D.inspectPacket(raw).value;
  if(slot==='tasks')assert.deepEqual(value.find(x=>x.id===81001),{id:81001,title:'N01 task مهمة',done:false,extra:{preserved:'task-extra'},checklist:[{id:81002,title:'child',done:true}]});
  if(slot==='notes')assert.deepEqual(value.find(x=>x.id===82001),{id:82001,title:'N01 note ملاحظة',body:'Durable body\nسطر محفوظ',extra:{preserved:'note-extra'}});
  if(slot==='cfg'){
   assert.equal(value.n01Extra.preserved,'cfg-extra');
   assert.equal(value.sessionHistory.filter(x=>x.id==='n01-disposable-session').length,1,'Lost or duplicated session');
   assert.equal(value.sessionHistory.find(x=>x.id==='n01-disposable-session').minutes,5);
   assert.equal(value.completedTimerIds.filter(x=>x==='n01-disposable-session').length,1,'Lost or duplicated credit ID');
   assert.equal(value.sessions,1,'Session counter changed');
   assert.equal(value.todayMins,5,'Focus minutes changed');
  }
 }
}
const cases=[];let ws,next=0;const pending=new Map();
function record(name,status,reason,evidence={}){cases.push({name,status,reason,evidence});fs.writeFileSync(file,JSON.stringify({
 headSha:process.env.DF_N01_SOURCE_SHA||null,api,source:'installed debug Android WebView/ZenNative + private AtomicFile readback',
 cases,summary:{pass:cases.filter(x=>x.status==='PASS').length,fail:cases.filter(x=>x.status==='FAIL').length,notTested:cases.filter(x=>x.status==='NOT_TESTED').length},
 limits:['Injected pending marker models interrupted publication; physical power-cut fsync and SAF DocumentsUI remain NOT_TESTED'],
 releaseApproved:false},null,2)+'\n');console.log(JSON.stringify(cases.at(-1)));}
function status(err){return /^TRANSPORT:/.test(String(err.message||err))?'NOT_TESTED':'FAIL';}
let api=null;
async function disconnect(){
 try{ws?.close();}catch(_){}
 ws=undefined;try{adb('forward','--remove','tcp:9224');}catch(_){}
}
async function connect(){
 const pid=adb('shell','pidof',PKG).split(/\s/)[0];assert.match(pid,/^\d+$/,'TRANSPORT: real app PID missing');
 adb('forward','tcp:9224','localabstract:webview_devtools_remote_'+pid);
 let target;
 for(let i=0;i<35;i++){
  try{const response=await fetch('http://127.0.0.1:9224/json/list',{signal:AbortSignal.timeout(2500)});
    const pages=await response.json();target=pages.find(x=>x.type==='page'&&x.url==='file:///android_asset/web/index.html');
  }catch(_){}
  if(target)break;await sleep(500);
 }
 if(!target)throw Error('TRANSPORT: trusted WebView unavailable');
 const url=new URL(target.webSocketDebuggerUrl);assert.ok(url.protocol==='ws:'&&['127.0.0.1','localhost'].includes(url.hostname),'Unsafe local CDP target');
 url.hostname='127.0.0.1';url.port='9224';
 ws=new WebSocket(url);await new Promise((resolve,reject)=>{
  const t=setTimeout(()=>reject(Error('TRANSPORT: CDP open timeout')),10000);
  ws.addEventListener('open',()=>{clearTimeout(t);resolve();},{once:true});
  ws.addEventListener('error',()=>{clearTimeout(t);reject(Error('TRANSPORT: CDP websocket error'));},{once:true});
 });
 ws.addEventListener('message',msg=>{
  let obj;try{obj=JSON.parse(msg.data);}catch(_){return;}
  const p=pending.get(obj.id);if(!p)return;
  pending.delete(obj.id);clearTimeout(p.timer);
  if(obj.error||obj.result?.exceptionDetails)p.reject(Error('APP_EXCEPTION: '+JSON.stringify(obj.error||obj.result.exceptionDetails).slice(0,300)));
  else p.resolve(obj.result);
 });
 await call('Runtime.enable',{});
}
function call(method,params){
 return new Promise((resolve,reject)=>{const id=++next,timer=setTimeout(()=>{pending.delete(id);reject(Error('TRANSPORT: CDP '+method+' timeout'));},15000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}));});
}
async function evaluate(script){return (await call('Runtime.evaluate',{expression:script,returnByValue:true})).result?.value;}
async function start(){
 adb('shell','am','start','-W','-n',PKG+'/.MainActivity');await sleep(1600);
 await connect();
 for(let n=0;n<28;n++){if(await evaluate("document.readyState==='complete'&&location.href==='file:///android_asset/web/index.html'&&!!window.ZenNative"))return;await sleep(350);}
 throw Error('TRANSPORT: bundle/native bridge not ready');
}
async function restart(){await disconnect();adb('shell','am','force-stop',PKG);await start();}
const disk=()=>adb('shell','run-as',PKG,'cat','files/v21_durable_packets_v1');
const marker='files/v21_durable_packets_v1.pending';
let snapshot;
(async()=>{
 api=Number(adb('shell','getprop','ro.build.version.sdk'));
 assert.equal(adb('shell','getprop','ro.kernel.qemu'),'1','Real user devices forbidden');
 assert.match(adb('shell','pm','clear',PKG),/Success/);
 try {
  await start();
  assert.equal(await evaluate(`(()=>{
   const before=window.DF22Integration.getSnapshot(),after=JSON.parse(JSON.stringify(before));
   after.tasksList=[{id:81001,title:'N01 task مهمة',done:false,extra:{preserved:'task-extra'},checklist:[{id:81002,title:'child',done:true}]}];
   after.notesList=[{id:82001,title:'N01 note ملاحظة',body:'Durable body\\nسطر محفوظ',extra:{preserved:'note-extra'}}];
   after.cfg.n01Extra={preserved:'cfg-extra'};
   after.cfg.sessionHistory=[{id:'n01-disposable-session',date:localDateISO(),minutes:5,domain:'study',mode:'focus',completed:true}];
   after.cfg.completedTimerIds=['n01-disposable-session'];
   // Seed the same consistent derived counters as a real completed session.
   // Startup correctly recalculates streak; an inconsistent synthetic cfg
   // would change legitimately and invalidate exact signed-payload comparison.
   after.cfg.sessions=1;after.cfg.todayMins=5;after.cfg.metricsDate=localDateISO();
   after.cfg.streak=computeActualStreak(after.cfg.sessionHistory);
   return window.DF22Integration.write(before,after);
  })()`),true,'Could not save disposable records through real integration/ACK');
  assert.equal(await evaluate('window.DF22Preflight.nativeAcknowledge(localStorage)'),true,'Native ACK rejected valid current six packets');
  snapshot=await evaluate('window.ZenNative.readDurableV21()');
  assert.equal(typeof snapshot,'string');assert.ok(snapshot.startsWith('{"version":1,'));
  assert.deepEqual(JSON.parse(disk()),JSON.parse(snapshot),'Private native AtomicFile bytes differ from returned verified receipt');
  assertFixture(snapshot);
  record('real-native-ack-readback','PASS','Exact six-packet receipt matches Android private AtomicFile',{sha256:sha(snapshot)});
  assert.equal(await evaluate('window.ZenNative.acknowledgeDurableV21("{\\"version\\":1,\\"packets\\":{}}")'),false);
  assert.equal(await evaluate('window.ZenNative.readDurableV21()'),snapshot);
  record('malformed-envelope-does-not-overwrite','PASS','Rejected invalid receipt preserves disk');
  for(const suffix of ['', '_mirror']){
    const result=await evaluate(`(()=>{
      const before=window.DF22Integration.getSnapshot(),after=JSON.parse(JSON.stringify(before));
      after.tasksList[0].title='REJECTED write';
      const raw=JSON.stringify(window.DeepFocusDataCompatV21.captureRaw(localStorage));
      const proto=Object.getPrototypeOf(localStorage),set=proto.setItem;
      let injected=false,error='';
      proto.setItem=function(k,v){if(!injected&&k===${JSON.stringify(D.KEYS.tasks+suffix)}){injected=true;throw Error('N01InjectedWrite');}return set.call(this,k,v);};
      try{window.DF22Integration.write(before,after);}catch(e){error=String(e.message);}finally{proto.setItem=set;}
      return {injected,error,unchanged:JSON.stringify(before)===JSON.stringify(window.DF22Integration.getSnapshot()),rawUnchanged:raw===JSON.stringify(window.DeepFocusDataCompatV21.captureRaw(localStorage))};
    })()`);
    assert.equal(result.injected,true);assert.match(result.error,/N01InjectedWrite/);
    assert.equal(result.unchanged,true);assert.equal(result.rawUnchanged,true);
    assert.equal(await evaluate('window.ZenNative.readDurableV21()'),snapshot);
    record(suffix?'mirror-write-refused':'primary-write-refused','PASS','Real WebView storage failure rolls back all records without advancing native receipt');
  }
  await restart();
  const reopened=await evaluate('window.ZenNative.readDurableV21()');
  assertFixture(reopened);
  assert.ok(reopened!=='ERROR'&&reopened!=='NONE','Native receipt unreadable after force-stop');
  assert.equal(disk(),reopened,'Private native bytes disagree with post-restart readback');
  // Startup may legitimately re-stamp packet metadata. Compare signed payloads
  // instead of JSON string equality, while refusing lost or changed user records.
  const previousPackets=JSON.parse(snapshot).packets,reopenedPackets=JSON.parse(reopened).packets;
  assert.deepEqual(Object.keys(reopenedPackets).sort(),Object.keys(previousPackets).sort(),'Six-family receipt changed shape');
  for(const k of Object.keys(previousPackets)){
    const original=previousPackets[k],current=reopenedPackets[k];
    assert.equal(current===null,original===null,'Native family absent after restart: '+k);
    if(original!==null){
      const oldPacket=JSON.parse(original),newPacket=JSON.parse(current);
      assert.equal(newPacket.payload,oldPacket.payload,'Native user data changed on restart: '+k);
      assert.equal(newPacket.sig,oldPacket.sig,'Native packet signature changed on restart: '+k);
    }
  }
  snapshot=reopened;
  record('force-stop-durable-native-ack','PASS','Signed six-family native payloads survive Android process death');
  adb('shell','run-as',PKG,'touch',marker);
  assert.equal(await evaluate('window.ZenNative.readDurableV21()'),'ERROR','Pending marker must block replay');
  const refusedEdit=await evaluate(`(()=>{
    const before=window.DF22Integration.getSnapshot(),after=JSON.parse(JSON.stringify(before));after.notesList[0].body='REJECTED native edit';
    try{window.DF22Integration.write(before,after);return {accepted:true};}catch(e){return {accepted:false,error:String(e.message),unchanged:JSON.stringify(before)===JSON.stringify(window.DF22Integration.getSnapshot())};}
  })()`);
  assert.equal(refusedEdit.accepted,false);assert.match(refusedEdit.error,/NATIVE_DURABLE_ACK_FAILED/);assert.equal(refusedEdit.unchanged,true);
  const refused=await evaluate("(()=>{const old=JSON.parse(window.ZenNative.readDurableV21()==='ERROR'?"+JSON.stringify(snapshot)+":window.ZenNative.readDurableV21());old.packets[Object.keys(old.packets)[0]]='disposable-rejected';return window.ZenNative.acknowledgeDurableV21(JSON.stringify(old));})()");
  assert.equal(refused,false,'Write accepted with pending marker');
  assert.equal(disk(),snapshot,'Rejected publication overwrote previous private file');
  await restart();
  assert.equal(await evaluate('window.ZenNative.readDurableV21()'),'ERROR','Startup resurrected pending/rejected update');
  assert.equal(disk(),snapshot,'Startup changed rejected private receipt');
  record('pending-marker-rejection-restart','PASS','Interrupted-publication marker refuses ACK and survives restart',{priorSha256:sha(snapshot)});
  adb('shell','run-as',PKG,'rm',marker);
  await restart();
  const recovered=await evaluate('window.ZenNative.readDurableV21()');
  assertFixture(recovered);
  assert.ok(recovered!=='NONE'&&recovered!=='ERROR','Known prior native receipt was not readable after clearing disposable marker');
  assert.equal(disk(),recovered,'Android private AtomicFile does not match recovered readback');
  const beforeRecovery=JSON.parse(snapshot).packets,afterRecovery=JSON.parse(recovered).packets;
  assert.deepEqual(Object.keys(afterRecovery).sort(),Object.keys(beforeRecovery).sort());
  for(const k of Object.keys(beforeRecovery)){
    assert.equal(afterRecovery[k]===null,beforeRecovery[k]===null,'Native record disappeared after marker removal: '+k);
    if(beforeRecovery[k]!==null){
      assert.equal(JSON.parse(afterRecovery[k]).payload,JSON.parse(beforeRecovery[k]).payload,'Recovered user data differs: '+k);
      assert.equal(JSON.parse(afterRecovery[k]).sig,JSON.parse(beforeRecovery[k]).sig,'Recovered signature differs: '+k);
    }
  }
  record('explicit-test-fixture-recovery','PASS','Signed prior records recovered after removing disposable fault marker');
  // Real native I/O fault: AtomicFile cannot open its .new path as a file.
  // Keep the old bytes, require rejection, and remove only this disposable fault.
  const staged='files/v21_durable_packets_v1.new';
  adb('shell','run-as',PKG,'mkdir',staged);
  // AtomicFile.openRead removes an empty stale .new path. A non-empty
  // directory survives that cleanup and forces the real startWrite failure.
  adb('shell','run-as',PKG,'touch',staged+'/n01_disposable_fault');
  try{
    assert.equal(await evaluate(`(()=>{
      const envelope=JSON.parse(window.ZenNative.readDurableV21());
      const key='zen_fortress_notes_v21',notes=window.DeepFocusDataCompatV21.inspectPacket(envelope.packets[key]).value;
      notes[0].body='REJECTED native I/O edit';
      envelope.packets[key]=envelope.packets[key+'_mirror']=window.DeepFocusDataCompatV21.encodePacket(notes);
      return window.ZenNative.acknowledgeDurableV21(JSON.stringify(envelope));
    })()`),false,'AtomicFile I/O failure must refuse ACK');
    assert.equal(disk(),recovered,'AtomicFile failure overwrote last valid receipt');
    record('atomicfile-startwrite-failure','PASS','Real Android file/directory conflict refuses publication and preserves prior bytes');
  }finally{
    adb('shell','run-as',PKG,'rm',staged+'/n01_disposable_fault');
    adb('shell','run-as',PKG,'rmdir',staged);
    adb('shell','run-as',PKG,'rm','-f',marker);
  }
  // Corrupt only the disposable native fixture; never delete a user database.
  const backup='files/n01_disposable_receipt_backup';
  adb('shell','run-as',PKG,'cp','files/v21_durable_packets_v1',backup);
  try{
    adb('shell','run-as',PKG,'truncate','-s','1','files/v21_durable_packets_v1');
    assert.equal(await evaluate('window.ZenNative.readDurableV21()'),'ERROR','Corrupt native JSON must not be replayed');
    await restart();
    assert.equal(await evaluate('!!document.getElementById("df22-startup-block")'),true,'Corrupt native checkpoint must block startup');
    record('corrupt-native-receipt-blocks-startup','PASS','Actual corrupted private file is refused on read and reopening');
  }finally{adb('shell','run-as',PKG,'cp',backup,'files/v21_durable_packets_v1');adb('shell','run-as',PKG,'rm',backup);}
  await restart();
  assertFixture(await evaluate('window.ZenNative.readDurableV21()'));
 }finally{try{adb('shell','run-as',PKG,'rm','-f',marker);}catch(_){}await disconnect();}
})().catch(e=>{record('native-ack-probe',status(e),String(e.message||e).slice(0,350));process.exitCode=status(e)==='FAIL'?1:2;}).finally(()=>{
 if(cases.some(c=>c.status!=='PASS'))process.exitCode=cases.some(c=>c.status==='FAIL')?1:2;
});
