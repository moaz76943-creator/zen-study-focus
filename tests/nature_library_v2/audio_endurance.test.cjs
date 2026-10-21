'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {assertProgress}=require('./android20_runtime_probe.cjs');
const {resultSummary}=require('./android20_runtime_probe.cjs');
const {assertLifecycle}=require('./android20_runtime_probe.cjs');
test('lifecycle evidence needs actual hidden/screen-off state and progress of every track',()=>{
 const before=[{id:'rain',progress:2,duration:40}],after=[{id:'rain',progress:21,duration:40}];
 const sample={visibility:'hidden',wakefulness:'Asleep',active:1,gain:.6,errors:[],seconds:18};
 assert.equal(assertLifecycle('background',before,after,sample),true);
 assert.equal(assertLifecycle('screenOff',before,after,sample),true);
 for(const bad of [{...sample,visibility:'visible'},{...sample,seconds:0},{...sample,active:0},{...sample,errors:['decode']},{...sample,gain:1}])assert.throws(()=>assertLifecycle('background',before,after,bad));
 assert.throws(()=>assertLifecycle('screenOff',before,after,{...sample,wakefulness:'Awake'}));
 assert.throws(()=>assertLifecycle('background',before,before,sample));
 assert.throws(()=>assertLifecycle('background',[],[],{...sample,active:0}));
 assert.throws(()=>assertLifecycle('background',before,[{id:'rain',progress:3,duration:40}],sample));
 assert.equal(assertLifecycle('background',[{id:'rain',progress:30,duration:40}],[{id:'rain',progress:8,duration:40}],sample),true);
 assert.throws(()=>assertLifecycle('background',before,[{id:'rain',progress:21,duration:50}],sample));
});
test('Android text summary never certifies endurance for a zero-duration UI smoke',()=>{
 const smoke={status:'ANDROID_AUDIO_QA_ALL_ORIGINALS_LOOPS_CONTROLS_PASS',endurance:{requested:0,seconds:8,status:'NOT_TESTED'}};
 assert.match(resultSummary(smoke,smoke),/THIRTY_MINUTE_MUTED_DECODE_MIX=NOT_TESTED/);
 assert.match(resultSummary(smoke,smoke),/BOUNDED_BACKGROUND_MEDIA_PROGRESS=NOT_TESTED/);
 assert.match(resultSummary({...smoke,background:{status:'PASS'},screenOff:{status:'PASS'}},smoke),/BOUNDED_SCREEN_OFF_MEDIA_PROGRESS=PASS/);
 assert.throws(()=>resultSummary({...smoke,background:{status:'FAIL'}},smoke));
 const full={...smoke,endurance:{requested:1800,seconds:1802,status:'PASS'}};
 assert.match(resultSummary(full,smoke),/THIRTY_MINUTE_MUTED_DECODE_MIX=PASS/);
 for(const endurance of [{requested:0,seconds:8,status:'PASS'},{requested:1800,seconds:8,status:'PASS'},{requested:1800,seconds:NaN,status:'PASS'}])assert.throws(()=>resultSummary({...smoke,endurance},smoke));
 assert.throws(()=>resultSummary({...smoke,status:'FAIL'},smoke));
});
test('a playing flag alone cannot pass a frozen audio endurance checkpoint',()=>{
 assert.throws(()=>assertProgress([{id:'rain',progress:2}],[{id:'rain',progress:2}]),/progress/);
});
test('every original must make observed media progress across an endurance checkpoint',()=>{
 assert.equal(assertProgress([{id:'rain',progress:2},{id:'wind',progress:4}],[{id:'rain',progress:10},{id:'wind',progress:9}]),true);
 assert.throws(()=>assertProgress([{id:'rain',progress:2},{id:'wind',progress:4}],[{id:'rain',progress:10},{id:'wind',progress:4}]),/progress/);
});
test('lost, duplicated and non-finite track evidence is rejected',()=>{
 const before=[{id:'rain',progress:2},{id:'wind',progress:4}];
 for(const after of [[{id:'rain',progress:10}], [{id:'rain',progress:10},{id:'rain',progress:15}], [{id:'rain',progress:Infinity},{id:'wind',progress:6}]])assert.throws(()=>assertProgress(before,after));
});
