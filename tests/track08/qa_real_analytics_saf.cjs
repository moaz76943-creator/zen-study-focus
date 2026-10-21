'use strict';
// Disposable Android QA only. Actual app Analytics Export button opens real
// ACTION_CREATE_DOCUMENT; verify CANCEL then SAVE + file bytes without using
// owner data, fabricated native callbacks, or browser-only mock saves.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const cp=require('node:child_process');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const E=process.argv[2]||'/tmp/df-native-saf';
fs.mkdirSync(E,{recursive:true});
const adb=(...args)=>cp.execFileSync('adb',args,{encoding:'utf8',timeout:24000,maxBuffer:4*1024*1024});
const snap=file=>fs.writeFileSync(E+'/'+file,cp.execFileSync('adb',['exec-out','screencap','-p'],{timeout:16000,maxBuffer:9*1024*1024}));
const report={source:'real Android DocumentsUI with bundled Analytics button',results:[],status:'NOT_TESTED',release_approved:false};
let ws,requestId=0;
async function evaluate(expression){
 return new Promise((resolve,reject)=>{
  const id=++requestId;
  const timer=setTimeout(()=>{ws.removeEventListener('message',listener);reject(Error('CDP Runtime.evaluate timeout'));},22000);
  function listener(ev){
   let p;try{p=JSON.parse(ev.data);}catch(_){return;}
   if(p.id!==id)return;
   clearTimeout(timer);ws.removeEventListener('message',listener);
   if(p.error||p.result?.exceptionDetails)return reject(Error('CDP JavaScript error '+JSON.stringify(p.error||p.result.exceptionDetails).slice(0,500)));
   resolve(p.result?.result?.value);
  }
  ws.addEventListener('message',listener);
  ws.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression,returnByValue:true}}));
 });
}
async function connect(){
 const targets=await new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>reject(Error('Local CDP discovery timeout')),5000);
  fetch('http://127.0.0.1:9223/json/list').then(r=>r.json()).then(v=>{clearTimeout(timeout);resolve(v)}).catch(e=>{clearTimeout(timeout);reject(e)});
 });
 const page=targets.find(x=>x.type==='page'&&x.url==='file:///android_asset/web/index.html');
 assert.ok(page,'Trusted app WebView missing; do not simulate SAF');
 const endpoint=new URL(page.webSocketDebuggerUrl);
 assert.ok(['localhost','127.0.0.1'].includes(endpoint.hostname));
 endpoint.hostname='127.0.0.1';endpoint.port='9223';
 ws=new WebSocket(endpoint);
 await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('CDP socket open timeout')),10000);
  ws.addEventListener('open',()=>{clearTimeout(timer);resolve()},{once:true});
  ws.addEventListener('error',()=>{clearTimeout(timer);reject(Error('CDP socket failure'))},{once:true});
 });
}
async function waitFor(description,fn,attempts=15){
 let last;
 for(let i=0;i<attempts;i++){
  try{let v=await fn();if(v)return v;}catch(e){last=e;}
  await sleep(500);
 }
 throw Error(description+' NOT VERIFIED '+String(last?.message||'').slice(0,170));
}
function parseXml(){
 adb('shell','uiautomator','dump','/sdcard/qa-saf-current.xml');
 const xml=adb('shell','cat','/sdcard/qa-saf-current.xml');
 if(!xml.includes('<hierarchy'))throw Error('DocumentsUI hierarchy missing');
 return xml;
}
function nodes(xml){
 return [...xml.matchAll(/<node[^>]*>/g)].map(m=>m[0]);
}
function point(node){
 const match=node?.match(/bounds="([^"]+)"/);
 const numbers=match?[...match[1].matchAll(/[0-9]+/g)].map(m=>Number(m[0])):[];
 if(numbers.length!==4 || numbers[2]<=numbers[0] || numbers[3]<=numbers[1])
  throw Error('Native Save control bounds not accessible');
 return {x:Math.floor((numbers[0]+numbers[2])/2),y:Math.floor((numbers[1]+numbers[3])/2)};
}
async function waitChooser(stage){
 const xml=await waitFor('Real Android ACTION_CREATE_DOCUMENT '+stage,()=>{
  const x=parseXml();
  return (/documentsui/i.test(x)||(/deep-focus-analytics\.csv/i.test(x)&&/Save|حفظ|SAVE/i.test(x)))?x:null;
 });
 fs.writeFileSync(E+'/'+stage+'-picker.xml',xml);
 snap(stage+'-picker.png');
 return xml;
}
async function clickExport(stage){
 const action=await evaluate(`(()=>{
  if(!window.ZenNative||typeof ZenNative.exportAnalyticsCsvToFile!=='function')return {error:'Missing native SAF bridge'};
  if(typeof window.DFRecoveryNativeExportResult!=='function')return {error:'Missing correlated save receipt'};
  if(!window.__qaSafReceipts){
    window.__qaSafReceipts=[];
    const original=window.DFRecoveryNativeExportResult;
    window.DFRecoveryNativeExportResult=function(id,status){window.__qaSafReceipts.push({id,status});return original(id,status)};
  }
  applyLanguage('en');
  document.querySelector('#navAnalytics').click();
  const buttons=[...document.querySelectorAll('#df22AnalyticsHost button')];
  const button=buttons.find(b=>!b.disabled&&/export|csv/i.test(b.textContent));
  if(!button)return {error:'No enabled real Analytics export button',labels:buttons.map(b=>({text:b.textContent,disabled:b.disabled}))};
  const before=window.__qaSafReceipts.length;
  button.click();
  return {clicked:true,buttonText:button.textContent,receiptCountBefore:before};
 })()`);
 assert.ok(action?.clicked,'The actual Analytics export button could not be clicked: '+JSON.stringify(action).slice(0,480));
 report.results.push({stage,step:'real-analytics-export-handler',status:'PASS',buttonText:action.buttonText});
 return action.receiptCountBefore;
}
async function receiptAfter(before,expected){
 const receipt=await waitFor('correlated native SAF '+expected,async()=>{
  const data=await evaluate('window.__qaSafReceipts||[]');
  return Array.isArray(data)&&data.length>before?data.at(-1):null;
 },20);
 assert.equal(receipt.status,expected,'Wrong native SAF receipt status');
 return receipt;
}
(async()=>{
 try{
  await connect();
  const initial=await evaluate("({url:location.href,installed:!!window.DF22Integration,normal:document.querySelector('#navAnalytics')!==null})");
  assert.equal(initial?.url,'file:///android_asset/web/index.html');
  assert.equal(initial.normal,true);
  const cancelledBefore=await clickExport('cancel');
  await waitChooser('cancel');
  adb('shell','input','keyevent','KEYCODE_BACK');
  const cancelResult=await receiptAfter(cancelledBefore,'cancelled');
  report.results.push({stage:'cancel',status:'PASS',requestId:cancelResult.id,realNativePicker:true});
  const savedBefore=await clickExport('save');
  const xml=await waitChooser('save');
  const save=nodes(xml).find(n=>/text="(?:SAVE|Save|حفظ)"/.test(n)||/resource-id="[^"]*:id\/action_menu_save"/.test(n));
  if(!save){
   report.results.push({stage:'save',status:'NOT_TESTED',reason:'Native DocumentsUI Save control not exposed in current folder'});
   throw Error('Real Save control missing; no fake successful export');
  }
  const position=point(save);
  adb('shell','input','tap',String(position.x),String(position.y));
  const saved=await receiptAfter(savedBefore,'saved');
  const check=adb('shell','sh','-c','find /sdcard/Download -maxdepth 2 -type f -iname "deep-focus-analytics*" 2>/dev/null | head -n 3').trim();
  if(!check){
   report.results.push({stage:'save',status:'NOT_TESTED',requestId:saved.id,reason:'Native reports saved but file bytes not inspectable in Downloads'});
   throw Error('No independently readable exported CSV found in Downloads');
  }
  const first=check.split('\n')[0];
  assert.match(first,/^\/sdcard\/Download\//,'Only disposable public Downloads path may be inspected');
  const bytes=adb('shell','cat',first);
  assert.ok(bytes.startsWith('"id"')||bytes.startsWith('"date"')||bytes.startsWith('"period"'),'Saved file missing verified Analytics CSV headers');
  assert.match(bytes,/\r?\n/,'CSV must include a header row and newline');
  assert.doesNotMatch(bytes,/[\u0660-\u0669\u06f0-\u06f9]/,'Western digits only in generated CSV');
  report.results.push({stage:'save',status:'PASS',requestId:saved.id,readableCsv:true,bytes:bytes.length});
  report.status='PASS';
  console.log('REAL_ANDROID_ANALYTICS_SAF_PASS',JSON.stringify(report));
 }catch(e){
  report.error=String(e.message||e).slice(0,550);
  report.status='NOT_TESTED';
  console.error('REAL_ANDROID_ANALYTICS_SAF_NOT_APPROVED',report.error);
  process.exitCode=1;
 }finally{
  if(ws)try{ws.close()}catch(_){}
  fs.writeFileSync(E+'/native-analytics-saf-results.json',JSON.stringify(report,null,2));
 }
})()
