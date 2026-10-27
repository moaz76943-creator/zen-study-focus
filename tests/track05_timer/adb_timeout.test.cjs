'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const script=path.join(__dirname,'run_android_timer_qa.sh');
function run(stage,watchdog) {
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'df05-adb-bounds-'));
 try {
  fs.writeFileSync(path.join(dir,'adb'),`#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$DF_ADB_CALLS"
if [[ "$DF_STALL_STAGE" == devices && "$1" == devices ]]; then exec sleep 120; fi
if [[ "$DF_STALL_STAGE" == pidof && "$*" == *'shell pidof'* ]]; then exec sleep 120; fi
if [[ "$DF_STALL_STAGE" == cleanup && "$*" == *logcat* ]]; then exec sleep 120; fi
case "$*" in
 devices) printf 'List of devices attached\\nemulator-5554 device\\n';;
 *'shell pidof'*) printf '1234\\n';;
 *logcat*) printf 'sanitized fixture log\\n';;
esac
`,{mode:0o700});
  fs.writeFileSync(path.join(dir,'node'),'#!/bin/sh\nprintf CDP_RAN > "$DF_CDP_MARKER"\nif [ "$DF_STALL_STAGE" = cleanup ]; then exit 7; fi\n',{mode:0o700});
  const marker=path.join(dir,'cdp-called'),calls=path.join(dir,'adb-calls');
  const result=cp.spawnSync('bash',[script],{
   cwd:path.resolve(__dirname,'../..'),encoding:'utf8',timeout:watchdog,
   env:{...process.env,PATH:dir+path.delimiter+process.env.PATH,RUNNER_TEMP:dir,
    DF_STALL_STAGE:stage,DF_ADB_CALLS:calls,DF_CDP_MARKER:marker}
  });
  return {result,cdpRan:fs.existsSync(marker),calls:fs.readFileSync(calls,'utf8').trim().split('\n'),
   log:fs.existsSync(path.join(dir,'track05-android/logcat.txt'))?fs.readFileSync(path.join(dir,'track05-android/logcat.txt'),'utf8'):null};
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
}
test('stalled device discovery terminates with infrastructure failure before CDP',()=>{
 const {result,cdpRan,calls}=run('devices',25000);
 assert.equal(result.error,undefined,'Real shell must finish before external watchdog');
 assert.equal(result.status,2);assert.match(result.stderr,/QA INFRA BLOCKER/);
 assert.equal(cdpRan,false);assert.deepEqual(calls,['devices']);
});
test('stalled readiness exits after one bounded probe and retains diagnostics',()=>{
 const {result,cdpRan,calls,log}=run('pidof',15000);
 assert.equal(result.error,undefined,'Readiness must finish before external watchdog');
 assert.equal(result.status,2);assert.match(result.stderr,/QA INFRA BLOCKER/);assert.equal(cdpRan,false);
 assert.equal(calls.filter(c=>c.includes('shell pidof')).length,1,'Never retry a stalled probe');
 assert.equal(calls.filter(c=>c.includes(' install ')).length,1);
 assert.equal(calls.filter(c=>c.includes('shell am start')).length,1);
 assert.match(log,/sanitized fixture log/);
});
test('healthy setup installs and launches once before the unchanged CDP runner',()=>{
 const {result,cdpRan,calls,log}=run('',5000);
 assert.equal(result.error,undefined);assert.equal(result.status,0);assert.equal(cdpRan,true);
 assert.equal(calls.filter(c=>c.includes(' install ')).length,1);
 assert.equal(calls.filter(c=>c.includes('shell am start')).length,1);
 assert.equal(calls.filter(c=>c.includes('shell pidof')).length,1);
 assert.match(log,/sanitized fixture log/);
});
test('offline diagnostic cleanup is bounded and preserves the failing CDP exit status',()=>{
 const {result,cdpRan,calls}=run('cleanup',25000);
 assert.equal(result.error,undefined,'Cleanup must finish before external watchdog');
 assert.equal(result.status,7,'Diagnostic collection must not turn a failed test into PASS');
 assert.equal(cdpRan,true);assert.equal(calls.filter(c=>c.includes('logcat')).length,1);
});
