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

test('LevelDB compacted tables can prove the real pending marker with hashes, not raw bytes',()=>{
 const root='app_webview/Default/Local Storage/leveldb/';
 const marker='DF07_PENDING_123456';
 const calls=[];
 const diag={};
 const proof=walProof(()=>[root+'CURRENT',root+'000003.log',root+'000004.ldb',root+'000005.sst',root+'../private.txt'].join('\n'),
  file=>{calls.push(file);return file.endsWith('.ldb')?Buffer.from('journal before '+marker):Buffer.from('unrelated');},
  marker,diag);
 assert.equal(proof?.file,'000004.ldb');
 assert.equal(proof?.journal_marker_observed,true);
 assert.equal(proof?.sha256.length,64);
 assert.equal(diag.accepted_files,3);
 assert.ok(calls.every(file=>/\.(?:log|ldb|sst)$/.test(file)));
 assert.doesNotMatch(JSON.stringify(proof),/DF07_PENDING|journal before/);
});
test('incomplete or compressed LevelDB evidence stays unverified',()=>{
 const dir='app_webview/Local Storage/leveldb/';
 const diag={};
 const proof=walProof(()=>dir+'000009.ldb',()=>Buffer.from('no readable pending marker'),'DF07_PENDING_123456',diag);
 assert.equal(proof,null);
 assert.equal(diag.files[0].read,true);
});

test('real process recovery remains provable when Chromium WAL marker is not observable',async()=>{
 const previous=process.env.DF_ANDROID_DISPOSABLE;
 process.env.DF_ANDROID_DISPOSABLE='1';
 let restarted=0,postRestartRead=0;
 const baseline={task:{id:71001},note:{id:71002},seq:4};
 const ack={valid:true,bytes:12345};
 const driver={
   pause:async()=>{},
   evaluate:async expression=>{
     if(expression.startsWith('(function('))return {marker:'DF07_PENDING_UNOBSERVED',pending:true,changed:true,nativeUnchanged:true};
     if(expression==='DeepFocusDataCompatV21.inspectPending(localStorage).pending'){postRestartRead++;return false;}
     throw Error('unexpected evaluation');
   },
   fixture:async()=>baseline,
   receipt:async()=>ack,
   restart:async()=>{restarted++;},
   adb:(...args)=>args.includes('find')?'app_webview/Local Storage/leveldb/LOCK':'',
 };
 try {
  const result=await createNativeFaultCases(driver).interrupted_journal_disk_and_process_recovery();
  assert.match(result,/force-stop recovered/);
  assert.match(result,/WAL marker NOT_OBSERVED/);
  assert.equal(restarted,1,'Real restart must occur even when WAL is unobservable');
  assert.equal(postRestartRead,1);
 }finally{
  if(previous===undefined)delete process.env.DF_ANDROID_DISPOSABLE;
  else process.env.DF_ANDROID_DISPOSABLE=previous;
 }
});
