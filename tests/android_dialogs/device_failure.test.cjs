'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {deviceHealth,classifyFailure}=require('./device_failure.cjs');
test('lost emulator must not be reported as an application assertion failure',()=>{
 assert.equal(classifyFailure(Error('No actual trusted WebView target'),{state:null,bootCompleted:null}),'EMULATOR_TRANSPORT_FAIL');
 assert.equal(classifyFailure(Error('dialog missing'),{state:'offline',bootCompleted:null}),'EMULATOR_TRANSPORT_FAIL');
});
test('healthy transport preserves real application failures and distinguishes missing harness target',()=>{
 const healthy={state:'device',bootCompleted:'1'};
 assert.equal(classifyFailure(Error('Back/Cancel must reject action'),healthy),'APP_FAIL');
 assert.equal(classifyFailure(Error('No actual trusted WebView target'),healthy),'TEST_HARNESS_FAIL');
});
test('health probes are bounded and never read user data',()=>{
 const commands=[];
 const health=deviceHealth((command,args,options)=>{
  assert.equal(command,'adb');assert.equal(options.timeout,5000);
  commands.push(args);return commands.length===1?'device\n':'1\n';
 });
 assert.deepEqual(health,{state:'device',bootCompleted:'1'});
 assert.deepEqual(commands,[['-s','emulator-5554','get-state'],['-s','emulator-5554','shell','getprop','sys.boot_completed']]);
 assert.deepEqual(deviceHealth(()=>{throw Error('offline');}),{state:null,bootCompleted:null});
});
