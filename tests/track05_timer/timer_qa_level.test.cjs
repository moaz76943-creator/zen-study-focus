'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const cp=require('node:child_process'),path=require('node:path');
const {createQaSelection}=require('./live_android_cdp.cjs');
const custom='custom-one-minute-natural-completion-persisted-once';
const tabata='quick-20-10-natural-work-rest-completes-without-rest-credit';
const shell=path.join(__dirname,'run_android_timer_qa.sh');

test('default full QA executes every callback in order and does not defer a case',async()=>{
 const qa=createQaSelection(),calls=[];
 for(const name of ['preflight','native-20-locale-mode-cancel',custom,tabata,'quick-4-1-natural-cycle-persists-four-work-minutes-and-no-rest-credit']){
  const result=await qa.run(name,async()=>{calls.push(name);return {observed:name};});
  assert.deepEqual(result,{executed:true,value:{observed:name}});
 }
 qa.verify();assert.equal(qa.level,'full');assert.equal(calls.length,5);assert.deepEqual(qa.deferred,[]);
});

test('focused QA executes trusted-WebView setup and both natural completion cases, explicitly deferring full-QA work',async()=>{
 const qa=createQaSelection('focused'),calls=[];
 const names=['preflight','native-20-locale-mode-cancel',custom,tabata,'quick-4-1-natural-cycle-persists-four-work-minutes-and-no-rest-credit'];
 for(const name of names){
  const result=await qa.run(name,async()=>{calls.push(name);return name;});
  assert.equal(result.executed,['preflight',custom,tabata].includes(name));
 }
 qa.verify();assert.deepEqual(calls,['preflight',custom,tabata]);
 assert.deepEqual(qa.deferred.map(item=>item.name),[names[1],names[4]]);
 for(const deferred of qa.deferred){assert.match(deferred.reason,/LEVEL_2_FULL_QA/);assert.equal(Object.hasOwn(deferred,'status'),false);}
});

test('selected callback failure propagates; selection cannot convert a real assertion failure to success',async()=>{
 const qa=createQaSelection('focused'),failure=Error('native durable completion receipt differs');
 await assert.rejects(qa.run(custom,async()=>{throw failure;}),error=>error===failure);
});

test('empty or incomplete focused acceptance cannot pass verification',async()=>{
 const empty=createQaSelection('focused');assert.throws(()=>empty.verify(),/executed no cases/);
 const missing=createQaSelection('focused');
 await missing.run('preflight',async()=>{});await missing.run(custom,async()=>{});
 assert.throws(()=>missing.verify(),error=>error.message.includes(tabata));
 const onlyDeferred=createQaSelection('focused');
 await onlyDeferred.run('unrelated-full-case',async()=>{assert.fail('Deferred callback executed');});
 assert.throws(()=>onlyDeferred.verify(),/executed no cases/);
});

test('invalid level and repeated case names fail closed',async()=>{
 for(const level of ['','smoke','FOCUSED',null])assert.throws(()=>createQaSelection(level),/invalid DF_TRACK05_QA_LEVEL/);
 const qa=createQaSelection('full');await qa.run('preflight',async()=>{});
 await assert.rejects(qa.run('preflight',async()=>assert.fail('Duplicate ran')),/duplicate timer QA case/);
});

test('shell runner rejects invalid level before Android discovery, installation or any device mutation',()=>{
 const result=cp.spawnSync('bash',[shell],{env:{...process.env,DF_TRACK05_QA_LEVEL:'invalid-level'},encoding:'utf8',timeout:3000});
 assert.equal(result.error,undefined);assert.equal(result.status,2);assert.match(result.stderr,/Invalid DF_TRACK05_QA_LEVEL/);
 assert.equal(result.stdout,'');
});
