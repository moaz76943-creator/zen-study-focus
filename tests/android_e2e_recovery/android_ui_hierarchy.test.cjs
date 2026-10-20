'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readWebViewFrame}=require('./android_ui_hierarchy.cjs');
const frame={left:0,top:62,right:1080,bottom:2200,width:1080,height:2138};
const parseBounds=xml=>{
 if(xml!=='<node class="android.webkit.WebView"/>')
   throw Error('TRANSPORT: WebView node absent from real Android UI hierarchy');
 return frame;
};
function fixture({dumpFails=0,catFails=0,xml='<node class="android.webkit.WebView"/>'}={}){
 let dump=0,cat=0;
 const calls=[];
 const adb=(...args)=>{
  calls.push(args);
  if(args[1]==='uiautomator'){
   dump++;
   if(dump<=dumpFails)throw Error('temporary uiautomator dump unavailable');
   return 'UI hierarchy dumped';
  }
  if(args[1]==='cat'){
   cat++;
   if(cat<=catFails)throw Error('temporary cat unavailable');
   return xml;
  }
  throw Error('Unexpected adb call');
 };
 return {adb,calls};
}
test('first usable hierarchy is parsed from an actual dump without a delay',async()=>{
 const f=fixture();const pauses=[];
 assert.equal(await readWebViewFrame(f.adb,{parseBounds,pause:ms=>pauses.push(ms)}),frame);
 assert.deepEqual(f.calls.map(x=>x[1]),['uiautomator','cat']);
 assert.deepEqual(pauses,[]);
});
test('intermittent UIAutomator failure retries with bounded backoff and a fresh dump',async()=>{
 const f=fixture({dumpFails:1}),pauses=[],retries=[];
 assert.equal(await readWebViewFrame(f.adb,{parseBounds,pause:ms=>pauses.push(ms),onRetry:(n,max)=>retries.push([n,max])}),frame);
 assert.deepEqual(f.calls.map(x=>x[1]),['uiautomator','uiautomator','cat']);
 assert.deepEqual(pauses,[350]);assert.deepEqual(retries,[[1,3]]);
});
test('failed or malformed hierarchy is not used for taps, even after three retries',async()=>{
 const f=fixture({xml:'<hierarchy />'}),pauses=[];
 await assert.rejects(readWebViewFrame(f.adb,{parseBounds,pause:ms=>pauses.push(ms)}),/TRANSPORT: Cannot read real Android WebView frame after 3 attempts/);
 assert.deepEqual(f.calls.map(x=>x[1]),['uiautomator','cat','uiautomator','cat','uiautomator','cat']);
 assert.deepEqual(pauses,[350,700]);
});
test('cat failure triggers a new dump, never reuses the previous XML',async()=>{
 const f=fixture({catFails:1});
 assert.equal(await readWebViewFrame(f.adb,{parseBounds,pause:async()=>{}}),frame);
 assert.deepEqual(f.calls.map(x=>x[1]),['uiautomator','cat','uiautomator','cat']);
});
test('permanent transport failure remains NOT_TESTED-classifiable; invalid options fail closed',async()=>{
 const f=fixture({dumpFails:9});
 await assert.rejects(readWebViewFrame(f.adb,{parseBounds,pause:async()=>{}}),/TRANSPORT:.*after 3 attempts/);
 assert.equal(f.calls.filter(x=>x[1]==='uiautomator').length,3);
 await assert.rejects(readWebViewFrame(f.adb,{parseBounds,attempts:20}),/TRANSPORT: Invalid/);
});
