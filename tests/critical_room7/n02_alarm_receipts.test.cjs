'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {pendingTimerAlarms,resumedActivities,completedReopenReceipt}=require('./n02_alarm_receipts.cjs');
const head='Current Alarm Manager state:\n nowRTC=1790000000000\n';
const tail=' Pending user blocked background alarms:\n  none\n Pending alarms per uid: [u0a1:1]\n';
const alarm=(api,pkg='com.zenstudy.focus',tag='*walarm*:com.deepfocus.study.TIMER_COMPLETE')=>
 ` RTC_WAKEUP #0: Alarm{a4 type 0 ${api===30?'when':'origWhen'} 1790000030000 ${api===35?'whenElapsed 12345 ':''}${pkg}}\n   tag=${tag}\n   operation=PendingIntent{abc}\n`;
test('pending receipt parses API30 batches and API35 store with exact native deadline',()=>{
 for(const api of [30,35])assert.deepEqual(pendingTimerAlarms(head+(api===30?'Pending alarm batches: 1\nBatch{x}:\n':'1 pending alarms:\n')+alarm(api)+tail),
  [{type:0,deadline:1790000030000,tag:'*walarm*:com.deepfocus.study.TIMER_COMPLETE'}]);
});
test('cancelled alarm cannot be resurrected by matching historical stats or another package',()=>{
 assert.deepEqual(pendingTimerAlarms(head+tail+'Alarm Stats:\n'+alarm(35)),[]);
 assert.deepEqual(pendingTimerAlarms(head+alarm(35,'other.package')+tail),[]);
 assert.deepEqual(pendingTimerAlarms(head+alarm(35,'com.zenstudy.focus','other.action')+tail),[]);
 assert.equal(pendingTimerAlarms(head+alarm(35)+alarm(35)+tail).length,2,'duplicate pending generations must remain visible');
});
test('missing or unsupported dumps cannot silently count as no pending alarms',()=>{
 for(const dump of ['', 'Permission Denial',head,head+'Pending alarms per uid: []'])assert.throws(()=>pendingTimerAlarms(dump),/TEST_INFRA:/);
});
test('HOME proof requires real resumed Activity receipt',()=>{
 assert.deepEqual(resumedActivities('topResumedActivity=ActivityRecord{u0 launcher/.Main}'),['topResumedActivity=ActivityRecord{u0 launcher/.Main}']);
 assert.deepEqual(resumedActivities(' mResumedActivity: ActivityRecord{u0 com.zenstudy.focus/.MainActivity}'),['mResumedActivity: ActivityRecord{u0 com.zenstudy.focus/.MainActivity}']);
 assert.throws(()=>resumedActivities('ADB offline'),/TEST_INFRA:/);
});
test('completed reopen accepts OS notification removal while requiring unchanged native delivery',()=>{
 const key='0|com.zenstudy.focus|2002|null|10209';
 const native={active:false,token:7,deadline:1790000000000,lastNotified:1790000000030};
 const first={keys:[key],native};
 for(const [stoppedKeys,keys] of [[[key],[key]],[[key],[]],[[],[]]])
  assert.equal(completedReopenReceipt(first,stoppedKeys,{keys,native:{...native}}).survivingNotifications,keys.length);
 assert.equal(completedReopenReceipt({keys:[],native},[],{keys:[],native}).survivingNotifications,0);
});
test('completed reopen rejects reposts, new keys, changed generation and delayed native delivery',()=>{
 const key='0|com.zenstudy.focus|2002|null|10209',other='0|com.zenstudy.focus|2002|null|10210';
 const native={active:false,token:7,deadline:1790000000000,lastNotified:1790000000030};
 const first={keys:[key],native};
 assert.throws(()=>completedReopenReceipt(first,[],{keys:[key],native}),/another completion/,'removed key cannot be reposted');
 assert.throws(()=>completedReopenReceipt(first,[key],{keys:[other],native}),/another completion/);
 assert.throws(()=>completedReopenReceipt(first,[key],{keys:[key,key],native}),/Multiple/);
 for(const patch of [{active:true},{token:8},{deadline:native.deadline+1},{lastNotified:native.lastNotified+1}])
  assert.throws(()=>completedReopenReceipt(first,[],{keys:[],native:{...native,...patch}}));
 assert.throws(()=>completedReopenReceipt({keys:[],native},[key],{keys:[],native}),/Force-stop unexpectedly/);
});
