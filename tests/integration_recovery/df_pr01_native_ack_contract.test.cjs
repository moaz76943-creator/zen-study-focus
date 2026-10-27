'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const web=path.join(root,'android/app/src/main/assets/web');
const src=n=>fs.readFileSync(path.join(web,n),'utf8');
const java=fs.readFileSync(path.join(root,'android/app/src/main/java/com/zenstudy/focus/MainActivity.java'),'utf8');
const app=src('app.js'), preflight=src('preflight_v22.js'), integration=src('integration_v22.js');
const section=(a,start,end)=>a.slice(a.indexOf(start),a.indexOf(end,a.indexOf(start)));

test('Android receipt is AtomicFile + sync and exposes read and write',()=>{
  assert.match(java,/boolean acknowledgeDurableV21\(String json\)/);
  assert.match(java,/String readDurableV21\(\)/);
  assert.match(java,/new AtomicFile\(/);
  assert.match(java,/getFD\(\)\.sync\(\)/);
  assert.match(java,/failWrite\(/);
});
test('v21 preflight performs native recovery before inspecting browser packets',()=>{
  assert.match(preflight,/function replayNative\(/);
  assert.match(preflight,/function nativeAcknowledge\(/);
  assert.match(preflight,/try\s*\{\s*replayNative\(storage\);\s*report\s*=\s*inspect\(storage\)/);
});
test('v21 three-family editor commit requires durable ACK before publishing in-memory state',()=>{
  let s=section(integration,'function write(before,after)','function fromNoteEdit');
  const ack=s.indexOf('nativeAcknowledge(storage)'), publish=s.indexOf('cfg = after.cfg');
  assert.ok(ack>0 && publish>ack,'native ACK must precede publish');
  assert.match(s,/NATIVE_DURABLE_ACK_FAILED/);
});
test('legacy v21 single-family save cannot acknowledge without native disk sync',()=>{
  let s=section(app,'function saveFortressData(key, obj)','function loadFortressData');
  assert.match(s,/nativeAcknowledge\(localStorage\)/);
  assert.ok(s.indexOf('nativeAcknowledge(localStorage)')<s.indexOf('return true;'));
});
test('v21 SAF backup restoration requires native ACK before confirming success',()=>{
  let s=section(app,'function verifyAndRestoreBackupCode(codeStr)','function openCloudBackupModal');
  assert.match(s,/nativeAcknowledge\(localStorage\)/);
  assert.ok(s.indexOf('nativeAcknowledge(localStorage)')<s.indexOf('cfg = verified.cfg'));
  assert.match(s,/confirmSensitiveAction\('restore'\)/);
});
test('unchanged v21 identity and scoped SAF picker are maintained',()=>{
  assert.match(app,/ZEN21::/);
  assert.match(app,/zen_fortress_cfg_v21/);
  assert.match(app,/zen_fortress_tasks_v21/);
  assert.match(app,/zen_fortress_notes_v21/);
  assert.match(java,/REQUEST_BACKUP_IMPORT\s*=\s*7412/);
  assert.match(java,/setAllowContentAccess\(false\)/);
});

test('API33+ notifications request only follows an explicit timer start, never app launch',()=>{
  const onCreate=java.split('protected void onCreate(',2)[1].split('private void requestNotificationPermissionForTimer()',1)[0];
  assert.doesNotMatch(onCreate,/requestPermissions\(/,'Android notification consent must not interrupt WebView startup');
  assert.match(java,/private void requestNotificationPermissionForTimer\(\)/);
  assert.match(java,/Build.VERSION.SDK_INT >= 33/);
  const timer=section(java,'public void startBackgroundService(int seconds, String title)','public void requestTimerNotificationPermission()');
  assert.doesNotMatch(timer,/requestNotificationPermissionForTimer\(/,'Restored timers only rearm their alarm without prompting');
  const explicit=section(java,'public void requestTimerNotificationPermission()','public void stopBackgroundService()');
  assert.match(explicit,/runOnUiThread\(\(\) -> requestNotificationPermissionForTimer\(\)\)/);
  const restored=section(app,'function restoreTimerSession()','const ringCircumference');
  assert.doesNotMatch(restored,/requestTimerNotificationPermission\(/);
  const start=section(app,'function toggleTimerPlay()','function resetTimerNow()');
  assert.match(start,/requestTimerNotificationPermission\(/);
  const rest=section(app,'function startQuickSportRest(','function addReadPages(');
  assert.match(rest,/requestTimerNotificationPermission\(/);
});
