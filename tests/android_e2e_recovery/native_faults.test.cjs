'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {CASE_NAMES,createNativeFaultCases,walProof,reenterAppAfterInterruptedJournal}=require('./native_faults.cjs');
test('all required runtime fault cases remain in the explicit inventory',()=>{
 assert.deepEqual(Object.keys(createNativeFaultCases({})).sort(),[...CASE_NAMES].sort());
 assert.equal(new Set(CASE_NAMES).size,10);
});
test('WAL proof ignores unrelated or injected paths without reading them',()=>{
 const read=()=>{throw Error('must not read an unrelated file');};
 assert.equal(walProof(()=>'/etc/passwd\napp_webview/Default/Local Storage/leveldb/123.log;cat-secret',read,'DF07_PENDING'),null);
});
test('WAL proof observes actual marker encoding and emits hash metadata without raw bytes',()=>{
 const file='app_webview/Default/Local Storage/leveldb/000123.log';
 const marker='DF07_PENDING_123',raw=Buffer.concat([Buffer.from('fixture-private-payload'),Buffer.from(marker,'utf16le')]);
 const proof=walProof(()=>file,selected=>{assert.equal(selected,file);return raw;},marker);
 assert.equal(proof.encoding,'utf16le');assert.equal(proof.sha256.length,64);
 assert.equal(proof.journal_marker_observed,true);
 assert.doesNotMatch(JSON.stringify(proof),/fixture-private-payload|DF07_PENDING/);
});
test('rotated WAL files cannot hide a marker in the current log',()=>{
 const root='app_webview/Default/Local Storage/leveldb/';
 const proof=walProof(()=>root+'000001.log\n'+root+'000002.log',file=>{
  if(file.endsWith('000001.log'))throw Error('rotated');return Buffer.from('DF07_PENDING_456');
 },'DF07_PENDING_456');
 assert.equal(proof.file,'000002.log');
});
test('legacy Chromium storage directories without Default are independently observable',()=>{
 const proof=walProof(()=> 'app_webview/Local Storage/leveldb/000123.log',()=>Buffer.from('DF07_PENDING_789'),'DF07_PENDING_789');
 assert.equal(proof?.journal_marker_observed,true);
});

test('aborted WAL inspection reconnects WebView before replay, avoiding cascading picker failures',async()=>{
 const calls=[];
 await reenterAppAfterInterruptedJournal({
  restart:async()=>{calls.push('restart');},
  evaluate:async(expr)=>{calls.push(expr);}
 });
 assert.deepEqual(calls,['restart','DF22Preflight.replayNative(localStorage);true']);
});
test('failed journal cleanup does not pretend the device returned to an observable state',async()=>{
 let replayCalled=false;
 await assert.rejects(
  reenterAppAfterInterruptedJournal({
   restart:async()=>{throw Error('emulator transport offline');},
   evaluate:async()=>{replayCalled=true;}
  }),/emulator transport offline/
 );
 assert.equal(replayCalled,false);
});
