'use strict';
// TRACK08 disposable Android WebView CDP/touch regression; no physical/user data.
const fs=require('node:fs'),cp=require('node:child_process'),assert=require('node:assert/strict');
const {readWebViewFrame}=require('../android_e2e_recovery/android_ui_hierarchy.cjs');
const {parseWebViewBounds,cssPointToAndroid}=require('../android_e2e_recovery/android_device_touch.cjs');
const {validateTouchTarget}=require('../android_e2e_recovery/cdp_touch_target.cjs');
const pkg='com.zenstudy.focus',serial=process.env.ANDROID_SERIAL||'emulator-5554',delay=ms=>new Promise(r=>setTimeout(r,ms));
const adb=(...args)=>cp.execFileSync('adb',['-s',serial,...args],{encoding:'utf8',timeout:25000}).trim();
const report={source_sha:process.env.GITHUB_SHA||null,source:'genuine disposable Android WebView ADB physical touch pipeline + CDP readback (not manual physical device/IME)',device:null,tests:[],release_approved:false};
let ws,seq=0,pending=new Map();
const output=process.argv[2]||null;
function classify(e){return /^(TRANSPORT|INFRA):/.test(String(e.message||e))?'NOT_TESTED':'FAIL_APP';}
async function connect(){
 try{ws?.close();}catch(_){}
 try{adb('forward','--remove','tcp:9222');}catch(_){}
 const pid=adb('shell','pidof',pkg).split(/\s/)[0];
 if(!/^\d+$/.test(pid))throw Error('TRANSPORT: app PID absent');
 adb('forward','tcp:9222','localabstract:webview_devtools_remote_'+pid);
 let pages=[];
 for(let i=0;i<25;i++){
  try{const res=await fetch('http://127.0.0.1:9222/json/list',{signal:AbortSignal.timeout(4000)});pages=await res.json();if(pages.length)break;}catch(_){}
  await delay(600);
 }
 const page=pages.find(p=>p.type==='page'&&/android_asset\/web\/index\.html/.test(p.url||''));
 if(!page?.webSocketDebuggerUrl)throw Error('TRANSPORT: bundled WebView CDP target missing');
 const url=new URL(page.webSocketDebuggerUrl);
 if(url.protocol!=='ws:'||!['localhost','127.0.0.1'].includes(url.hostname)||url.port!=='9222')throw Error('TRANSPORT: unexpected CDP websocket URL');
 ws=new WebSocket(url);
 await new Promise((resolve,reject)=>{
  const t=setTimeout(()=>reject(Error('TRANSPORT: websocket connect timeout')),12000);
  ws.addEventListener('open',()=>{clearTimeout(t);resolve();},{once:true});
  ws.addEventListener('error',()=>{clearTimeout(t);reject(Error('TRANSPORT: websocket error'));},{once:true});
 });
 pending=new Map();
 ws.addEventListener('message',event=>{
  let msg;try{msg=JSON.parse(event.data);}catch(_){return;}
  const req=pending.get(msg.id);if(!req)return;
  pending.delete(msg.id);clearTimeout(req.timer);
  if(msg.error||msg.result?.exceptionDetails)req.reject(Error('APP: '+JSON.stringify(msg.error||msg.result.exceptionDetails).slice(0,500)));
  else req.resolve(msg.result);
 });
 await cmd('Runtime.enable');
 let ready=false;
 for(let i=0;i<35;i++){try{ready=await evalJS("document.readyState==='complete'&&!!window.DF22Integration&&!!window.DeepFocusTasksStudioV21&&!!window.ZenNative");if(ready)break;}catch(_){}await delay(600);}
 if(!ready)throw Error('TRANSPORT: Tasks Studio/native bridge missing after Android bootstrap');
}
function cmd(method,params={}){
 return new Promise((resolve,reject)=>{
  if(!ws||ws.readyState!==WebSocket.OPEN)return reject(Error('TRANSPORT: CDP disconnected'));
  const id=++seq,timer=setTimeout(()=>{pending.delete(id);reject(Error('TRANSPORT: CDP timeout '+method));},20000);
  pending.set(id,{timer,resolve,reject});
  ws.send(JSON.stringify({id,method,params}));
 });
}
async function evalJS(expression){
 const r=await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
 return r.result?.value;
}
async function snapshot(){return evalJS('JSON.parse(JSON.stringify(DF22Integration.getSnapshot()))');}
async function nativeReceipt(){return evalJS(`(()=>{const raw=ZenNative.readDurableV21();if(raw==='NONE'||raw==='ERROR')return {error:raw};const x=JSON.parse(raw);const p=x.packets;return {valid:Object.keys(p).length===6&&Object.entries(p).every(([k,v])=>v===localStorage.getItem(k)&&(!v||DeepFocusDataCompatV21.inspectPacket(v).ok)),keys:Object.keys(p).length};})()`);}
async function touch(selector,caption){
 const geometry=`(()=>{const el=${selector};
  if(!el)return {present:false,selector:${JSON.stringify(caption)}};
  const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
  const hit=document.elementFromPoint(x,y);
  return {present:true,selector:${JSON.stringify(caption)},x,y,width:r.width,height:r.height,
    viewportWidth:document.documentElement.clientWidth,viewportHeight:innerHeight,
    hitWithin:!!hit&&(el===hit||el.contains(hit)),hit:hit?.tagName||null};
 })()`;
 const readFrame=()=>readWebViewFrame(adb,{
  parseBounds:parseWebViewBounds,pause:delay,
  onRetry:(i,max)=>console.log('TRACK08_ANDROID_HIERARCHY_RETRY '+i+'/'+max)
 });
 let frame=await readFrame(),observed=null;
 const swipes=[];
 for(let attempt=0;attempt<5;attempt++){
  observed=await evalJS(geometry);
  if(!observed?.present)throw Error('UI_TARGET_MISSING: '+caption);
  if(!(observed.width>0&&observed.height>0))throw Error('UI_ZERO_SIZE: '+caption);
  if(observed.y>=0&&observed.y<observed.viewportHeight&&observed.hitWithin)break;
  if(attempt===4)throw Error('UI_SCROLL_INACCESSIBLE: '+caption+' '+JSON.stringify(observed));
  const x=Math.round(frame.left+frame.width/2);
  const scrollDown=observed.y>=observed.viewportHeight;
  const yFrom=Math.round(frame.top+frame.height*(scrollDown?0.78:0.24));
  const yTo=Math.round(frame.top+frame.height*(scrollDown?0.24:0.78));
  try{adb('shell','input','swipe',String(x),String(yFrom),String(x),String(yTo),'340');}
  catch(e){throw Error('TRANSPORT: Android ADB swipe failed '+String(e.message||e).slice(0,180));}
  swipes.push({from:yFrom,to:yTo,direction:scrollDown?'up':'down'});
  await delay(450);
  frame=await readFrame();
 }
 const target=validateTouchTarget(observed);
 const physical=cssPointToAndroid({...target,viewportWidth:observed.viewportWidth,viewportHeight:observed.viewportHeight},frame);
 try{adb('shell','input','tap',String(physical.x),String(physical.y));}
 catch(e){throw Error('TRANSPORT: real ADB tap failed '+String(e.message||e).slice(0,180));}
 await delay(350);
 report.touch_evidence??=[];
 report.touch_evidence.push({caption,source:'ADB physical touch pipeline',viewport:{x:target.x,y:target.y},
  physical,frame,swipes});
}

function buttonInCard(label){return `(()=>{const card=[...document.querySelectorAll('#track08AndroidHost .df-task')].find(c=>c.querySelector('.df-title')?.textContent==='DF08 legacy undated');return card?[...card.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)}):null;})()`;}
async function run(name,fn){
 try{const detail=await fn();report.tests.push({name,status:'PASS',detail});}
 catch(e){report.tests.push({name,status:classify(e),detail:String(e.message||e).slice(0,600)});}
 console.log('TRACK08_ANDROID_CASE',JSON.stringify(report.tests.at(-1)));
 return report.tests.at(-1).status==='PASS';
}
async function main(){
 if(process.env.TRACK08_DISPOSABLE!=='1'||adb('shell','getprop','ro.kernel.qemu')!=='1')throw Error('TRANSPORT: disposable emulator attestation failed');
 report.device={api:adb('shell','getprop','ro.build.version.sdk'),serial,package:pkg};
 if(!adb('shell','pm','path',pkg).includes(pkg))throw Error('TRANSPORT: debug package not installed');
 await connect();
 if(!await run('fixture_native_v21_ack',async()=>{
  const result=await evalJS(`(()=>{const before=DF22Integration.getSnapshot(),after=JSON.parse(JSON.stringify(before));
    if(after.tasksList.some(t=>t.title==='DF08 legacy undated'))return {error:'fixture already exists'};
    const id=Math.max(100000,...after.tasksList.filter(x=>Number.isSafeInteger(x.id)).map(x=>x.id))+801;
    after.tasksList.push({id,title:'DF08 legacy undated',catKey:'study',done:false,isStarter:false,legacyUnknown:{items:[1,'العربية']},v21Future:'preserve'});
    const committed=DF22Integration.write(before,after);
    return {id,committed,task:DF22Integration.getSnapshot().tasksList.find(t=>t.id===id)};
  })()`);
  assert.equal(result.committed,true);
  assert.equal(Object.hasOwn(result.task,'date'),false);
  assert.equal(result.task.v21Future,'preserve');
  report.fixture_id=result.id;
  const receipt=await nativeReceipt();assert.equal(receipt.valid,true);
  return {id:result.id,native_packets:receipt.keys,date_absent:true};
 }))return;
 if(!await run('android_touch_edit_save_no_fabricated_date',async()=>{
  const mount=await evalJS(`(()=>{const host=document.createElement('div');host.id='track08AndroidHost';
    Object.assign(host.style,{position:'fixed',inset:'0',zIndex:'2147483647',background:'#fff',overflowY:'auto',padding:'8px'});
    document.body.append(host);window.__track08Studio=DeepFocusTasksStudioV21.mount(host,{
      locale:'en',now:()=>new Date(2026,9,21),
      readState:()=>JSON.parse(JSON.stringify(DF22Integration.getSnapshot())),
      commit:(before,after)=>DF22Integration.write(before,after)
    });return {mounted:!!host.querySelector('.df-task'),count:host.querySelectorAll('.df-task').length};
  })()`);
  assert.equal(mount.mounted,true,'Tasks Studio must mount on genuine Android WebView');
  await touch(buttonInCard('Details'),'Details');
  const detailState=await evalJS(`(()=>{const card=[...document.querySelectorAll('#track08AndroidHost .df-task')].find(c=>c.querySelector('.df-title')?.textContent==='DF08 legacy undated');
    return {expanded:card?.querySelector('.df-expand')?.getAttribute('aria-expanded'),
      hidden:card?.querySelector('.df-task-more')?.hidden};})()`);
  assert.deepEqual(detailState,{expanded:'true',hidden:false},'Real Android ADB tap must expand Details');
  await touch(buttonInCard('Edit'),'Edit');
  const before=await evalJS(`(()=>{const f=document.querySelector('#track08AndroidHost form.df-form');return {
    hasForm:!!f,date:f?.querySelector('input[type=date]')?.value,
    checked:f?.querySelector('input[type=checkbox]')?.checked};})()`);
  assert.equal(before.hasForm,true);assert.equal(before.date,'');assert.equal(before.checked,false);
  const changed=await evalJS(`(()=>{const field=document.querySelector('#track08AndroidHost form.df-form input[type=text]');
    field.value='DF08 edited no date';field.dispatchEvent(new Event('input',{bubbles:true}));return field.value;})()`);
  assert.equal(changed,'DF08 edited no date');
  await touch("document.querySelector('#track08AndroidHost form.df-form button[type=submit]')",'Save');
  const s=await snapshot(),task=s.tasksList.find(t=>t.id===report.fixture_id);
  assert.ok(task,'fixture vanished');assert.equal(task.title,'DF08 edited no date');
  assert.equal(Object.hasOwn(task,'date'),false);assert.equal(Object.hasOwn(task,'dueAssigned'),false);
  assert.deepEqual(task.legacyUnknown,{items:[1,'العربية']});assert.equal(task.v21Future,'preserve');
  const receipt=await nativeReceipt();assert.equal(receipt.valid,true);
  return {date_absent:true,unknown_retained:true,native_ack:true,interaction:'Android ADB physical touch for Details/Edit/Save; text set through CDP (IME NOT_TESTED)'};
 }))return;
 if(!await run('native_force_stop_reopen_readback',async()=>{
  try{ws?.close();}catch(_){}
  adb('shell','am','force-stop',pkg);adb('shell','am','start','-n',pkg+'/.MainActivity');
  await delay(3000);await connect();
  const s=await snapshot(),task=s.tasksList.find(t=>t.id===report.fixture_id);
  assert.ok(task,'task not restored');assert.equal(task.title,'DF08 edited no date');
  assert.equal(Object.hasOwn(task,'date'),false);assert.equal(Object.hasOwn(task,'dueAssigned'),false);
  assert.deepEqual(task.legacyUnknown,{items:[1,'العربية']});
  assert.equal(s.tasksList.filter(t=>t.id===report.fixture_id).length,1);
  const receipt=await nativeReceipt();assert.equal(receipt.valid,true);
  return {date_absent_after_restart:true,unique_id:true,native_packets:receipt.keys};
 }))return;
 await run('android_webview_rejected_ack_draft_retained',async()=>{
  const root=await evalJS(`(()=>{const host=document.createElement('div');host.id='track08AndroidHost';
    Object.assign(host.style,{position:'fixed',inset:'0',zIndex:'2147483647',background:'#fff',overflowY:'auto',padding:'8px'});
    document.body.append(host);window.__track08Studio=DeepFocusTasksStudioV21.mount(host,{
      locale:'en',now:()=>new Date(2026,9,21),
      readState:()=>JSON.parse(JSON.stringify(DF22Integration.getSnapshot())),
      commit:()=>false
    });return !!host.querySelector('.df-task');})()`);
  assert.equal(root,true);
  const currentTitle='DF08 edited no date';
  const sel=caption=>`(()=>{const card=[...document.querySelectorAll('#track08AndroidHost .df-task')].find(c=>c.querySelector('.df-title')?.textContent===${JSON.stringify(currentTitle)});return card?[...card.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(caption)}):null;})()`;
  await touch(sel('Details'),'Details');
  await touch(sel('Edit'),'Edit');
  await evalJS(`(()=>{const el=document.querySelector('#track08AndroidHost form.df-form input[type=text]');el.value='DF08 unsaved after ACK reject';el.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await touch("document.querySelector('#track08AndroidHost form.df-form button[type=submit]')",'Save ACK rejected');
  const result=await evalJS(`(()=>({draft:document.querySelector('#track08AndroidHost form.df-form input[type=text]')?.value,
    task:DF22Integration.getSnapshot().tasksList.find(t=>t.id===${report.fixture_id})}))()`);
  assert.equal(result.draft,'DF08 unsaved after ACK reject');
  assert.equal(result.task.title,currentTitle);assert.equal(Object.hasOwn(result.task,'date'),false);
  const receipt=await nativeReceipt();assert.equal(receipt.valid,true);
  return {draft_retained:true,persisted_unchanged:true,ack_rejected:'injected adapter failure; genuine native I/O failure NOT_TESTED'};
 });
}
main().catch(e=>{report.tests.push({name:'bootstrap',status:classify(e),detail:String(e.message||e).slice(0,600)});})
.finally(()=>{try{ws?.close();}catch(_){}; if(output)fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log('TRACK08_ANDROID_REPORT',JSON.stringify(report));
if(report.tests.length!==4||report.tests.some(x=>x.status!=='PASS'))process.exitCode=1;});
