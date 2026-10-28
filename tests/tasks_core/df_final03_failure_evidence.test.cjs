'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const helper=path.join(__dirname,'df_final03_instrumentation/failure_evidence.sh');
function classify(state,output){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'df03-evidence-'));
 try {
  fs.writeFileSync(path.join(dir,'adb'),'#!/bin/sh\nprintf "%s\\n" "$DF03_ADB_STATE"\n',{mode:0o700});
  fs.writeFileSync(path.join(dir,'instrumentation.txt'),output);
  const result=cp.spawnSync('bash',['-c','source "$1"; df03_record_failure edit 320-en "$out/instrumentation.txt" 124','bash',helper],{
   env:{...process.env,PATH:dir+path.delimiter+process.env.PATH,out:dir,DF03_ADB_STATE:state},encoding:'utf8',timeout:15000
  });
  assert.equal(result.error,undefined);assert.equal(result.status,0);
  assert.ok(fs.existsSync(path.join(dir,'host-failure-edit-320-en.txt')));
  const receipt=fs.readFileSync(path.join(dir,'failure-edit-320-en.txt'),'utf8');
  assert.match(receipt,/TEST_RESULT=FAIL/);assert.match(receipt,/COMMAND_STATUS=124/);
  return receipt;
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
}
test('Tasks empty instrumentation output with dead emulator is transport failure',()=>{
 assert.match(classify('offline',''),/FAILURE_CATEGORY=EMULATOR_TRANSPORT_FAIL/);
});
test('Tasks live transport with missing report is harness failure',()=>{
 assert.match(classify('device',''),/FAILURE_CATEGORY=TEST_HARNESS_FAIL/);
});
test('Tasks observed application postcondition failure survives subsequent device loss',()=>{
 assert.match(classify('offline','INSTRUMENTATION_RESULT: df03_status=FAIL\nINSTRUMENTATION_RESULT: df03_error=java.lang.AssertionError: Real Android Save did not persist single edit'),/FAILURE_CATEGORY=APP_FAIL/);
});
test('Tasks evaluateJavascript and input setup errors are not asserted application failures',()=>{
 assert.match(classify('device','INSTRUMENTATION_RESULT: df03_status=FAIL\nINSTRUMENTATION_RESULT: df03_error=java.lang.AssertionError: WebView evaluateJavascript timeout'),/FAILURE_CATEGORY=TEST_HARNESS_FAIL/);
});
