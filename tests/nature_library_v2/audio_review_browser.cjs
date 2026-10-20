'use strict';
// Real DOM and packaged recording behavior. Never counts as human listening.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const assert=require('node:assert/strict');
(async()=>{
 const html=path.resolve(process.argv[2]||'audio_candidates/commons_intake/index.html');
 const expected=JSON.parse(fs.readFileSync(path.join(path.dirname(html),"qa_report.json"))).filter(r=>r.status==="QUARANTINED_NOT_APPROVED").length;assert.ok(expected>0&&expected<=20);
 const output=path.resolve(process.argv[3]||'/tmp/deep-focus-audio-browser');fs.mkdirSync(output,{recursive:true});
 const executable=process.env.CHROME_BIN||['/usr/bin/chromium','/usr/bin/google-chrome'].find(f=>fs.existsSync(f));
 assert.ok(executable,'PREREQUISITE_MISSING: Chromium executable');
 const browser=await chromium.launch({executablePath:executable,headless:true,args:['--no-sandbox']});
 try{
  const context=await browser.newContext({offline:true});const page=await context.newPage();let errors=[];
  page.on('pageerror',e=>errors.push(String(e)));await page.goto(pathToFileURL(html).href);
  let layouts=[];
  for(const width of [320,360,393,430])for(const dir of ['rtl','ltr'])for(const size of [16,32]){
   await page.setViewportSize({width,height:850});await page.evaluate(({dir,size})=>{document.documentElement.dir=dir;document.documentElement.style.fontSize=size+'px'},{dir,size});
   const result=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,
    tracks:document.querySelectorAll('audio').length,
    buttons:[...document.querySelectorAll('button')].every(b=>b.getBoundingClientRect().height>=44)}));
   assert.equal(result.overflow,false,JSON.stringify({width,dir,size}));assert.equal(result.tracks,expected);assert.ok(result.buttons);
   layouts.push({width,dir,size,...result});
  }
  await page.setViewportSize({width:360,height:850});await page.evaluate(()=>{document.documentElement.style.fontSize='16px';document.documentElement.dir='rtl';document.querySelectorAll('audio').forEach(a=>a.muted=true);});
  const files=[];
  for(let i=0;i<expected;i++){
   const card=page.locator('.clip[data-playable]').nth(i);await card.locator('[data-play]').click();
   await page.waitForFunction(i=>{const a=document.querySelectorAll('audio')[i];return !a.paused&&a.currentTime>.2&&!a.error},i,{timeout:12000});
   files.push(await card.locator('audio').evaluate(a=>({id:a.dataset.id,src:a.currentSrc,time:a.currentTime})));
   await card.locator('[data-play]').click();assert.ok(await card.locator('audio').evaluate(a=>a.paused));
   await card.locator('[data-stop]').click();assert.ok(await card.locator('audio').evaluate(a=>a.paused&&a.currentTime===0));
  }
  await page.locator('#source-mode').selectOption('loop');
  assert.ok(await page.locator('audio').evaluateAll(all=>all.every(a=>a.src.includes('/loops/')&&a.paused)));
  for(let i=0;i<3;i++)await page.locator('[data-play]').nth(i).click();
  await page.waitForFunction(()=>[...document.querySelectorAll('audio')].filter(a=>!a.paused).length===3);
  const gain=await page.locator('audio').evaluateAll(all=>all.reduce((n,a)=>n+a.volume,0));assert.ok(gain<=.8);
  await page.locator('#master-volume').fill('0');await page.locator('#master-volume').dispatchEvent('input');
  assert.ok(await page.locator('audio').evaluateAll(all=>all.every(a=>a.volume===0)));
  await page.locator('button[onclick="stopAllAudio()"]').click();
  assert.ok(await page.locator('audio').evaluateAll((all,n)=>all.length===n&&all.every(a=>a.paused&&a.currentTime===0),expected));
  // Reject play() deterministically; this is failure injection, not playback proof.
  await page.locator('audio').first().evaluate(a=>{a.play=()=>Promise.reject(new Error('Injected play rejection'));});
  await page.locator('[data-play]').first().click();
  await page.waitForFunction(()=>document.querySelector('[data-track-status]').textContent.includes('failed'));
  await page.screenshot({path:path.join(output,'audio-360-rtl.png')});assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({status:'PASS',sha:process.env.GITHUB_SHA||null,offline:true,layouts,originalPlayback:files,mixCount:3,gain,errors,humanListening:'NOT_TESTED',releaseApproved:false},null,2));
  console.log('AUDIO_REVIEW_BROWSER_PASS',layouts.length,'layouts',files.length,'original recordings; loops/mix/master/rejection controls; not human review');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
