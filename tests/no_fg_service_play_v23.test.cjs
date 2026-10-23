'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root,p),'utf8');
const dir = 'android/app/src/main/java/com/zenstudy/focus/';
test('Google Play v23 manifest has no foreground service declaration or permission',()=>{
 const xml=read('android/app/src/main/AndroidManifest.xml');
 assert.doesNotMatch(xml,/FOREGROUND_SERVICE|foregroundServiceType|<service\b|SPECIAL_USE/);
 assert.match(xml,/android.permission.RECEIVE_BOOT_COMPLETED/);
 assert.match(xml,/\.FocusAlarmReceiver/);
});
test('No foreground service execution path remains in app native classes',()=>{
 const files=fs.readdirSync(path.join(root,dir)).filter(x=>x.endsWith('.java'));
 const java=files.map(x=>read(dir+x)).join('\n');
 assert.doesNotMatch(java,/startForeground\(|startForegroundService\(|new CountDownTimer\(|PARTIAL_WAKE_LOCK/);
 assert.doesNotMatch(java,/com\.zenstudy\.focus"\.equals\(getPackageName\(\)\)/);
});
test('Android native timer bridge schedules or cancels AlarmManager, never starts an Android service',()=>{
 const main=read(dir+'MainActivity.java');
 assert.match(main,/FocusAlarmReceiver\.schedule\(/);
 assert.match(main,/FocusAlarmReceiver\.cancel\(/);
 assert.match(main,/FocusAlarmReceiver\.completeNow\(/);
 assert.doesNotMatch(main,/startService\(|stopService\(/);
});
test('Alarm receiver validates current timer and schedules without exact-alarm special access',()=>{
 const java=read(dir+'FocusAlarmReceiver.java');
 assert.match(java,/extends BroadcastReceiver/);
 assert.match(java,/AlarmManager\.RTC_WAKEUP/);
 assert.match(java,/\.setAndAllowWhileIdle\(/);
 assert.match(java,/token/);
 assert.match(java,/deadline/);
 assert.match(java,/BOOT_COMPLETED/);
 assert.match(java,/POST_NOTIFICATIONS/);
 assert.doesNotMatch(java,/\\.setExact|Manifest\\.permission\\.SCHEDULE_EXACT_ALARM|\\bstartForeground\\(/);
});
test('Release metadata matches existing Play package and increases versionCode',()=>{
 const g=read('android/app/build.gradle');
 assert.match(g,/applicationId "com\.deepfocus\.study"/);
 assert.match(g,/versionCode 23/);
 assert.match(g,/versionName "3\.1\.4"/);
 assert.match(g,/targetSdk 36/);
});
test('v21 app session compatibility stays intact',()=>{
 const js=read('android/app/src/main/assets/web/app.js');
 for(const key of ['zen_fortress_active_timer_v21','zen_fortress_cfg_v21','startBackgroundService','stopBackgroundService','triggerCompletionSound']) assert.ok(js.includes(key),key);
});
