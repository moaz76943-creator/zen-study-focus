'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'cdp_dom_smoke.cjs'),'utf8');
async function probe(dom,stall=false){
 const messages=[];let output='';const sockets=[];
 class Socket extends EventTarget {
  constructor(){super();sockets.push(this);queueMicrotask(()=>this.dispatchEvent(new Event('open')));}
  send(raw){const request=JSON.parse(raw);messages.push(request);
   if(stall)return;
   const result=request.method==='Runtime.evaluate'?{result:{value:dom}}:{};
   queueMicrotask(()=>{const e=new Event('message');e.data=JSON.stringify({id:request.id,result});this.dispatchEvent(e);});
  }
  close(){}
 }
 const context={require:name=>name==='node:fs'?{writeFileSync(){}}:require(name),process:{argv:['node','probe'],stdout:{write:s=>output+=s},exitCode:0},
  WebSocket:Socket,URL,AbortController,Date,Promise,JSON,Error,
  fetch:async()=>({ok:true,json:async()=>[{type:'page',url:'file:///android_asset/web/index.html',webSocketDebuggerUrl:'ws://127.0.0.1:9222/devtools/page/1'}]}),
  setTimeout:(fn)=>setTimeout(fn,stall?1:500),clearTimeout};
 vm.runInNewContext(source,context,{filename:'cdp_dom_smoke.cjs'});
 for(let i=0;!output&&i<100;i++)await new Promise(r=>setTimeout(r,5));
 assert.ok(output,'Probe must always report, including protocol failures');
 return {report:JSON.parse(output),messages,exitCode:context.process.exitCode};
}
const healthy={ready:'complete',timerSection:true,playButton:true,playVisible:true,toggleAvailable:true,appScriptAvailable:true,url:'file:///android_asset/web/index.html'};
test('actual DOM controls/origin are required; no touching data or native bridge',async()=>{
 const r=await probe(healthy);assert.equal(r.report.status,'PASS');assert.equal(r.exitCode,0);
 assert.equal(new Set(r.messages.map(m=>m.id)).size,r.messages.length);
 assert.ok(r.messages.some(m=>m.method==='Runtime.enable'));
 assert.ok(r.messages.every(m=>!JSON.stringify(m).includes('ZenNative')));
});
test('observed missing application controls remains app FAIL',async()=>{
 const r=await probe({...healthy,playButton:false});assert.equal(r.report.status,'FAIL');assert.equal(r.exitCode,1);
});
test('unresponsive renderer protocol remains NOT_TESTED and fails acceptance',async()=>{
 const r=await probe(null,true);assert.equal(r.report.status,'NOT_TESTED');assert.equal(r.exitCode,1);
});
