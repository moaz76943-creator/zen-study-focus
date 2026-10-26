'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/assets/web/app.js'),'utf8');
const match=source.match(/((?:async\s+)?function syncToGoogleCloudNow\(\)\s*\{[\s\S]*?\n\})\s*\nfunction downloadEncryptedBackupFile/);
assert.ok(match,'Find current native/clipboard backup sharing function');
function start({clipboard,native}={}) {
 const notices=[];
 const ctx={window:{ZenNative:native||null},navigator:{clipboard},generateEncryptedBackupCode:()=> 'ZEN21::fixture',showToast:s=>notices.push(s)};
 vm.runInNewContext(match[1],ctx);
 return {notices,run:()=>ctx.syncToGoogleCloudNow()};
}
test('clipboard reports success only after write promise resolves',async()=>{
 let finish;
 const {notices,run}=start({clipboard:{writeText:()=>new Promise(resolve=>{finish=resolve;})}});
 const result=run();
 assert.equal(notices.length,0,'must not falsely claim successful copy while pending');
 finish();await result;
 assert.match(notices.join(' '),/copied/i);
});
test('clipboard rejection never claims success and shows failure',async()=>{
 const {notices,run}=start({clipboard:{writeText:()=>Promise.reject(Error('denied'))}});
 await run();
 assert.doesNotMatch(notices.join(' '),/copied/i);
 assert.match(notices.join(' '),/unavailable|failed/i);
});
test('missing clipboard API fails gracefully without false success',async()=>{
 const {notices,run}=start({clipboard:{}});
 await run();
 assert.match(notices.join(' '),/unavailable|failed/i);
});
test('native Android share branch remains unchanged',async()=>{
 let payload;
 const {notices,run}=start({native:{syncBackupToGoogleEmailOrDrive:p=>{payload=p;}},clipboard:{writeText:()=>{throw Error('clipboard should not be used');}}});
 await run();
 assert.equal(payload,'ZEN21::fixture');
 assert.deepEqual(notices,[]);
});
