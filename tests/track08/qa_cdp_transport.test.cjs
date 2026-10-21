'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {evaluateWithRetry}=require('./qa_cdp_transport.cjs');
test('bounded transient CDP timeout recovers only after real response',async()=>{
 let calls=0;
 const result=await evaluateWithRetry(async()=>{calls++;if(calls===1){const e=Error('timeout');e.code='CDP_TIMEOUT';throw e;}return {ready:'complete'};},{stage:'startup',attempts:2,delay:async()=>{}});
 assert.equal(result.ready,'complete');assert.equal(calls,2);
});
test('actual Android JavaScript exception is not hidden by retries',async()=>{
 let calls=0;
 await assert.rejects(evaluateWithRetry(async()=>{calls++;throw Error('EXCEPTION_DETAILS');},{stage:'analytics',attempts:3,delay:async()=>{}}),/EXCEPTION_DETAILS/);
 assert.equal(calls,1);
});
test('repeated DevTools failure remains fatal and names failed stage',async()=>{
 let calls=0;
 await assert.rejects(evaluateWithRetry(async()=>{calls++;const e=Error('timeout');e.code='CDP_TIMEOUT';throw e;},{stage:'startup',attempts:3,delay:async()=>{}}),/startup.*3 attempts/i);
 assert.equal(calls,3);
});
