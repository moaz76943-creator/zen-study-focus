#!/usr/bin/env node
'use strict';
// TRACK11: installed disposable Android emulator WebView probe. Never use owner data.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const LANGS=Object.freeze(['en','ar','es','zh','hi','fr','de','ru','pt','ja','id','tr','ko','vi','it','bn','ur','fa','pl','nl']);
const RTL=new Set(['ar','fa','ur']);
const expectedOrigin='file:///android_asset/web/index.html';
const EASTERN=/[\u0660-\u0669\u06f0-\u06f9\u0966-\u096f\u09e6-\u09ef]/;
function guard(snapshot){
 assert.equal(snapshot?.origin,expectedOrigin,'UNTRUSTED_WEBVIEW_ORIGIN');
 assert.equal(snapshot?.appReady,true,'APP_NOT_READY');
 assert.equal(snapshot?.nativeBridge,true,'NATIVE_BRIDGE_MISSING');
 assert.equal(snapshot?.storedConfig,true,'V21_LOCALE_NOT_STORED');
}
function validateSwitch(s){
 guard(s);
 assert.equal(s.rows?.length,20,'TWENTY_LOCALES_REQUIRED');
 assert.deepEqual(s.rows.map(r=>r.code),LANGS,'TWENTY_LOCALES_REQUIRED');
 for(const r of s.rows){
  if(r.actualLang!==r.code||r.actualDir!==(RTL.has(r.code)?'rtl':'ltr')
    ||r.dir!==(RTL.has(r.code)?'rtl':'ltr')
    ||!Array.isArray(r.navProblems)||r.navProblems.length||r.layoutOverflow)
    throw Error('LANGUAGE_RENDER_MISMATCH:'+r.code+':'+JSON.stringify(r.navProblems));
  if(EASTERN.test(r.generatedDigits||''))throw Error('NON_LATIN_GENERATED_DIGITS:'+r.code);
  if(!r.userTextPreserved)throw Error('USER_TEXT_CHANGED:'+r.code);
  if(r.chart!=='PASS')throw Error('CHART_A11Y_FAILURE:'+r.code+':'+r.chart);
 }
 assert.equal(s.finalLocale,'ur','FINAL_RTL_LOCALE_NOT_SELECTED');
 return {status:'PASS',cases:s.rows.length,restarted:false};
}
function validateReopen(s){
 guard(s);
 if(s.language!=='ur'||s.dir!=='rtl')throw Error('LOCALE_NOT_PERSISTED');
 return {status:'PASS',cases:1,restarted:true};
}
function browserProbe(stage){
 const supported=['en','ar','es','zh','hi','fr','de','ru','pt','ja','id','tr','ko','vi','it','bn','ur','fa','pl','nl'];
 const rtl=['ar','fa','ur'];
 const root=document.getElementById('htmlRoot')||document.documentElement;
 const basic=()=>({
  origin:location.href,appReady:document.readyState==='complete'&&typeof applyLanguage==='function',
  nativeBridge:typeof window.ZenNative!=='undefined',
  storedConfig:!!localStorage.getItem('zen_fortress_cfg_v21')
 });
 if(stage==='reopen'){
  return {...basic(),language:cfg.lang,dir:root.dir};
 }
 if(stage!=='switch')throw Error('INVALID_STAGE');
 const rows=[];
 const original='ملاحظتي ١٢٣ • متن ۱۲۳ • देवनागरी १२३ • বাংলা ১২৩';
 const authored=document.createElement('span');
 authored.setAttribute('data-df-user-content','');
 authored.textContent=original;
 document.body.appendChild(authored);
 try{
  for(const code of supported){
   applyLanguage(code);
   const navProblems=[];
   for(const id of ['navTimer','navTasks','navCalendar','navNotes','navSounds','navAnalytics']){
    const element=document.querySelector('#'+id+' span[data-i18n]');
    if(!element){navProblems.push('MISSING:'+id);continue;}
    const key=element.getAttribute('data-i18n');
    const expected=DICT[code]?.[key];
    if(!expected){navProblems.push('NO_LOCALE_KEY:'+key);continue;}
    const rendered=String(expected).replace(/[\u0660-\u0669\u06f0-\u06f9\u0966-\u096f\u09e6-\u09ef]/g,d=>{
     const cp=d.charCodeAt(0);
     return String(cp-(cp>=0x09e6?0x09e6:cp>=0x0966?0x0966:cp>=0x06f0?0x06f0:0x0660));
    });
    if(element.textContent!==rendered)navProblems.push('WRONG_LABEL:'+key);
   }
   let chart='PASS',mount=null,host=null;
   try{
    host=document.createElement('section');
    document.body.appendChild(host);
    mount=DeepFocusAnalyticsStudioV21.mount(host,()=>({
     sessionHistory:[{id:'qa-track11-30m',date:'2026-10-19',domain:'study',minutes:30,completed:true}],
     tasksList:[],projects:[]
    }),{locale:code,today:'2026-10-20',startDate:'2026-10-01',endDate:'2026-10-20'});
    const box=mount.element;
    const aria=[...box.querySelectorAll('svg.dfa-svg')].map(x=>x.getAttribute('aria-label'));
    const expected=[DeepFocusLocale20Recovery.t(code,'chart'),DeepFocusLocale20Recovery.t(code,'heatmapYear')];
    if(JSON.stringify(aria)!==JSON.stringify(expected)||
     mount.getReport()?.totals.minutes!==30||
     box.getAttribute('dir')!==(rtl.includes(code)?'rtl':'ltr')||
     box.querySelectorAll('input[type=date]').length!==2||
     [...box.querySelectorAll('input[type=date]')].some(el=>getComputedStyle(el).direction!=='ltr')||
     /[\u0660-\u0669\u06f0-\u06f9\u0966-\u096f\u09e6-\u09ef]/.test(
      [...box.querySelectorAll('svg.dfa-svg')].map(x=>x.outerHTML).join(''))){
      chart='FAIL';
    }
   }catch(e){chart='FAIL:'+String(e.message).slice(0,100);}
   finally{try{mount?.destroy();}finally{host?.remove();}}
   rows.push({code,dir:rtl.includes(code)?'rtl':'ltr',
    actualLang:root.lang,actualDir:root.dir,
    generatedDigits:document.getElementById('timerDigitsTxt')?.textContent||'',
    navProblems,layoutOverflow:document.documentElement.scrollWidth>innerWidth+1,
    userTextPreserved:authored.textContent===original,chart});
  }
  applyLanguage('ur');
  return {...basic(),rows,finalLocale:cfg.lang};
 }finally{authored.remove();}
}
function expression(stage){
 if(!['switch','reopen'].includes(stage))throw Error('INVALID_STAGE');
 return '('+browserProbe.toString()+')('+JSON.stringify(stage)+')';
}
async function inspectRealAndroid(stage){
 const origin='http://127.0.0.1:9222/json/list';
 let target=null;
 for(let i=0;i<24;i++){
  try{
   const response=await fetch(origin,{signal:AbortSignal.timeout(2500)});
   if(response.ok)target=(await response.json()).find(x=>x.type==='page'&&x.url===expectedOrigin);
   if(target)break;
  }catch(_){}
  await new Promise(ok=>setTimeout(ok,500));
 }
 if(!target?.webSocketDebuggerUrl)throw Error('TRANSPORT_NO_BUNDLED_WEBVIEW_PAGE');
 const endpoint=new URL(target.webSocketDebuggerUrl);
 if(endpoint.protocol!=='ws:'||!['localhost','127.0.0.1'].includes(endpoint.hostname))
  throw Error('TRANSPORT_UNSAFE_DEBUGGING_ORIGIN');
 endpoint.hostname='127.0.0.1';endpoint.port='9222';
 const ws=new WebSocket(endpoint.toString());
 await new Promise((ok,bad)=>{
  const timer=setTimeout(()=>{ws.close();bad(Error('TRANSPORT_CDP_OPEN_TIMEOUT'));},8000);
  ws.addEventListener('open',()=>{clearTimeout(timer);ok();},{once:true});
  ws.addEventListener('error',()=>{clearTimeout(timer);bad(Error('TRANSPORT_CDP_ERROR'));},{once:true});
 });
 let seq=0;
 async function evaluate(js){
  return new Promise((ok,bad)=>{
   const id=++seq;
   const timeout=setTimeout(()=>{ws.removeEventListener('message',listener);bad(Error('TRANSPORT_CDP_EVALUATION_TIMEOUT'));},30000);
   function listener(ev){
    let msg;try{msg=JSON.parse(ev.data);}catch(_){return;}
    if(msg.id!==id)return;
    clearTimeout(timeout);
    ws.removeEventListener('message',listener);
    if(msg.error||msg.result?.exceptionDetails){
     bad(Error('WEBVIEW_EVALUATION_FAILURE:'+JSON.stringify(msg.error||msg.result?.exceptionDetails).slice(0,700)));
    }else ok(msg.result?.result?.value);
   }
   ws.addEventListener('message',listener);
   ws.send(JSON.stringify({id,method:'Runtime.evaluate',
    params:{expression:js,returnByValue:true}}));
  });
 }
 try{
  for(let i=0;i<30;i++){
   const ok=await evaluate("document.readyState==='complete' && typeof applyLanguage==='function' && !!document.querySelector('#navTimer')");
   if(ok)break;
   if(i===29)throw Error('APP_READY_TIMEOUT');
   await new Promise(done=>setTimeout(done,600));
  }
  return await evaluate(expression(stage));
 }finally{ws.close();}
}
async function main(args=process.argv.slice(2)){
 const [stage,output]=args;
 if(!['switch','reopen'].includes(stage)||!output)throw Error('Usage: track11_android_probe.cjs switch|reopen OUTPUT.json');
 let status='NOT_TESTED',data=null,details=null;
 try{
  data=await inspectRealAndroid(stage);
  const verified=stage==='switch'?validateSwitch(data):validateReopen(data);
  status=verified.status;
 }catch(e){
  details=String(e.message||e);
  status=/^(TRANSPORT_|APP_READY_TIMEOUT)/.test(details)?'NOT_TESTED':'FAIL';
 }
 const report={source:'Installed disposable Android API30 WebView CDP, not desktop browser',
  sha:process.env.GITHUB_SHA||null,stage,status,details,data,
  nativeTalkBack:'NOT_TESTED',backupRestore:'NOT_TESTED',
  handwrittenTextPersistence:'NOT_TESTED',releaseApproved:false};
 fs.mkdirSync(path.dirname(output),{recursive:true});
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({sha:report.sha,stage,status,details,
  languages:stage==='switch'?data?.rows?.length:null},null,2));
 if(status!=='PASS')process.exitCode=1;
 return report;
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={LANGS,validateSwitch,validateReopen,expression,main};
