'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const testApp=fs.readFileSync(path.join(__dirname,'live_android_cdp.cjs'),'utf8');
const runner=fs.readFileSync(path.join(__dirname,'run_android_timer_qa.sh'),'utf8');
test('Android timer acceptance requires disposable emulator, actual CDP and physical ADB tap',()=>{
 assert.match(testApp,/DF_TRACK05_DISPOSABLE/);
 assert.match(testApp,/ro\.kernel\.qemu/);
 assert.match(testApp,/file:\/\/\/android_asset\/web\/index\.html/);
 assert.match(testApp,/readWebViewFrame\(adb/);
 assert.match(testApp,/adb\('shell','input','tap'/);
 assert.doesNotMatch(testApp,/window\.confirm\s*=/);
 assert.doesNotMatch(testApp,/\.click\(\)/,'No synthetic clicks for Android acceptance');
});
test('native cancellation uses Android Back and the identity+credit after-state',()=>{
 assert.match(testApp,/uiautomator/);
 assert.match(testApp,/android:id\/button1/);
 assert.match(testApp,/input','keyevent','4'/);
 assert.match(testApp,/after\.id,before\.id/);
 assert.match(testApp,/after\.sessions,before\.sessions/);
 assert.match(testApp,/locales\.length/);
});
test('Android source QA fails closed rather than marking missing WebView as pass',()=>{
 assert.match(testApp,/status==='NOT_TESTED'/);
 assert.match(testApp,/process\.exitCode=2/);
 assert.match(testApp,/process\.exitCode=1/);
 assert.match(runner,/node tests\/track05_timer\/live_android_cdp.cjs/);
 assert.doesNotMatch(runner,/run_e2e\.py/);
});
