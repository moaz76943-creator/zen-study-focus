'use strict';
const http=require('node:http'),fs=require('node:fs'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function getList(){
 return new Promise((resolve,reject)=>{
  const req=http.get('http://127.0.0.1:9225/json/list',res=>{
   let buf='';res.setEncoding('utf8');res.on('data',s=>buf+=s);res.on('end',()=>{try{resolve(JSON.parse(buf));}catch(e){reject(e);}});
  });
  req.on('error',reject);req.setTimeout(3500,()=>req.destroy(Error('DevTools timeout')));
 });
}
function assertProgress(before,after){
 assert.equal(after.length,before.length,'Missing track progress evidence');
 assert.equal(new Set(after.map(x=>x.id)).size,after.length,'Duplicate track evidence');
 for(const old of before){const current=after.find(x=>x.id===old.id);
  assert.ok(current&&Number.isFinite(current.progress)&&Number.isFinite(old.progress)&&current.progress-old.progress>.2,'Frozen or invalid track progress: '+old.id);
 }
 return true;
}
function assertRealtimeProgress(before,after,sample){
 assert.ok(before.length>0,'No lifecycle tracks were observed');
 assert.ok(Number.isFinite(sample.seconds)&&sample.seconds>=18,'Lifecycle observation was too short');
 assert.equal(sample.active,before.length,'A lifecycle track stopped');
 assert.ok(Number.isFinite(sample.gain)&&sample.gain>=0&&sample.gain<=.800001,'Unsafe mixed gain');
 assert.deepEqual(sample.errors,[]);
 const normalized=after.map(current=>{
   const old=before.find(row=>row.id===current.id);
   assert.ok(old&&Number.isFinite(old.duration)&&old.duration>sample.seconds,'Multiple loop wraps cannot be inferred');
   assert.equal(current.duration,old.duration,'Lifecycle source changed');
   return {...current,progress:current.progress+(current.progress<old.progress?old.duration:0)};
 });
 assertProgress(before,normalized);
 for(const old of before)assert.ok(normalized.find(row=>row.id===old.id).progress-old.progress>=sample.seconds-1.5,'Playback stalled during lifecycle observation');
 return true;
}
function assertLifecycle(phase,before,after,sample){
 assert.ok(['background','screenOff'].includes(phase));
 assert.equal(sample.visibility,'hidden','App did not actually leave the foreground');
 if(phase==='screenOff')assert.equal(sample.wakefulness,'Asleep','Display sleep was not observed');
 return assertRealtimeProgress(before,after,sample);
}
async function main(){
 const expected=Number(process.env.AUDIO_QA_EXPECTED_TRACKS);assert.ok(Number.isInteger(expected)&&expected>0&&expected<=20);
 let page;
 for(let t=0;t<30;t++){
  try{const pages=await getList();page=pages.find(p=>p.type==='page'&&p.url==='file:///android_asset/web/audio_review/index.html');if(page)break;}catch(_){}
  await sleep(500);
 }
 assert.ok(page,'The QA app failed to show its actual sound-library WebView');
 const addr=new URL(page.webSocketDebuggerUrl);
 assert.ok(['127.0.0.1','localhost'].includes(addr.hostname));
 addr.hostname='127.0.0.1';addr.port='9225';
 const ws=new WebSocket(addr.toString());
 await new Promise((resolve,reject)=>{
  const t=setTimeout(()=>reject(Error('QA WebView CDP connect timeout')),7000);
  ws.addEventListener('open',()=>{clearTimeout(t);resolve();},{once:true});
  ws.addEventListener('error',()=>{clearTimeout(t);reject(Error('QA WebView CDP connect error'));},{once:true});
 });
 let id=0;
 function evalJs(expression){
  return new Promise((resolve,reject)=>{
   const current=++id;
   const onMessage=e=>{
    const j=JSON.parse(e.data);if(j.id!==current)return;
    clearTimeout(timer);ws.removeEventListener('message',onMessage);
    if(j.error||j.result?.exceptionDetails)reject(Error('CDP evaluation failed'));
    else resolve(j.result?.result?.value);
   };
   const timer=setTimeout(()=>{ws.removeEventListener('message',onMessage);reject(Error('CDP evaluation timed out'));},12000);
   ws.addEventListener('message',onMessage);
   ws.send(JSON.stringify({id:current,method:'Runtime.evaluate',params:{expression,awaitPromise:true,returnByValue:true}}));
  });
 }
 try{
  let state=null;
  const expression='(() => {const a=[...document.querySelectorAll("audio")];const names=a.map(x=>decodeURIComponent(new URL(x.currentSrc||x.src).pathname.split("/").pop()));return {ready:document.readyState,url:location.href,visible:document.visibilityState,count:a.length,groups:[...document.querySelectorAll("[data-sound-group]")].map(x=>x.getAttribute("data-sound-group")),uniqueNames:new Set(names).size,buildSha:document.querySelector("meta[name=deep-focus-source-sha]")?.content,nativeBridge:typeof window.ZenNative!=="undefined"};})()';
  for(let i=0;i<18;i++){state=await evalJs(expression);if(state.ready==='complete'&&state.count===expected)break;await sleep(400);}
  assert.equal(state.url,'file:///android_asset/web/audio_review/index.html');
  assert.equal(state.visible,'visible');
  assert.equal(state.ready,'complete');
  assert.equal(state.count,expected);
  assert.equal(state.uniqueNames,expected);
  assert.equal(state.groups.length,6);
  assert.equal(state.nativeBridge,false,'Privileged data bridge must not be in Audio QA');
  assert.equal(state.buildSha,process.env.GITHUB_SHA,'Installed QA page is not stamped with this source SHA');
  const traces=[];
  async function tap(selector){
    await evalJs(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center'})`);
    await sleep(250);
    execFileSync('adb',['shell','uiautomator','dump','/sdcard/audio20.xml'],{timeout:15000});
    const xml=execFileSync('adb',['shell','cat','/sdcard/audio20.xml'],{encoding:'utf8',timeout:5000});
    const node=xml.match(/<node[^>]*class="android\.webkit\.WebView"[^>]*>/);
    assert.ok(node,'WebView frame unavailable: TEST_TRANSPORT_FAILURE');
    const bounds=node[0].match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
    assert.ok(bounds,'WebView bounds unavailable: TEST_TRANSPORT_FAILURE');
    const [left,top,right,bottom]=bounds.slice(1).map(Number);
    const pos=await evalJs(`(()=>{const e=document.querySelector(${JSON.stringify(selector)}),r=e.getBoundingClientRect();const x=r.left+r.width/2,y=r.top+r.height/2;return {x,y,w:innerWidth,h:innerHeight,hit:e.contains(document.elementFromPoint(x,y))};})()`);
    assert.ok(pos.hit&&pos.x>0&&pos.y>0&&pos.x<pos.w&&pos.y<pos.h,'Blocked control');
    const sx=(right-left)/pos.w,sy=(bottom-top)/pos.h;
    assert.ok(Math.abs(sx-sy)/Math.max(sx,sy)<.025,'Stale frame scale: TEST_TRANSPORT_FAILURE');
    const x=Math.round(left+pos.x*sx),y=Math.round(top+pos.y*sy);
    execFileSync('adb',['shell','input','tap',String(x),String(y)],{timeout:5000});
    traces.push({selector,x,y});
  }
  await evalJs(`(()=>{window.audioQaErrors=[];document.querySelectorAll('audio').forEach(a=>{a.muted=true;a.addEventListener('error',()=>audioQaErrors.push({id:a.dataset.id,code:a.error?.code}));});})()`);
  const originals=[];
  for(let i=0;i<expected;i++){
    // Groups reset nth-of-type; address the actual flattened card index instead.
    await evalJs(`document.querySelectorAll('.clip[data-playable]')[${i}].setAttribute('data-testing','current')`);
    await tap('[data-testing="current"] [data-play]');
    await sleep(1100);
    const observed=await evalJs(`(()=>{const a=document.querySelectorAll('audio')[${i}];return {id:a.dataset.id,time:a.currentTime,paused:a.paused,error:a.error?.code??null,src:a.currentSrc};})()`);
    assert.ok(!observed.paused&&observed.time>.25&&!observed.error,'Original did not decode/play: '+observed.id);
    originals.push(observed);
    if(i===0){
      await tap('[data-testing="current"] [data-play]');
      assert.ok(await evalJs(`(()=>{const c=document.querySelector('[data-testing="current"]');return c.querySelector('audio').paused&&c.querySelector('[data-track-status]').textContent.includes('Paused');})()`),'Pause button state is misleading');
      await tap('[data-testing="current"] [data-play]');
      await sleep(300);
      assert.ok(await evalJs(`(()=>{const c=document.querySelector('[data-testing="current"]');return !c.querySelector('audio').paused&&c.querySelector('[data-track-status]').textContent.includes('Playing');})()`),'Resume did not restore playing state');
    }
    await tap('[data-testing="current"] [data-stop]');
    const stopped=await evalJs(`(()=>{const a=document.querySelectorAll('audio')[${i}];return a.paused&&a.currentTime===0})()`);
    assert.ok(stopped,'Stop button did not stop/reset actual track');
    await evalJs(`document.querySelector('[data-testing="current"]').removeAttribute('data-testing')`);
  }
  await evalJs(`(()=>{const select=document.getElementById('source-mode');select.value='loop';select.dispatchEvent(new Event('change'));})()`);
  const loops=[];
  for(let i=0;i<expected;i++){
    const decoded=await evalJs(`(async()=>{const a=document.querySelectorAll('audio')[${i}];await a.play();return {duration:a.duration,src:a.currentSrc,id:a.dataset.id};})()`);
    assert.ok(decoded.duration>10&&decoded.src.includes('/loops/'),'Prepared loop missing');
    await evalJs(`document.querySelectorAll('audio')[${i}].currentTime=${decoded.duration}-.2`);
    await sleep(1100);
    const seam=await evalJs(`(()=>{const a=document.querySelectorAll('audio')[${i}];const result={id:a.dataset.id,time:a.currentTime,paused:a.paused,error:a.error?.code??null};a.pause();return result;})()`);
    assert.ok(seam.time>0&&seam.time<2&&!seam.paused&&!seam.error,'Loop wrap failed: '+seam.id);
    loops.push(seam);
  }
  await evalJs(`(async()=>{stopAllAudio();await Promise.all([...document.querySelectorAll('audio')].map(a=>a.play()));})()`);
  await sleep(1200);
  const mix=await evalJs(`(()=>{const a=[...document.querySelectorAll('audio')];return {count:a.length,active:a.filter(x=>!x.paused&&!x.error).length,gain:a.reduce((n,x)=>n+x.volume,0)};})()`);
  assert.equal(mix.active,expected);assert.ok(mix.gain<=.800001);
  await evalJs(`(()=>{const master=document.getElementById('master-volume');master.value=0;master.dispatchEvent(new Event('input'));})()`);
  assert.ok(await evalJs(`[...document.querySelectorAll('audio')].every(a=>a.volume===0)`),'Master zero is not silence');
  await evalJs(`(()=>{document.getElementById('master-volume').value=60;rebalance();})()`);
  // Optional real wall-time endurance. Not accelerated, not a listening verdict.
  const enduranceSeconds=Number(process.env.AUDIO_QA_ENDURANCE_SECONDS||0);
  assert.ok([0,1800].includes(enduranceSeconds),'Unbounded endurance duration rejected');
  const checkpoints=[];
  const progressExpression=`(()=>{const a=[...document.querySelectorAll('audio')];return a.map(x=>({id:x.dataset.id,progress:x._qaProgress||0}));})()`;
  await evalJs(`(()=>{document.querySelectorAll('audio').forEach(a=>{
    a._qaProgress=0;let previous=a.currentTime;
    a.addEventListener('timeupdate',()=>{const current=a.currentTime;let delta=current-previous;
      if(delta<0&&previous>a.duration-1&&current<1)delta=a.duration-previous+current;
      if(Number.isFinite(delta)&&delta>0)a._qaProgress+=delta;previous=current;
    });
  });})()`);
  const lifecycle={background:{status:'NOT_TESTED'},screenOff:{status:'NOT_TESTED'}};
  const realtimeComparisons=[];
  if(process.env.AUDIO_QA_LIFECYCLE==='1'){
    // The emulator has no proven audible output/headset. Unmuting requests the
    // normal media path; observed progress is not a human listening verdict.
    const foreground=async()=>{
      execFileSync('adb',['shell','input','keyevent','224']);
      execFileSync('adb',['shell','wm','dismiss-keyguard']);
      execFileSync('adb',['shell','am','start','-n','com.zenstudy.focus.audioqa/com.zenstudy.focus.MainActivity']);
      await sleep(900);
      await evalJs(`document.querySelectorAll('audio').forEach(a=>a.muted=true)`);
    };
    // Compare small and full mixes with identical timing gates. Collect all
    // bounded phases on failure, then fail the run; never reinterpret a slow
    // unmuted sink as a passing background or endurance result.
    let firstFailure;
    for(const trackCount of [...new Set([Math.min(2,expected),expected])]){
      const indices=trackCount===expected?Array.from({length:expected},(_,i)=>i):[0,Math.min(3,expected-1)];
      await evalJs(`(async()=>{const selected=${JSON.stringify(indices)};const a=[...document.querySelectorAll('audio')];a.forEach((x,i)=>{if(!selected.includes(i))x.pause();x.muted=false;});await Promise.all(selected.map(i=>a[i].play()));rebalance();})()`);
      for(const phase of ['foreground','background','screenOff']){
        let observation={trackCount,phase,status:'IN_PROGRESS',scope:'Bounded unmuted headless-emulator media progression; audible output not verified'};
        try{
          await evalJs(`document.querySelectorAll('audio').forEach(a=>a.muted=false)`);
          if(phase!=='foreground')execFileSync('adb',['shell','input','keyevent',phase==='background'?'3':'223']);
          await sleep(1000);
          assert.equal(await evalJs('document.visibilityState'),phase==='foreground'?'visible':'hidden','Unexpected Activity visibility');
          if(phase==='screenOff')assert.match(execFileSync('adb',['shell','dumpsys','power'],{encoding:'utf8'}),/mWakefulness=Asleep/);
          const nativeTimes=`${JSON.stringify(indices)}.map(i=>{const a=document.querySelectorAll('audio')[i];return {id:a.dataset.id,progress:a.currentTime,duration:a.duration}})`;
          const before=await evalJs(nativeTimes),began=performance.now();
          await sleep(18000);
          const power=execFileSync('adb',['shell','dumpsys','power'],{encoding:'utf8',timeout:10000});
          const sample=await evalJs(`(()=>{const a=[...document.querySelectorAll('audio')];return {visibility:document.visibilityState,active:a.filter(x=>!x.paused&&!x.error).length,gain:a.reduce((n,x)=>n+(x.paused?0:x.volume),0),muted:a.some(x=>!x.paused&&x.muted),errors:audioQaErrors};})()`);
          sample.wakefulness=power.match(/mWakefulness=(\w+)/)?.[1]||'UNKNOWN';
          sample.seconds=(performance.now()-began)/1000;
          const after=await evalJs(nativeTimes);
          observation={...observation,sample,before,after};
          assert.equal(sample.muted,false,'Diagnostic media remained muted');
          assert.equal(sample.active,trackCount,'Requested mix did not remain active');
          if(phase==='foreground'){assert.equal(sample.visibility,'visible');assertRealtimeProgress(before,after,sample);}
          else assertLifecycle(phase,before,after,sample);
          observation.status='PASS';
          console.log('AUDIO20_REALTIME_PASS',trackCount,phase,sample.seconds);
        }catch(error){
          observation={...observation,status:'FAIL',detail:String(error)};firstFailure=firstFailure||error;
          console.log('AUDIO20_REALTIME_FAIL',trackCount,phase,String(error));
        }finally{
          if(process.argv[2]){
            try{
              const destination=require('node:path').join(require('node:path').dirname(process.argv[2]),`audioflinger-${trackCount}-${phase}.txt`);
              fs.writeFileSync(destination,execFileSync('adb',['shell','dumpsys','media.audio_flinger'],{encoding:'utf8',timeout:10000}));
              observation.audioFlingerEvidence=require('node:path').basename(destination);
            }catch(error){observation.diagnosticCaptureError=String(error);}
          }
          realtimeComparisons.push(observation);
          if(trackCount===expected&&phase!=='foreground')lifecycle[phase]=observation;
          const persist=()=>{if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify({status:firstFailure?'FAIL':'IN_PROGRESS',state,originals,loops,mix,traces,lifecycle,realtimeComparisons,endurance:{seconds:0,requested:enduranceSeconds,status:'NOT_TESTED'},approved_for_release:false},null,2));};
          persist();
          try{
            await foreground();
            assert.equal(await evalJs('document.visibilityState'),'visible','App did not return to foreground');
          }catch(error){
            observation.recoveryFailure=String(error);observation.status='FAIL';firstFailure=firstFailure||error;persist();
            // Further measurements are invalid without recovered foreground.
            throw firstFailure;
          }
        }
      }
    }
    if(firstFailure)throw firstFailure;
    await evalJs(`(async()=>{await Promise.all([...document.querySelectorAll('audio')].map(a=>a.play()));rebalance();})()`);
  }

  let priorProgress=await evalJs(progressExpression);
  const started=performance.now();
  while(performance.now()-started<enduranceSeconds*1000){
    await sleep(Math.min(30000,Math.max(0,enduranceSeconds*1000-(performance.now()-started))));
    const checkpoint=await evalJs(`(()=>{const a=[...document.querySelectorAll('audio')];return {visibility:document.visibilityState,active:a.filter(x=>!x.paused&&!x.error).length,tracks:a.map(x=>({id:x.dataset.id,time:x.currentTime,error:x.error?.code??null})),gain:a.reduce((n,x)=>n+x.volume,0),errors:audioQaErrors};})()`);
    checkpoint.elapsedSeconds=(performance.now()-started)/1000;
    const progress=await evalJs(progressExpression);
    assertProgress(priorProgress,progress);priorProgress=progress;
    checkpoint.progress=progress;
    assert.equal(checkpoint.active,expected,'A track stopped during endurance');
    assert.equal(checkpoint.visibility,'visible','Foreground endurance unexpectedly left the foreground');
    assert.ok(checkpoint.gain<=.800001);assert.deepEqual(checkpoint.errors,[]);
    checkpoints.push(checkpoint);
    if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify({status:'IN_PROGRESS',state,originals,loops,mix,traces,lifecycle,realtimeComparisons,checkpoints,approved_for_release:false},null,2));
    console.log('AUDIO20_ENDURANCE_CHECK',Math.round(checkpoint.elapsedSeconds),checkpoint.active);
  }
  const enduranceElapsedSeconds=(performance.now()-started)/1000;
  await tap('button[onclick="stopAllAudio()"]');
  assert.ok(await evalJs(`[...document.querySelectorAll('audio')].every(a=>a.paused&&a.currentTime===0)`));
  assert.deepEqual(await evalJs('audioQaErrors'),[]);
  // Deterministic play-promise failure injection is not real decoder-failure proof.
  await evalJs(`(()=>{const a=document.querySelector('audio');a._qaRealPlay=a.play;a.play=()=>Promise.reject(new Error('Injected play rejection'));})()`);
  await tap('.clip[data-playable] [data-play]');
  assert.ok(await evalJs(`document.querySelector('[data-track-status]').textContent.includes('failed')`),'Injected failure not shown');
  await evalJs(`(()=>{const m=document.getElementById('master-volume');m.value=40;m.dispatchEvent(new Event('input'));})()`);
  assert.ok(await evalJs(`document.querySelector('[data-track-status]').textContent.includes('failed')`),'Master update hid unresolved playback failure');
  await evalJs(`(()=>{const a=document.querySelector('audio');a.play=a._qaRealPlay;})()`);
  await tap('.clip[data-playable] [data-play]');
  await sleep(1100);
  assert.ok(await evalJs(`(()=>{const a=document.querySelector('audio');return !a.paused&&a.currentTime>.25&&document.querySelector('[data-track-status]').textContent.includes('Playing');})()`),'Actual retry failed to recover playback state');
  await tap('.clip[data-playable] [data-stop]');
  assert.ok(await evalJs(`document.querySelector('[data-track-status]').textContent.includes('Stopped')`),'Stop did not reset playback state');
  const result={status:'ANDROID_AUDIO_QA_ALL_ORIGINALS_LOOPS_CONTROLS_PASS',state,originals,loops,mix,traces,
    playbackStateControls:{pause:true,resume:true,stop:true,injectedFailureRetained:true,actualRetryRecovered:true},
    endurance:{seconds:enduranceElapsedSeconds,requested:enduranceSeconds,checkpoints,status:enduranceSeconds===1800?'PASS':'NOT_TESTED'},
    scope:'Foreground muted decode and ADB controls; optional bounded unmuted lifecycle progression, not audible-output or human listening approval',
    realtimeComparisons,background:lifecycle.background,screenOff:lifecycle.screenOff,lockedScreen:'NOT_TESTED_SECURE_LOCK',bluetooth:'NOT_TESTED',physicalDevice:'DEVICE_NOT_TESTED',approved_for_release:false};
  if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(result,null,2));
  console.log(JSON.stringify({status:result.status,tracks:state.count,originals:originals.length,loops:loops.length,endurance:result.endurance.status}));
 }finally{ws.close();}
}
function resultSummary(first,reopened){
 assert.equal(first.status,'ANDROID_AUDIO_QA_ALL_ORIGINALS_LOOPS_CONTROLS_PASS');
 assert.equal(reopened.status,'ANDROID_AUDIO_QA_ALL_ORIGINALS_LOOPS_CONTROLS_PASS');
 const e=first.endurance;
 assert.ok(e&&[0,1800].includes(e.requested)&&Number.isFinite(e.seconds)&&e.seconds>=0,'Invalid endurance evidence');
 assert.equal(e.status,e.requested===0?'NOT_TESTED':'PASS','Contradictory endurance status');
 if(e.requested===1800)assert.ok(e.seconds>=1800,'Endurance was shorter than requested');
 const phaseStatus=key=>typeof first[key]==='object'?first[key].status:'NOT_TESTED';
 const background=phaseStatus('background'),screenOff=phaseStatus('screenOff');
 assert.ok([background,screenOff].every(status=>['PASS','NOT_TESTED'].includes(status)),'Contradictory lifecycle summary');
 return 'QA_VISIBLE_WEBVIEW=PASS\nELIGIBLE_QA_TRACKS=PASS\nSIX_GROUPS=PASS\nELIGIBLE_ORIGINALS_AND_LOOP_WRAPS=PASS\nADB_PLAY_STOP_CONTROLS=PASS\nTHIRTY_MINUTE_MUTED_DECODE_MIX='+e.status+'\nBOUNDED_BACKGROUND_MEDIA_PROGRESS='+background+'\nBOUNDED_SCREEN_OFF_MEDIA_PROGRESS='+screenOff+'\nAUDIBLE_OUTPUT_AND_SECURE_LOCK=NOT_TESTED\nBLUETOOTH=NOT_TESTED\nREAL_ANDROID_OWNER_DEVICE=NOT_TESTED\nRELEASE_APPROVED=NO\n';
}
if(require.main===module){
 if(process.argv[2]==='--summary'){
  const path=require('node:path'),dir=process.argv[3];
  const first=JSON.parse(fs.readFileSync(path.join(dir,'qa-audio20-cdp.json')));
  const reopened=JSON.parse(fs.readFileSync(path.join(dir,'qa-audio20-reopen-cdp.json')));
  fs.writeFileSync(path.join(dir,'qa-audio20-result.txt'),resultSummary(first,reopened));
 }else main().catch(e=>{console.error('AUDIO20_WEBVIEW_FAIL:',String(e));process.exitCode=1;});
}
module.exports={assertProgress,assertRealtimeProgress,assertLifecycle,resultSummary};
