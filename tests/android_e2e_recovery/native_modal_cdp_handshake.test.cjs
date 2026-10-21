'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'cdp_actions.cjs'),'utf8');
test('real Android Reset in timer and rotation scenarios acknowledges the native confirmation',()=>{
 assert.doesNotMatch(code,/await evaluate\(['"]resetTimerNow\(\)['"]\)/,
   'Synchronous CDP evaluation of a native confirm blocks forever');
 const calls=code.match(/await acceptNativeConfirm\(['"]resetTimerNow\(\)['"]\)/g)||[];
 assert.equal(calls.length,2,'both timer and orientation scenarios need real native approval');
});
test('CDP request is issued without awaiting before native Android acknowledgement',()=>{
 assert.match(code,/function acceptNativeConfirm\(/);
 const segment=code.slice(code.indexOf('async function acceptNativeConfirm'),code.indexOf('async function check'));
 assert.match(segment,/const outstanding\s*=\s*evaluate\(expression\)/);
 assert.match(segment,/uiautomator/);
 assert.match(segment,/parseNativePromptButton\(xml\)/);
 assert.match(segment,/adb\(['"]shell['"],['"]input['"],['"]tap['"]/);
 assert.match(segment,/await outstanding/);
 assert.match(segment,/Deep Focus/);
 assert.match(segment,/file:\\/\\//);
});
test('the browser dialog is never approved by monkeypatching confirm for timer tests',()=>{
 const timer=code.slice(code.indexOf("await run('timer_start_pause'"),code.indexOf("await run('save_failure'"));
 assert.doesNotMatch(timer,/window\.confirm\s*=/);
});
