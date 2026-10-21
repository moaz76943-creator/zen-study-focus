#!/usr/bin/env node
'use strict';
/* Real Chromium CSS viewport inspection (read-only, private local debugging port). */
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawn}=require('node:child_process');
const {pathToFileURL}=require('node:url');
const OUT=path.resolve('dist/mobile_chrome_qa');
const WIDTHS=[320,360,393,430];
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function portFromChrome(profile,proc){
 const file=path.join(profile,'DevToolsActivePort');
 for(let i=0;i<180;i++){
  if(proc.exitCode!==null)throw Error('Chrome exited before debugging started');
  if(fs.existsSync(file)){
   const p=Number(fs.readFileSync(file,'utf8').split('\n')[0]);
   if(Number.isSafeInteger(p)&&p>0)return p;
  }
  await delay(100);
 }
 throw Error('Chrome DevToolsActivePort unavailable');
}
async function connect(port){
 const r=await fetch('http://127.0.0.1:'+port+'/json/list',{signal:AbortSignal.timeout(5000)});
 if(!r.ok)throw Error('CDP target discovery failed');
 const targets=await r.json();
 const target=targets.find(x=>x.type==='page'&&typeof x.webSocketDebuggerUrl==='string');
 if(!target)throw Error('No page debugging target');
 const socket=new WebSocket(target.webSocketDebuggerUrl),pending=new Map();
 await new Promise((resolve,reject)=>{
  socket.addEventListener('open',resolve,{once:true});
  socket.addEventListener('error',reject,{once:true});
 });
 let sequence=0;
 socket.addEventListener('message',e=>{
  const data=JSON.parse(e.data),item=pending.get(data.id);
  if(!item)return;pending.delete(data.id);
  clearTimeout(item.timer);
  if(data.error)item.reject(Error(data.error.message||'CDP error'));
  else item.resolve(data.result);
 });
 const send=(method,params={})=>new Promise((resolve,reject)=>{
  const id=++sequence;
  const timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout '+method));},10000);
  pending.set(id,{resolve,reject,timer});
  socket.send(JSON.stringify({id,method,params}));
 });
 return {send,close:()=>socket.close()};
}
async function evalValue(send,expression){
 const data=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
 if(data.exceptionDetails)throw Error('Browser evaluate: '+data.exceptionDetails.text);
 return data.result?.value;
}
async function check(input,binary){
 const file=path.resolve(input),profile=fs.mkdtempSync(path.join(os.tmpdir(),'track15-chrome-'));
 if(!fs.existsSync(file))throw Error('Portable source file missing');
 fs.mkdirSync(OUT,{recursive:true});
 const proc=spawn(binary,[
  '--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu',
  '--no-first-run','--disable-extensions','--no-default-browser-check',
  '--remote-debugging-port=0','--user-data-dir='+profile,
  pathToFileURL(file).href
 ],{stdio:'ignore'});
 let session=null;
 try{
  session=await connect(await portFromChrome(profile,proc));
  const {send}=session;
  await send('Page.enable');await send('Runtime.enable');
  let booted=false;
  for(let i=0;i<80;i++){
   const ok=await evalValue(send,'document.readyState==="complete"&&!!document.getElementById("track15-refresh")');
   if(ok===true){booted=true;break;}
   await delay(100);
  }
  if(!booted)throw Error('Dashboard did not load in real Chrome');
  const reports=[];
  for(const width of WIDTHS){
   await send('Emulation.setDeviceMetricsOverride',{
    width,height:760,deviceScaleFactor:1,mobile:true,screenWidth:width,screenHeight:760
   });
   await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
   await delay(180);
   const report=await evalValue(send,'(()=>{const button=document.getElementById("track15-refresh");button?.scrollIntoView({block:"center",inline:"nearest"});const b=button?.getBoundingClientRect();const d=document.documentElement;return {viewportWidth:window.innerWidth,clientWidth:d.clientWidth,documentWidth:d.scrollWidth,refreshHeight:b?Math.round(b.height):0,refreshRight:b?Math.round(b.right):null,refreshLeft:b?Math.round(b.left):null,ready:document.readyState,hasTrack15:!!document.getElementById("track15-locales"),mobileMedia:matchMedia("(max-width:430px)").matches}})()');
   const errors=[];
   if(report.viewportWidth!==width||report.clientWidth!==width)errors.push('actual CSS width mismatch');
   if(report.documentWidth>width+2)errors.push('horizontal document overflow');
   if(report.refreshHeight<44)errors.push('refresh target below 44px');
   if(report.refreshRight>width+2||report.refreshLeft<0)errors.push('refresh outside screen');
   if(report.ready!=='complete'||!report.hasTrack15||!report.mobileMedia)errors.push('dashboard incomplete');
   const shot=await send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});
   if(!shot?.data||shot.data.length<100)errors.push('screenshot missing');
   else fs.writeFileSync(path.join(OUT,'real_viewport_'+width+'.png'),Buffer.from(shot.data,'base64'));
   reports.push({requestedWidth:width,...report,errors});
   console.log('CDP MOBILE '+JSON.stringify(reports[reports.length-1]));
  }
  fs.writeFileSync(path.join(OUT,'real_viewports.json'),JSON.stringify({reports},null,2));
  if(reports.some(x=>x.errors.length))throw Error('Mobile viewport/overflow validation failed');
  console.log('PASS: four exact CSS viewport sizes and screenshots');
  return reports;
 }finally{
  try{session?.close();}catch{}
  proc.kill('SIGTERM');
  await delay(250);
  try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});}catch{}
 }
}
if(require.main===module){
 const input=process.argv[2],binary=process.env.BROWSER_BIN;
 if(!input||!binary)throw Error('Usage: BROWSER_BIN=chromium node chrome_mobile_cdp_qa.cjs PORTABLE_HTML');
 check(input,binary).catch(e=>{console.error('FAIL: CDP mobile QA:',e.message);process.exitCode=1;});
}
module.exports={check,WIDTHS};
