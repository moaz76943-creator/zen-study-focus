'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('./n01_android_ack_probe.cjs'),'utf8');
const a=source.indexOf('async function cancelDocumentsPicker('),b=source.indexOf('async function start()',a);
function rig(canClose){
 let backs=0;
 const run=vm.runInNewContext('('+source.slice(a,b)+')',{
  assert,evaluate:async()=>true,sleep:async()=>{},
  adb(...args){
   if(args.join(' ')==='shell input keyevent KEYCODE_BACK'){backs++;return '';}
   assert.equal(args.join(' '),'shell dumpsys activity activities');
   return backs>=2&&canClose?'topResumedActivity=ActivityRecord{u0 com.zenstudy.focus/.MainActivity}':
    'topResumedActivity=ActivityRecord{u0 com.google.android.documentsui/.picker.PickActivity}';
  }
 });
 return {run,backs:()=>backs};
}
test('SAF cancellation cannot PASS while DocumentsUI remains resumed',async()=>{
 const x=rig(false);await assert.rejects(x.run('openPicker()'),/SAF.*return.*MainActivity/);
 assert.ok(x.backs()<=3,'Back recovery must be bounded');
});
test('Back that only hides IME must be followed by actual picker cancellation',async()=>{
 const x=rig(true);await x.run('openPicker()');assert.equal(x.backs(),2);
});
