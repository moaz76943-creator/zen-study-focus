'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const code=fs.readFileSync('android/app/src/main/assets/web/integration_v22.js','utf8');
function rig(bridge){
 const timers=new Map();let serial=0;
 const context={module:{exports:{}},ZenNative:bridge,setTimeout(fn){timers.set(++serial,fn);return serial;},clearTimeout(id){timers.delete(id);}};
 vm.createContext(context);vm.runInContext(code,context);
 return {context,timers,save:context.module.exports.saveCsvThroughAndroid};
}
test('CSV is unresolved until the matching native result; cancel is never saved',async()=>{
 let request;const r=rig({exportAnalyticsCsvToFile(csv,id){request=id;assert.equal(csv,'"id"\r\n');}});
 let settled=false;const p=r.save('"id"\r\n').then(x=>{settled=true;return x;});
 await Promise.resolve();assert.equal(settled,false);
 r.context.DFRecoveryNativeExportResult('wrong','saved');await Promise.resolve();assert.equal(settled,false);
 r.context.DFRecoveryNativeExportResult(request,'cancelled');assert.equal((await p).status,'cancelled');assert.equal(r.timers.size,0);
});
test('CSV verified saved, unknown result, throw and timeout fail closed',async()=>{
 for(const status of ['saved','unknown']){
  let request;const r=rig({exportAnalyticsCsvToFile(c,id){request=id;}});const p=r.save('"id"\r\n');
  r.context.DFRecoveryNativeExportResult(request,status);assert.equal((await p).status,status==='saved'?'saved':'failed');
 }
 const thrown=rig({exportAnalyticsCsvToFile(){throw Error('unavailable');}});assert.equal((await thrown.save('x')).status,'failed');assert.equal(thrown.timers.size,0);
 let request;const timeout=rig({exportAnalyticsCsvToFile(c,id){request=id;}});const p=timeout.save('x');[...timeout.timers.values()][0]();assert.equal((await p).status,'failed');timeout.context.DFRecoveryNativeExportResult(request,'saved');
});
test('CSV bridge absence fails closed and correlation IDs are distinct',async()=>{
 assert.equal((await rig({}).save('x')).status,'failed');const ids=[];const r=rig({exportAnalyticsCsvToFile(c,id){ids.push(id);}});
 const p=r.save('a'),q=r.save('b');assert.notEqual(ids[0],ids[1]);for(const id of ids)r.context.DFRecoveryNativeExportResult(id,'failed');await Promise.all([p,q]);
});
