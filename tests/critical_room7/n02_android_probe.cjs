'use strict';
// Real disposable Android only. No fake JsResult, native bridge or saved packets.
const fs = require('node:fs');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const PKG = 'com.zenstudy.focus';
const PREFS = 'shared_prefs/zen_native_timer_alarm_v21.xml';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function parseAlarmPrefs(xml) {
  assert.match(xml, /<map[\s>]/, 'Android SharedPreferences XML unavailable');
  const result = {};
  for (const match of xml.matchAll(/<(boolean|long)\s+name="([^"]+)"\s+value="([^"]+)"\s*\/>/g)) {
    result[match[2]] = match[1] === 'boolean' ? match[3] === 'true' : Number(match[3]);
  }
  for (const key of ['active', 'token', 'deadline', 'lastNotified']) {
    assert.ok(Object.hasOwn(result, key), 'Missing native preference ' + key);
  }
  for (const key of ['token', 'deadline', 'lastNotified']) {
    assert.ok(Number.isSafeInteger(result[key]), 'Invalid native preference ' + key);
  }
  return result;
}
function notificationKeys(output, id) {
  return output.split(/\r?\n/).map(line => line.trim()).filter(line => {
    const parts = line.split('|');
    return parts.length >= 5 && parts[1] === PKG && parts[2] === String(id);
  });
}
// CDP evaluation crosses asynchronous Android/WebView boundaries. A live
// countdown can tick before the second read; compare against real elapsed time.
function liveTimerStarted(value, requestedSeconds, elapsedMs) {
  if (!Number.isSafeInteger(requestedSeconds) || requestedSeconds < 1 ||
      !Number.isFinite(elapsedMs) || elapsedMs < 0) return false;
  const drift = Math.min(requestedSeconds - 1, Math.ceil(elapsedMs / 1000) + 1);
  return Boolean(value && value.running && value.id &&
    Number.isSafeInteger(value.left) &&
    value.left <= requestedSeconds &&
    value.left >= Math.max(1, requestedSeconds - drift));
}
module.exports = {parseAlarmPrefs, notificationKeys, liveTimerStarted};

async function main() {
  const file = process.argv[2];
  assert.ok(file, 'TEST_INFRA: JSON evidence path is required');
  const serial = process.env.DF_TRACK05_SERIAL;
  assert.equal(process.env.DF_TRACK05_DISPOSABLE, '1', 'TEST_INFRA: fresh disposable profile required');
  assert.match(serial || '', /^emulator-\d+$/, 'TEST_INFRA: emulator serial required');
  const adb = (...args) => {
    try { return cp.execFileSync('adb', ['-s', serial, ...args], {encoding:'utf8',timeout:25000,stdio:['ignore','pipe','pipe']}).trim(); }
    catch (error) { throw Error('TRANSPORT: adb ' + args.slice(0,4).join(' ') + ' failed: ' + String(error.stderr || error.message).slice(0,180)); }
  };
  assert.equal(adb('shell','getprop','ro.kernel.qemu'), '1', 'TEST_INFRA: physical devices are forbidden');
  const api = Number(adb('shell','getprop','ro.build.version.sdk'));
  let ws, sequence = 0;
  const waiting = new Map(), cases = [];
  const prefs = () => parseAlarmPrefs(adb('shell','run-as',PKG,'cat',PREFS));
  const notifications = id => notificationKeys(adb('shell','cmd','notification','list'),id);
  function call(method,params={}) {
    return new Promise((resolve,reject) => {
      const id=++sequence,timer=setTimeout(()=>{waiting.delete(id);reject(Error('TRANSPORT: CDP '+method+' timeout'));},15000);
      waiting.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}));
    });
  }
  async function evaluate(expression) {
    const reply=await call('Runtime.evaluate',{expression,returnByValue:true});
    if(reply.exceptionDetails)throw Error('APP_EXCEPTION: '+JSON.stringify(reply.exceptionDetails).slice(0,250));
    return reply.result?.value;
  }
  async function disconnect() {
    try { ws?.close(); } catch (_) {}
    try { adb('forward','--remove','tcp:9222'); } catch (_) {}
  }
  async function connect() {
    const pid=adb('shell','pidof',PKG).split(/\s/)[0];
    assert.match(pid,/^\d+$/, 'TRANSPORT: app PID unavailable');
    adb('forward','tcp:9222','localabstract:webview_devtools_remote_'+pid);
    let target;
    for(let n=0;n<30;n++) {
      try {
        const pages=await(await fetch('http://127.0.0.1:9222/json/list',{signal:AbortSignal.timeout(2500)})).json();
        target=pages.find(page=>page.type==='page'&&page.url==='file:///android_asset/web/index.html');
      } catch (_) {}
      if(target)break;await sleep(300);
    }
    if(!target)throw Error('TRANSPORT: trusted WebView CDP unavailable');
    const url=new URL(target.webSocketDebuggerUrl);
    assert.ok(url.protocol==='ws:'&&['localhost','127.0.0.1'].includes(url.hostname),'TEST_INFRA: unsafe CDP destination');
    url.port='9222';ws=new WebSocket(url);
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(Error('TRANSPORT: CDP open timeout')),10000);
      ws.addEventListener('open',()=>{clearTimeout(timer);resolve();},{once:true});
      ws.addEventListener('error',()=>{clearTimeout(timer);reject(Error('TRANSPORT: CDP open failed'));},{once:true});
    });
    ws.addEventListener('message',event=>{
      let reply;try{reply=JSON.parse(event.data);}catch(_){return;}
      const request=waiting.get(reply.id);if(!request)return;
      waiting.delete(reply.id);clearTimeout(request.timer);
      if(reply.error)request.reject(Error('TRANSPORT: CDP '+JSON.stringify(reply.error)));else request.resolve(reply.result);
    });
    await call('Runtime.enable');
    for(let n=0;n<40;n++) {
      if(await evaluate("document.readyState==='complete'&&typeof toggleTimerPlay==='function'&&!!window.ZenNative"))return;
      await sleep(250);
    }
    throw Error('TRANSPORT: live timer/bridge startup unavailable');
  }
  async function launch() {
    adb('shell','am','start','-W','-n',PKG+'/.MainActivity');await sleep(1200);await connect();
  }
  async function fresh() {
    await disconnect();assert.match(adb('shell','pm','clear',PKG),/Success/);
    if(api>=33)adb('shell','pm','grant',PKG,'android.permission.POST_NOTIFICATIONS');
    await launch();
    assert.equal(await evaluate('cfg.sessions||0'),0,'Disposable profile is not fresh');
    assert.equal(notifications(2002).length,0,'Fresh profile retained completion notification');
  }
  async function startLive(seconds) {
    assert.equal(await evaluate(`changeTimerDelta((${seconds}-timerLeft)/60)`),true,'Real timer shortening refused');
    const startAt=Date.now();
    assert.equal(await evaluate('toggleTimerPlay()'),true,'Real Start refused');
    const value=await evaluate('({id:timerSessionId,running:timerRunning,left:timerLeft})');
    assert.ok(liveTimerStarted(value,seconds,Date.now()-startAt),
      'Live timer did not start or elapsed unexpectedly: '+JSON.stringify({value,seconds}));
    const state=prefs();assert.equal(state.active,true);return {...state,id:value.id};
  }
  async function noCompletionThrough(deadline) {
    while(Date.now()<deadline+5000) {
      assert.equal(notifications(2002).length,0,'Cancelled/stopped timer posted a completion notification');
      assert.equal(prefs().lastNotified,0,'Cancelled/stopped timer was delivered');
      await sleep(800);
    }
    return prefs();
  }
  async function deliveredOnce(expected) {
    let observed;
    const timeout=Math.max(Date.now(),expected.deadline)+120000;
    while(Date.now()<timeout) {
      const current=prefs(),keys=notifications(2002);
      if(!current.active&&current.lastNotified>0&&keys.length===1){observed={...current,notificationKey:keys[0]};break;}
      await sleep(700);
    }
    assert.ok(observed,'No actual native completion/notification within deadline +120s (inexact alarm)');
    assert.equal(observed.token,expected.token,'Wrong timer generation completed');
    assert.ok(observed.lastNotified>=expected.deadline,'Native notification arrived before deadline');
    assert.equal(notifications(1001).length,0,'Active countdown notification remained after delivery');
    await sleep(8000);
    assert.equal(prefs().lastNotified,observed.lastNotified,'Duplicate native completion after first delivery');
    assert.deepEqual(notifications(2002),[observed.notificationKey],'Completion notification changed/duplicated');
    return {token:observed.token,deadline:expected.deadline,lastNotified:observed.lastNotified,delayMs:observed.lastNotified-expected.deadline,notificationKey:observed.notificationKey,duplicateObservationMs:8000};
  }
  async function approveLiveDialog(expression) {
    await evaluate(`setTimeout(()=>{${expression}},0);true`);
    for(let n=0;n<6;n++) {
      adb('shell','uiautomator','dump','/sdcard/n02-native-dialog.xml');
      const xml=adb('shell','cat','/sdcard/n02-native-dialog.xml');
      const node=(xml.match(/<node\b[^>]*>/g)||[]).find(node=>node.includes('resource-id="android:id/button1"')&&node.includes('package="'+PKG+'"'));
      const match=node&&/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/.exec(node);
      if(match){const [x,y,right,bottom]=match.slice(1).map(Number);adb('shell','input','tap',String(Math.round((x+right)/2)),String(Math.round((y+bottom)/2)));await sleep(350);return;}
      await sleep(300);
    }
    throw Error('TRANSPORT: actual native consent button not observable');
  }
  function writeReport() {
    const summary={pass:cases.filter(value=>value.status==='PASS').length,fail:cases.filter(value=>value.status==='FAIL').length,notTested:cases.filter(value=>value.status==='NOT_TESTED').length};
    fs.writeFileSync(file,JSON.stringify({headSha:process.env.DF_TEST_SOURCE_SHA||process.env.GITHUB_SHA,api,source:'actual Android AlarmManager + native SharedPreferences + NotificationManager + live WebView',cases,summary,limits:['inexact alarms; foreground screen-on emulator','Doze/DND/audible/physical-device acceptance NOT_TESTED'],releaseApproved:false},null,2)+'\n');
  }
  async function run(name,fn) {
    try {const evidence=await fn();cases.push({name,status:'PASS',evidence});}
    catch(error){const detail=String(error.message||error);cases.push({name,status:/^(TRANSPORT:|TEST_INFRA:)/.test(detail)?'NOT_TESTED':'FAIL',detail:detail.slice(0,450)});}
    writeReport();
    console.log(JSON.stringify(cases.at(-1)));
  }
  try {
    await run('native-deadline-delivers-once',async()=>{await fresh();await evaluate("window.ZenNative.startBackgroundService(3,'N02 synthetic deadline');true");return deliveredOnce(prefs());});
    await run('live-pause-suppresses-then-resume-delivers-once',async()=>{
      await fresh();const first=await startLive(10);await sleep(700);
      assert.equal(await evaluate('toggleTimerPlay()'),true,'Pause refused');assert.equal(prefs().active,false);
      await noCompletionThrough(first.deadline);
      assert.equal(await evaluate('toggleTimerPlay()'),true,'Resume refused');const resumed=prefs();
      assert.ok(resumed.active&&resumed.token>first.token,'Resume did not re-arm a fresh generation');
      assert.equal(await evaluate('timerSessionId'),first.id,'Resume changed live session ID');
      return {pausedToken:first.token,...await deliveredOnce(resumed)};
    });
    await run('live-reset-cancels-native-deadline',async()=>{
      await fresh();const before=await startLive(30);await approveLiveDialog('resetTimerNow()');
      assert.equal(await evaluate('timerRunning'),false);assert.equal(await evaluate('timerSessionId'),null);assert.equal(prefs().active,false);
      await noCompletionThrough(before.deadline);return {cancelledToken:before.token,checkedThrough:before.deadline+5000};
    });
    await run('live-training-cancel-cancels-native-deadline',async()=>{
      await fresh();await evaluate("document.getElementById('qtSets').value='2';document.getElementById('qtWork').value='00:30';document.getElementById('qtRest').value='00:30';startQuickTraining();true");
      assert.equal(await evaluate('!!quickTraining?.active&&timerRunning'),true,'Quick Training did not start');const before=prefs();
      await approveLiveDialog('cancelQuickTraining()');assert.equal(await evaluate('!!quickTraining?.active||timerRunning'),false);assert.equal(prefs().active,false);
      await noCompletionThrough(before.deadline);return {cancelledToken:before.token,checkedThrough:before.deadline+5000};
    });
    await run('force-stop-cancels-os-delivery-expired-reopen-reconciles-once',async()=>{
      await fresh();const before=await startLive(10);await disconnect();adb('shell','am','force-stop',PKG);
      const stopped=adb('shell','dumpsys','package',PKG);assert.match(stopped,/stopped=true/,'OS did not mark package stopped');
      await noCompletionThrough(before.deadline);assert.equal(prefs().active,true,'Force-stop should leave disk receipt, not execute receiver');
      await launch();assert.equal(await evaluate('timerRunning'),false);assert.equal(await evaluate('cfg.sessions||0'),1,'Expired real session was not reconciled exactly once');assert.equal(notifications(2002).length,0,'Expired reopen manufactured native alert');
      await disconnect();adb('shell','am','force-stop',PKG);await launch();assert.equal(await evaluate('cfg.sessions||0'),1,'Reopen credited session twice');
      return {token:before.token,osStopped:true,noDeliveryWhileStopped:true,expiredReopenCredits:1};
    });
    await run('force-stop-future-reopen-rearms-and-delivers-once',async()=>{
      await fresh();const before=await startLive(30);await disconnect();adb('shell','am','force-stop',PKG);await launch();
      const restored=prefs();assert.equal(await evaluate('timerSessionId'),before.id);assert.equal(await evaluate('timerRunning'),true);
      assert.ok(restored.active&&restored.token>before.token,'Actual reopened page did not re-arm native alarm');assert.ok(Math.abs(restored.deadline-before.deadline)<=1500,'Reopen shifted saved deadline');
      return {restoredFromToken:before.token,...await deliveredOnce(restored)};
    });
  } finally {
    // Leave the pre-existing independent timer suite a clean disposable profile.
    try {await fresh();}catch(error){cases.push({name:'cleanup-disposable-profile',status:'NOT_TESTED',detail:String(error.message).slice(0,250)});}
    await disconnect();
    writeReport();
  }
  const failed=cases.filter(value=>value.status!=='PASS');
  if(cases.length<6||failed.length)process.exitCode=failed.some(value=>value.status==='FAIL')?1:2;
}
if(require.main===module)main().catch(error=>{console.error(String(error.stack||error));process.exitCode=2;});
