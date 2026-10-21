'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {assertProgress}=require('./android20_runtime_probe.cjs');
const {resultSummary}=require('./android20_runtime_probe.cjs');
test('Android text summary never certifies endurance for a zero-duration UI smoke',()=>{
 const smoke={status:'ANDROID_AUDIO_QA_ALL_ORIGINALS_LOOPS_CONTROLS_PASS',endurance:{requested:0,seconds:8,status:'NOT_TESTED'}};
 assert.match(resultSummary(smoke,smoke),/THIRTY_MINUTE_MUTED_DECODE_MIX=NOT_TESTED/);
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
