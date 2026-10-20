'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {assertProgress}=require('./android20_runtime_probe.cjs');
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
