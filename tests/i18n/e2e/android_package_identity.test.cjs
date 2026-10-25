'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../../..');
test('Android E2E must install and force-stop the exact immutable v21 app ID from Gradle',()=>{
 const gradle=fs.readFileSync(path.join(root,'android/app/build.gradle'),'utf8');
 const runner=fs.readFileSync(path.join(root,'tools/i18n/e2e/android_device.py'),'utf8');
 const id=/\bapplicationId\s*["']([^"']+)["']/.exec(gradle)?.[1];
 const target=/^PACKAGE\s*=\s*["']([^"']+)["']/m.exec(runner)?.[1];
 assert.equal(id,'com.zenstudy.focus','v21 package identity must remain unchanged');
 assert.equal(target,id,'the Android UIAutomator runner must target the APK applicationId');
 assert.ok(runner.includes('ACTIVITY = PACKAGE + "/com.zenstudy.focus.MainActivity"'));
});
