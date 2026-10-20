'use strict';
// Hard Android runtime acceptance: installed QA foreground app must expose its bundled
// real WebView DOM; a surviving PID or successful am start alone is NOT a PASS.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const {evaluateWithRetry}=require('./qa_cdp_transport.cjs');

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
  function evaluate(js,stage,timeoutMs=15000){
    return new Promise((resolve,reject)=>{
      const id=++seq;
      let timer;
      function cleanup(){
        clearTimeout(timer);
        ws.removeEventListener('message',listener);
        ws.removeEventListener('close',closed);
        ws.removeEventListener('error',closed);
      }
      function closed(){
        cleanup();
        const error=new Error('CDP WebSocket closed during '+stage);
        error.code='CDP_TIMEOUT';reject(error);
      }
      function listener(ev){
        let value;
        try{value=JSON.parse(ev.data);}catch(e){cleanup();reject(e);return;}
        if(value.id!==id)return;
        cleanup();
        if(value.error||value.result?.exceptionDetails){
          reject(new Error('Real JavaScript/CDP exception at '+stage+': '+JSON.stringify(value.result?.exceptionDetails||value.error).slice(0,700)));
          return;
        }
        resolve(value.result?.result?.value);
      }
      timer=setTimeout(()=>{
        cleanup();
        const error=new Error('CDP '+stage+' request timed out in '+timeoutMs+'ms');
        error.code='CDP_TIMEOUT';reject(error);
      },timeoutMs);
      ws.addEventListener('message',listener);
      ws.addEventListener('close',closed);
      ws.addEventListener('error',closed);
      ws.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression:js,returnByValue:true,awaitPromise:false}}));
    });
  }
  const retry=(js,stage)=>evaluateWithRetry(()=>evaluate(js,stage),{
    stage,attempts:3,
    onAttempt:({number,total})=>console.log('QA_CDP_STAGE',stage,'attempt',number,'/',total)
  });
  console.log('QA_CDP_TARGET_CONNECTED',JSON.stringify({id:page.id,url:page.url}));

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
      state=await retry(script,'startup-'+n);
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
    // Native Android WebView regression for actual Analytics translations, not just PID.
    const analytics=await retry("(() => {\n const supported=['fa','de','ur','bn'];const results=[];\n for(const lang of supported){\n  const box=document.createElement('section');document.body.appendChild(box);\n  let mounted=null;\n  try{\n   mounted=window.DeepFocusAnalyticsStudioV21.mount(box,()=>({\n    sessionHistory:[{id:'qa-local-1',date:'2026-10-19',domain:'study',minutes:30,completed:true}],tasksList:[],projects:[]\n   }),{locale:lang,today:'2026-10-20',startDate:'2026-10-01',endDate:'2026-10-20'});\n   const panel=mounted.element,fields=[...panel.querySelectorAll('input[type=date]')];\n   results.push({lang,heading:panel.querySelector('h2')?.textContent,\n    expected:window.DeepFocusLocale20Recovery.t(lang,'analyticsTitle'),\n    direction:panel.getAttribute('dir'),expectedDirection:window.DeepFocusLocale20Recovery.direction(lang),\n    sessionMinutes:mounted.getReport()?.totals.minutes,\n    dateDirections:fields.map(el=>getComputedStyle(el).direction)});\n  }finally{if(mounted)mounted.destroy();box.remove();}\n }\n return results;\n})()",'analytics-mounted-real-dom');
    for(const row of analytics){
      assert.equal(row.heading,row.expected,'Analytics translated title: '+row.lang);
      assert.equal(row.direction,row.expectedDirection,'Analytics direction: '+row.lang);
      assert.equal(row.sessionMinutes,30,'Analytics session aggregate: '+row.lang);
      assert.deepEqual(row.dateDirections,['ltr','ltr'],'Western-digit date fields: '+row.lang);
    }
    console.log(JSON.stringify({probe:'ANDROID_ANALYTICS_LOCALIZED_UI',cases:analytics.length,results:analytics}));

    const numerals=await retry("(() => {\n const panels=['sec-timer','sec-calendar','sec-tasks','sec-notes','sec-analytics'];\n const samples=[];\n for(const id of panels){\n  const parent=document.getElementById(id);\n  if(!parent)throw Error('missing app screen '+id);\n  const counter=document.createElement('span');\n  counter.setAttribute('data-df-latin-numerals','');\n  counter.textContent='١٢ • ۱۲ • १२ • ১২';\n  parent.appendChild(counter);samples.push(counter);\n }\n const user=document.createElement('span');user.setAttribute('data-df-user-content','');\n user.textContent='عنوان المستخدم ١٢';document.body.appendChild(user);\n const n=DeepFocusAsciiNumeralsV21.normalizeGeneratedUi(document);\n const values=samples.map(e=>e.textContent);\n const original=user.textContent;\n samples.forEach(e=>e.remove());user.remove();\n return {count:n,values,original};\n})()",'five-screen-western-digits');
    assert.equal(numerals.values.length,5);
    assert.ok(numerals.values.every(t=>t==='12 • 12 • 12 • 12'),'Generated digits must be 0–9 in every sampled screen');
    assert.equal(numerals.original,'عنوان المستخدم ١٢','User-authored text must be untouched');
    console.log(JSON.stringify({probe:'ANDROID_FIVE_SCREEN_WESTERN_DIGITS',...numerals}));
    fs.writeFileSync(process.argv[2]||'qa-webview-result.json',JSON.stringify({status:'PASS',...state,numerals,analytics},null,2));
  }finally{ws.close();}
}
main().catch(err=>{console.error('QA_WEBVIEW_STARTUP_FAIL:',String(err));process.exitCode=1;});
