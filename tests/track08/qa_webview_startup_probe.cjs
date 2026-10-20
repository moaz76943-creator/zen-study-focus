'use strict';
// Hard Android runtime acceptance: installed QA foreground app must expose its bundled
// real WebView DOM; a surviving PID or successful am start alone is NOT a PASS.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');

const url='http://127.0.0.1:9223/json/list';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function jsonGet() {
  return new Promise((resolve,reject)=>{
    http.get(url,res=>{
      let buf='';res.setEncoding('utf8');
      res.on('data',part=>buf+=part);res.on('end',()=>{try{resolve(JSON.parse(buf));}catch(e){reject(e);}});
    }).on('error',reject).setTimeout(2500,function(){this.destroy(Error('DevTools request timed out'));});
  });
}
async function main(){
  assert.equal(typeof WebSocket,'function','Requires Node 22 WebSocket support');
  let page=null;
  for(let t=0;t<24;t++){
    try{
      const pages=await jsonGet();
      page=pages.find(p=>p.type==='page'&&p.url==='file:///android_asset/web/index.html');
      if(page)break;
    }catch(_){}
    await sleep(500);
  }
  assert.ok(page,'QA did not create a bundled WebView page: MainActivity may have finished early');
  const endpoint=new URL(page.webSocketDebuggerUrl);
  assert.equal(endpoint.protocol,'ws:');
  assert.ok(['localhost','127.0.0.1'].includes(endpoint.hostname));
  endpoint.hostname='127.0.0.1';endpoint.port='9223';
  const ws=new WebSocket(endpoint.toString());
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error('QA CDP websocket timeout')),7000);
    ws.addEventListener('open',()=>{clearTimeout(timer);resolve();},{once:true});
    ws.addEventListener('error',()=>{clearTimeout(timer);reject(Error('QA CDP websocket failed'));},{once:true});
  });
  let seq=0;
  function evaluate(js){
    return new Promise((resolve,reject)=>{
      const id=++seq;
      const timer=setTimeout(()=>reject(Error('QA page evaluate timed out')),6000);
      const listener=ev=>{
        try{
          const value=JSON.parse(ev.data);
          if(value.id!==id)return;
          ws.removeEventListener('message',listener);
          clearTimeout(timer);
          if(value.error||value.result?.exceptionDetails){reject(Error('QA page evaluation error'));return;}
          resolve(value.result?.result?.value);
        }catch(e){clearTimeout(timer);reject(e);}
      };
      ws.addEventListener('message',listener);
      ws.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression:js,returnByValue:true,awaitPromise:true}}));
    });
  }
  try{
    let state;
    const script=`(() => {
      const ids=['navTimer','mainPlayBtn','focusHeroCard'];
      const elements=Object.fromEntries(ids.map(id=>{
        const element=document.getElementById(id);
        const rect=element?.getBoundingClientRect();
        return [id,{exists:!!element,width:rect?.width??0,height:rect?.height??0,display:element?getComputedStyle(element).display:null}];
      }));
      return {url:location.href,ready:document.readyState,body:!!document.body,
        nativeBridge:typeof window.ZenNative!=='undefined',
        integration:typeof window.DF22Integration!=='undefined',
        elements,foreground:document.visibilityState};
    })()`;
    for(let n=0;n<20;n++){
      state=await evaluate(script);
      if(state?.ready==='complete'&&state.nativeBridge&&state.integration&&state.elements.navTimer?.width>0&&state.elements.focusHeroCard?.exists&&state.elements.mainPlayBtn?.exists)break;
      await sleep(600);
    }
    console.log(JSON.stringify({probe:'QA_WEBVIEW_REAL_DOM',...state}));
    assert.equal(state?.ready,'complete','QA document not fully loaded');
    assert.equal(state?.url,'file:///android_asset/web/index.html');
    assert.equal(state?.nativeBridge,true,'Native bridge unavailable');
    assert.equal(state?.integration,true,'Integration bootstrap missing');
    assert.ok(state?.elements.navTimer?.width>0,'Real timer navigation has no visible width');
    assert.equal(state?.elements.focusHeroCard?.exists,true,'Focus hero missing');
    assert.equal(state?.elements.mainPlayBtn?.exists,true,'Main timer control missing');
    assert.equal(state?.foreground,'visible','QA WebView not foreground-visible');
    fs.writeFileSync(process.argv[2]||'qa-webview-result.json',JSON.stringify({status:'PASS',...state},null,2));
  }finally{ws.close();}
}
main().catch(err=>{console.error('QA_WEBVIEW_STARTUP_FAIL:',String(err));process.exitCode=1;});
