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
const cases=[];let ws,next=0;const pending=new Map();
function record(name,status,reason,evidence={}){cases.push({name,status,reason,evidence});fs.writeFileSync(file,JSON.stringify({
 headSha:process.env.DF_N01_SOURCE_SHA||null,api,source:'installed debug Android WebView/ZenNative + private AtomicFile readback',
 cases,summary:{pass:cases.filter(x=>x.status==='PASS').length,fail:cases.filter(x=>x.status==='FAIL').length,notTested:cases.filter(x=>x.status==='NOT_TESTED').length},
 limits:['Injected pending marker models interrupted publication; physical power-cut fsync and SAF DocumentsUI remain NOT_TESTED'],
 releaseApproved:false},null,2)+'\n');console.log(JSON.stringify(cases.at(-1)));}
function status(err){return /^TRANSPORT:/.test(String(err.message||err))?'NOT_TESTED':'FAIL';}
const api=Number(adb('shell','getprop','ro.build.version.sdk'));
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
 assert.equal(adb('shell','getprop','ro.kernel.qemu'),'1','Real user devices forbidden');
 assert.match(adb('shell','pm','clear',PKG),/Success/);
 await start();
 try {
  assert.equal(await evaluate('window.DF22Preflight.nativeAcknowledge(localStorage)'),true,'Native ACK rejected valid current six packets');
  snapshot=await evaluate('window.ZenNative.readDurableV21()');
  assert.equal(typeof snapshot,'string');assert.ok(snapshot.startsWith('{"version":1,'));
  assert.deepEqual(JSON.parse(disk()),JSON.parse(snapshot),'Private native AtomicFile bytes differ from returned verified receipt');
  record('real-native-ack-readback','PASS','Exact six-packet receipt matches Android private AtomicFile',{sha256:sha(snapshot)});
  assert.equal(await evaluate('window.ZenNative.acknowledgeDurableV21("{\\"version\\":1,\\"packets\\":{}}")'),false);
  assert.equal(await evaluate('window.ZenNative.readDurableV21()'),snapshot);
  record('malformed-envelope-does-not-overwrite','PASS','Rejected invalid receipt preserves disk');
  await restart();
  assert.equal(await evaluate('window.ZenNative.readDurableV21()'),snapshot,'Native receipt lost after force-stop');
  assert.equal(disk(),snapshot,'Private native bytes lost after force-stop');
  record('force-stop-durable-native-ack','PASS','Actual private file survives Android process death');
  adb('shell','run-as',PKG,'touch',marker);
  assert.equal(await evaluate('window.ZenNative.readDurableV21()'),'ERROR','Pending marker must block replay');
  const refused=await evaluate("(()=>{const old=JSON.parse(window.ZenNative.readDurableV21()==='ERROR'?"+JSON.stringify(snapshot)+":window.ZenNative.readDurableV21());old.packets[Object.keys(old.packets)[0]]='disposable-rejected';return window.ZenNative.acknowledgeDurableV21(JSON.stringify(old));})()");
  assert.equal(refused,false,'Write accepted with pending marker');
  assert.equal(disk(),snapshot,'Rejected publication overwrote previous private file');
  await restart();
  assert.equal(await evaluate('window.ZenNative.readDurableV21()'),'ERROR','Startup resurrected pending/rejected update');
  assert.equal(disk(),snapshot,'Startup changed rejected private receipt');
  record('pending-marker-rejection-restart','PASS','Interrupted-publication marker refuses ACK and survives restart',{priorSha256:sha(snapshot)});
  adb('shell','run-as',PKG,'rm',marker);
  await restart();
  assert.equal(await evaluate('window.ZenNative.readDurableV21()'),snapshot,'Known previous receipt did not recover');
  record('explicit-test-fixture-recovery','PASS','Previous receipt recovered after removing disposable fault marker');
 }finally{try{adb('shell','run-as',PKG,'rm','-f',marker);}catch(_){}await disconnect();}
})().catch(e=>{record('native-ack-probe',status(e),String(e.message||e).slice(0,350));process.exitCode=status(e)==='FAIL'?1:2;}).finally(()=>{
 if(cases.some(c=>c.status!=='PASS'))process.exitCode=cases.some(c=>c.status==='FAIL')?1:2;
});
