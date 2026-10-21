'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {isTransportFailure, recoverTransport}=require('./cdp_transport_recovery.cjs');
const actions=fs.readFileSync(path.join(__dirname,'cdp_actions.cjs'),'utf8');

test('only exact transport failures are recoverable, never app assertion failures',()=>{
 assert.equal(isTransportFailure(Error('TRANSPORT: Runtime.evaluate timed out')),true);
 assert.equal(isTransportFailure(Error('APP_RUNTIME: broken state')),false);
 assert.equal(isTransportFailure(Error('UI_TARGET_MISSING: button')),false);
 assert.equal(isTransportFailure(Error('TEST_PROTOCOL: malformed CDP')),false);
});
test('transport recovery restarts exactly once and does not silently pass original scenario',async()=>{
 let restarts=0;
 const result=await recoverTransport(Error('TRANSPORT: Runtime.evaluate timed out'),async()=>{restarts++;});
 assert.equal(restarts,1);
 assert.deepEqual(result,{attempted:true,recovered:true,reason:null});
});
test('failed restart is recorded as a blocker without throwing away original NOT_TESTED',async()=>{
 const result=await recoverTransport(Error('TRANSPORT: renderer blocked'),async()=>{throw Error('ADB device unavailable')});
 assert.equal(result.attempted,true);
 assert.equal(result.recovered,false);
 assert.match(result.reason,/ADB device unavailable/);
});
test('no retries or restarts are triggered for actual application defects',async()=>{
 let restarts=0;
 const result=await recoverTransport(Error('UI_TARGET_OCCLUDED: notes'),async()=>{restarts++});
 assert.deepEqual(result,{attempted:false,recovered:false,reason:null});
 assert.equal(restarts,0);
});
test('CDP suite must isolate transport failures rather than let 14 downstream scenarios timeout',()=>{
 assert.match(actions,/isTransportFailure\(e\)/);
 assert.match(actions,/recoverTransport\(e,\s*restart\)/);
 assert.match(actions,/transportUnavailable/);
 assert.match(actions,/status:'NOT_TESTED'/);
 assert.match(actions,/rows\.some\(r=>r\.status!=='PASS'\)/);
});
