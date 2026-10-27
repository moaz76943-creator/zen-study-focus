'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
function run(missingId=false,tasks=false){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'df08-matrix-'));
 try {
  const scripts=tasks?'tests/tasks_core/df_final03_instrumentation':'tests/android_touch/df08_instrumentation';
  fs.mkdirSync(path.join(dir,scripts),{recursive:true});
  for(const file of (tasks?['run_ci.sh']:['run_ci.sh','failure_evidence.sh'])) fs.copyFileSync(tasks?path.join(__dirname,'../../tasks_core/df_final03_instrumentation',file):path.join(__dirname,file),path.join(dir,scripts,file));
  fs.mkdirSync(path.join(dir,'tests/white_premium_qa'),{recursive:true});
  fs.copyFileSync(path.join(__dirname,'../../white_premium_qa/track14_install_apk.sh'),path.join(dir,'tests/white_premium_qa/track14_install_apk.sh'));
  for(const file of ['android/app/build/outputs/apk/debug/app-debug.apk','android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk']){
   fs.mkdirSync(path.dirname(path.join(dir,file)),{recursive:true});fs.writeFileSync(path.join(dir,file),'TEST-ONLY-NOT-AN-APK');
  }
  fs.mkdirSync(path.join(dir,'bin'));fs.mkdirSync(path.join(dir,'evidence'));
  fs.writeFileSync(path.join(dir,'bin/git'),'#!/bin/sh\necho synthetic-test-sha\n',{mode:0o700});
  fs.writeFileSync(path.join(dir,'bin/adb'),`#!/usr/bin/env bash
if [[ "$1 $2 $3" == 'shell am instrument' ]]; then
 stage= width= locale= font= expected=
 while (($#)); do
  if [[ "$1" == -e ]]; then
   case "$2" in stage) stage="$3";; width) width="$3";; locale) locale="$3";; fontScale) font="$3";; expectedId) expected="$3";; esac
   shift 3
  else shift; fi
 done
 printf '%s %s %s %s %s\\n' "$stage" "$width" "$locale" "$font" "$expected" >> "$DF08_LEDGER"
 echo 'INSTRUMENTATION_RESULT: df08_status=PASS'
 echo 'INSTRUMENTATION_RESULT: df03_status=PASS'
 echo 'INSTRUMENTATION_RESULT: df03_ime=PASS'
 echo 'INSTRUMENTATION_RESULT: df03_real_taps=6'
 if [[ "$stage" == save || "$stage" == edit ]]; then
  echo 'INSTRUMENTATION_RESULT: df08_water_ack=PASS'
  echo 'INSTRUMENTATION_RESULT: df08_physical_taps=20'
  [[ "$DF08_MISSING_NOTE_ID" == 1 ]] || echo "INSTRUMENTATION_RESULT: df08_note_id=$width"
 else
  [[ -z "$expected" || "$expected" == "$width" ]] || exit 9
  echo 'INSTRUMENTATION_RESULT: df08_reopen=PASS'
 fi
elif [[ "$*" == 'shell getprop ro.build.version.sdk' ]]; then echo 35
elif [[ "$*" == 'shell pm path com.zenstudy.focus' ]]; then echo 'package:/synthetic-test-only.apk'
elif [[ "$*" == get-state ]]; then echo device
fi
exit 0
`,{mode:0o700});
  const result=cp.spawnSync('bash',[scripts+'/run_ci.sh'],{cwd:dir,env:{...process.env,PATH:path.join(dir,'bin')+path.delimiter+process.env.PATH,DF08_EVIDENCE:path.join(dir,'evidence'),DF08_FONT_SCALE:'2.0',DF03_EVIDENCE:path.join(dir,'evidence'),DF03_FONT_SCALE:'2.0',DF08_LEDGER:path.join(dir,'ledger'),DF08_MISSING_NOTE_ID:missingId?'1':'0'},encoding:'utf8',timeout:30000});
  assert.equal(result.error,undefined);
  return {status:result.status,stdout:result.stdout,ledger:fs.readFileSync(path.join(dir,'ledger'),'utf8').trim().split('\n'),summary:fs.existsSync(path.join(dir,'evidence/summary.txt'))};
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
}
test('runner requests actual save/reopen for both locales at all widths and passes captured ID to new process',()=>{
 const result=run();assert.equal(result.status,0,result.stdout);assert.equal(result.summary,true);assert.equal(result.ledger.length,16);
 for(const width of ['320','360','393','430'])for(const locale of ['en','ar']){
  assert.ok(result.ledger.includes(`save ${width} ${locale} 2.0 `));
  assert.ok(result.ledger.includes(`verify ${width} ${locale} 2.0 ${width}`));
 }
});
test('successful UI status without a captured saved ID cannot reach reopen or final PASS',()=>{
 const result=run(true);assert.equal(result.status,1);assert.equal(result.summary,false);assert.equal(result.ledger.length,1);
 assert.match(result.stdout,/Saved Notes ID missing/);
});

test('Tasks runner requests genuine Edit/Save and process reopen for EN/AR at all widths with selected font scale',()=>{
 const result=run(false,true);assert.equal(result.status,0,result.stdout);assert.equal(result.summary,true);assert.equal(result.ledger.length,16);
 for(const width of ['320','360','393','430'])for(const locale of ['en','ar']){
  assert.ok(result.ledger.includes(`edit ${width} ${locale} 2.0 `));
  const expected=`verify ${width} ${locale} 2.0`;
  assert.ok(result.ledger.some(line=>line.trim()===expected));
 }
});
