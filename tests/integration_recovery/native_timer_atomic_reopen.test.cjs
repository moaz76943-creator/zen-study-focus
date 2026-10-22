'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {fixture}=require('./activity_transition_fixture.cjs');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('RED/GREEN: Android active timer uses a separate fsynced native AtomicFile bridge',()=>{
 const main=read('android/app/src/main/java/com/zenstudy/focus/MainActivity.java');
 const java=read('android/app/src/main/java/com/zenstudy/focus/NativeTimerPacketStore.java');
 assert.match(main,/acknowledgeTimerV21/);assert.match(main,/readTimerV21/);
 assert.match(java,/AtomicFile/);assert.match(java,/stream.getFD\(\).sync\(\)/);
 assert.match(java,/v21_active_timer_packets_v1/);assert.doesNotMatch(java,/deleteAllData|clearData/);
});
test('RED/GREEN: immediate force-stop loses auxiliary WebView slots but replays native timer receipt',()=>{
 const h=fixture({running:true,training:false});
 let checkpoint=null;
 h.c.window.ZenNative={acknowledgeTimerV21(p,m){assert.equal(p,m);checkpoint=JSON.stringify({version:1,primary:p,mirror:m});return true;},
   readTimerV21(){return checkpoint||'NONE';},stopBackgroundService(){}};
 h.c.timerSessionId='preserved-real-id';h.c.customSessionLabel='Long custom '+ 'عنوان '.repeat(18);
 h.c.currentTimerModeKey='custom';h.c.timerRunning=true;
 assert.equal(h.call('storeTimerSession()'),true);
 const before=h.saved();assert.equal(before.sessionId,'preserved-real-id');
 h.slots.delete('zen_fortress_active_timer_v21');h.slots.delete('zen_fortress_active_timer_v21_mirror');
 h.c.timerSessionId=null;h.c.timerRunning=false;
 h.call('restoreTimerSession()');
 assert.equal(h.c.timerSessionId,'preserved-real-id');
 assert.equal(h.c.customSessionLabel,before.label);
 assert.equal(h.c.timerRunning,true);
 assert.equal(h.saved().sessionId,'preserved-real-id');
});
test('RED/GREEN: rejected native timer acknowledgement restores raw primary and mirror',()=>{
 const h=fixture({running:false,training:false});
 const key='zen_fortress_active_timer_v21',before=[h.slots.get(key),h.slots.get(key+'_mirror')];
 h.c.window.ZenNative={acknowledgeTimerV21(){return false;}};
 h.c.timerSessionId='new-rejected';
 assert.throws(()=>h.call('storeTimerSession()'),/TIMER_NATIVE_ACK_FAILED/);
 assert.deepEqual([h.slots.get(key),h.slots.get(key+'_mirror')],before);
});
test('RED/GREEN: invalid native timer receipt cannot overwrite local packets or clear v21 records',()=>{
 const h=fixture({running:true,training:false}),key='zen_fortress_active_timer_v21';
 const before=[h.slots.get(key),h.slots.get(key+'_mirror')];
 h.c.window.ZenNative={readTimerV21(){return '{"version":1,"primary":"tampered","mirror":"tampered"}';}};
 h.call('restoreTimerSession()');
 assert.deepEqual([h.slots.get(key),h.slots.get(key+'_mirror')],before);
 assert.ok(h.messages.length>0);
});
