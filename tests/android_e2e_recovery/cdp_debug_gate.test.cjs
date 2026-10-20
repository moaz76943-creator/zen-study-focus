'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const src=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/java/com/zenstudy/focus/MainActivity.java'),'utf8');
test('WebView debugging is enabled ONLY for explicitly debuggable APKs',()=>{
  assert.match(src,/ApplicationInfo\.FLAG_DEBUGGABLE/);
  assert.match(src,/WebView\.setWebContentsDebuggingEnabled\(debuggableBuild\)/);
  assert.doesNotMatch(src,/WebView\.setWebContentsDebuggingEnabled\(true\)/);
  assert.doesNotMatch(src,/WebView\.setWebContentsDebuggingEnabled\(false\)/);
});
test('evidence contains the same APK passed to adb install plus actual platform metadata',()=>{
 const script=fs.readFileSync(path.resolve(__dirname,'run_cdp_ci.sh'),'utf8');
 assert.match(script,/cp android\/app\/build\/outputs\/apk\/debug\/app-debug\.apk "\$report\/tested-app-debug\.apk"/);
 assert.match(script,/sha256sum "\$report\/tested-app-debug\.apk"/);
 assert.match(script,/adb install "\$report\/tested-app-debug\.apk"/);
 assert.match(script,/dumpsys webviewupdate/);assert.match(script,/getprop ro\.build\.version\.sdk/);
});
