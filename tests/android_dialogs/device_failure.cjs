'use strict';
const {execFileSync}=require('node:child_process');

// Read only transport health. Never collect app storage or arbitrary logcat.
function deviceHealth(run=execFileSync){
 const read=args=>{
  try{return run('adb',['-s','emulator-5554',...args],{
   encoding:'utf8',timeout:5000,stdio:['ignore','pipe','pipe']
  }).trim();}catch(_){return null;}
 };
 return {state:read(['get-state']),bootCompleted:read(['shell','getprop','sys.boot_completed'])};
}
function classifyFailure(error,health){
 if(health.state!=='device'||health.bootCompleted!=='1')return 'EMULATOR_TRANSPORT_FAIL';
 if(/No actual trusted WebView target|TRANSPORT:|CDP open (failed|timed out)/.test(String(error)))return 'TEST_HARNESS_FAIL';
 return 'APP_FAIL';
}
module.exports={deviceHealth,classifyFailure};
