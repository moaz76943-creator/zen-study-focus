'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const helper=path.join(__dirname,'failure_evidence.sh');
function classify(state,output,status=1){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'df08-evidence-'));
 try {
  fs.writeFileSync(path.join(dir,'adb'),'#!/bin/sh\nprintf "%s\\n" "$DF08_ADB_STATE"\n',{mode:0o700});
  fs.writeFileSync(path.join(dir,'instrumentation.txt'),output);
  const result=cp.spawnSync('/bin/bash',['-c','source "$1"; df08_record_failure save 320 "$out/instrumentation.txt" "$2"','bash',helper,String(status)],{
   env:{PATH:dir+':/usr/bin:/bin',out:dir,DF08_ADB_STATE:state},encoding:'utf8',timeout:15000
  });
  assert.equal(result.error,undefined);assert.equal(result.status,0);
  const evidence=fs.readFileSync(path.join(dir,'failure-save-320.txt'),'utf8');
  assert.match(evidence,/TEST_RESULT=FAIL/);assert.match(evidence,/STAGE=save\nWIDTH=320/);
  assert.ok(fs.existsSync(path.join(dir,'host-failure-save-320.txt')));
  return evidence;
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
}
test('dead emulator with empty instrumentation output is transport failure, never app success',()=>{
 assert.match(classify('offline',''),/FAILURE_CATEGORY=EMULATOR_TRANSPORT_FAIL/);
});
test('live emulator with missing instrumentation result is a harness failure',()=>{
 assert.match(classify('device',''),/FAILURE_CATEGORY=TEST_HARNESS_FAIL/);
});
test('explicit application postcondition failure is retained even if transport subsequently dies',()=>{
 assert.match(classify('offline','INSTRUMENTATION_RESULT: df08_status=FAIL\nINSTRUMENTATION_RESULT: df08_error=java.lang.AssertionError: Physical Save did not persist note exactly once'),/FAILURE_CATEGORY=APP_FAIL/);
});
test('injection and evaluation infrastructure errors remain harness failures',()=>{
 assert.match(classify('device','INSTRUMENTATION_RESULT: df08_status=FAIL\nINSTRUMENTATION_RESULT: df08_error=java.lang.AssertionError: WebView.evaluateJavascript timed out'),/FAILURE_CATEGORY=TEST_HARNESS_FAIL/);
});

test('diagnostic classification never inherits executable BASH_ENV startup input',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'df-no-shell-startup-'));
 const startup=path.join(dir,'startup'),previous=process.env.BASH_ENV;
 fs.writeFileSync(startup,'printf injected > "$BASH_ENV.marker"\n');
 process.env.BASH_ENV=startup;
 try{classify('device','');assert.equal(fs.existsSync(startup+'.marker'),false,'Inherited BASH_ENV executed code');}
 finally{if(previous===undefined)delete process.env.BASH_ENV;else process.env.BASH_ENV=previous;fs.rmSync(dir,{recursive:true,force:true});}
});
