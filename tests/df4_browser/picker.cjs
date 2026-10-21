'use strict';
// Optional desktop Chromium verification; never label this Android/WebView QA.
// Browser plugin not available. Uses existing Playwright, no project dependency added.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {join}=require('node:path');
const L=require('../../android/app/src/main/assets/web/completion_alert_locales.js');
(async()=>{
 const url=process.env.DF4_TEST_URL||'http://127.0.0.1:8765/index.html';
 const out=process.env.DF4_EVIDENCE_DIR||'/workspace/scratch/df4-browser';fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.DF4_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const results=[];
 try {
  const context=await browser.newContext({viewport:{width:360,height:800}});
  // Fresh context, no cache/service worker; deny every external network dependency.
  await context.route('**/*',route=>new URL(route.request().url()).origin===new URL(url).origin?route.continue():route.abort());
  const page=await context.newPage(),errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))failed.push({url:r.url(),status:r.status()});});
  await page.goto(url);assert.match(await page.title(),/Deep Focus/);
  assert.ok((await page.locator('body').innerText()).includes('Deep Focus'));
  await page.locator('#navSounds').click();
  for(const locale of L.languages){
   await page.evaluate(lang=>applyLanguage(lang),locale);
   const picker=page.locator('#completionAlertPickerHost');
   assert.equal(await picker.locator('h3').innerText(),L.translate(locale,'completionAlerts.title'));
   assert.equal(await picker.getAttribute('aria-label'),L.translate(locale,'completionAlerts.title'));
   assert.equal(await picker.locator('input[type=radio]').count(),6);
   assert.equal(await picker.locator('button').count(),5);
   assert.equal(await picker.locator('input[type=radio]:checked').count(),1);
   assert.equal(await picker.locator('legend').innerText(),L.translate(locale,'completionAlerts.choose'));
   for(const key of ['silent','soft-bell','wood-tap','water-drop','muted-metal','two-taps'])
    assert.equal(await picker.locator(`input[value="${key}"]`).locator('..').locator('span').innerText(),L.translate(locale,'completionAlerts.'+key));
   results.push({locale,status:'PASS',scope:'rendered picker strings/radios'});
  }
  for(const locale of ['ar','en','de','fr','ru'])for(const width of [320,360,393,430])for(const scale of [1,2]){
   await page.setViewportSize({width,height:900});await page.evaluate(({locale,scale})=>{applyLanguage(locale);document.documentElement.style.fontSize=16*scale+'px';},{locale,scale});
   const metrics=await page.locator('.completion-alert-picker').evaluate(root=>{
    const box=root.getBoundingClientRect(),rows=[...root.querySelectorAll('.completion-alert-option')];
    return {overflow:root.scrollWidth>root.clientWidth+1,rows:rows.map(row=>{const label=row.querySelector('label').getBoundingClientRect(),button=row.querySelector('button')?.getBoundingClientRect();return {inside:label.left>=box.left-1&&label.right<=box.right+1,overlap:button&&Math.min(label.right,button.right)-Math.max(label.left,button.left)>1,height:button?.height||44};})};
   });
   assert.equal(metrics.overflow,false,JSON.stringify({locale,width,scale,metrics}));
   assert.ok(metrics.rows.every(r=>r.inside&&!r.overlap&&r.height>=44));
   results.push({locale,width,scale,status:'PASS',scope:'picker layout'});
  }
  await page.evaluate(()=>{applyLanguage('ar');document.documentElement.style.fontSize='16px';});await page.setViewportSize({width:360,height:800});
  const picker=page.locator('#completionAlertPickerHost');
  await picker.locator('input[value="wood-tap"]').check();
  await picker.locator('input[type=range]').fill('42');await picker.locator('input[type=range]').dispatchEvent('change');
  assert.equal(await picker.locator('output').innerText(),'42%');
  await page.reload();await page.locator('#navSounds').click();
  assert.equal(await picker.locator('input[value="wood-tap"]').isChecked(),true);
  assert.equal(await picker.locator('input[type=range]').inputValue(),'42');
  // Observe real media objects, retaining the native play implementation.
  await page.evaluate(()=>{window.df4Media=[];const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){window.df4Media.push(this);return play.call(this);};});
  await picker.locator('.completion-alert-preview').nth(0).click();
  try {
   await page.waitForFunction(()=>window.df4Media.length===1,null,{timeout:6000});
  } catch(e) {
   // Fail closed with real browser evidence; do not mock media.play().
   const diagnostic=await page.evaluate(()=>({
    capturedMedia:window.df4Media?.length??null,
    visibility:document.visibilityState,
    enginePresent:!!window.DFRecoveryCompletion,
    settings:window.DFRecoveryCompletion?.getSettings?.()||null,
    firstPreviewDisabled:document.querySelector('.completion-alert-preview')?.disabled,
    media:window.df4Media?.map(x=>({src:x.currentSrc,readyState:x.readyState,paused:x.paused,error:x.error?.code||null}))
   }));
   fs.writeFileSync(join(out,'first-preview-failure.json'),JSON.stringify({stage:'actual-browser-first-preview',diagnostic},null,2)+'\n');
   throw new Error('FIRST_COMPLETION_PREVIEW_NOT_STARTED '+JSON.stringify(diagnostic)+'; '+e.message);
  }
  await picker.locator('.completion-alert-preview').nth(1).click();
  // Wait for genuine decoded media instead of guessing fixed CI timing.
  // The real HTMLMediaElement.play() method remains in use.
  await page.waitForFunction(()=>
    window.df4Media.length===2 &&
    window.df4Media[1].readyState>=2 &&
    window.df4Media[1].error===null, null, {timeout:10000});
  const media=await page.evaluate(()=>window.df4Media.map(a=>({paused:a.paused,error:a.error?.code||null,ready:a.readyState})));
  assert.equal(media.length,2);assert.equal(media[0].paused,true);assert.equal(media[1].error,null);assert.ok(media[1].ready>=2);
  await picker.locator('input[value="silent"]').check();assert.equal(await page.evaluate(()=>window.df4Media.every(a=>a.paused)),true);
  assert.equal(await picker.locator('input[type=radio]:checked').count(),1);
  await picker.scrollIntoViewIfNeeded();await page.screenshot({path:join(out,'picker-ar-360.png')});
  results.push({status:'PASS',scope:'persist selection/volume after reload; actual desktop media decode, exclusive preview, silent cancellation'});
  await page.locator('[data-sound-category="warm"]').click();
  for(const locale of L.languages){
   await page.evaluate(lang=>applyLanguage(lang),locale);
   assert.equal(await page.locator('#soundsGridBox [role="status"]').innerText(),await page.evaluate(()=>L().natureNoApproved));
   assert.equal(await page.locator('[data-sound-category="warm"] bdi').innerText(),'(0)');
  }
  await page.evaluate(()=>applyLanguage('ar'));
  await page.locator('[data-sound-category="all"]').click();
  // Tap the actual accessible play buttons, not noninteractive tile wrappers.
  await page.locator('.sbg-forest [data-sound-toggle="forest"]').click();
  await page.locator('.sbg-wind [data-sound-toggle="wind"]').click();
  await page.waitForFunction(()=>window.df4Media.slice(-2).every(a=>a.readyState>=2&&!a.paused));
  assert.ok(await page.evaluate(()=>window.df4Media.slice(-2).reduce((sum,a)=>sum+a.volume,0)<=.8500001));
  await page.locator('.sbg-forest input[type=range]').fill('0');
  await page.locator('.sbg-forest input[type=range]').dispatchEvent('input');
  assert.equal(await page.evaluate(()=>window.df4Media.at(-2).volume),0);
  await page.locator('.sbg-forest [data-sound-toggle="forest"]').click();
  assert.ok(await page.evaluate(()=>window.df4Media.at(-2).paused&&!window.df4Media.at(-1).paused));
  await page.locator('#sec-sounds button[onclick="stopAllAudio()"]').click();assert.ok(await page.evaluate(()=>window.df4Media.every(a=>a.paused)));
  await page.locator('[data-sound-category="warm"]').click();
  await page.locator('#soundsGridBox').scrollIntoViewIfNeeded();await page.screenshot({path:join(out,'nature-empty-ar-360.png')});
  results.push({status:'PASS',scope:'empty category localized in 20 locales; real desktop tile taps, independent volume, stop-one, decode and simultaneous mix with gain cap; stop-all button'});
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  results.push({status:'PASS',scope:'bootstrap/console/local asset responses; external network denied'});
  fs.writeFileSync(join(out,'results.json'),JSON.stringify({url,environment:'Desktop Chromium, NOT Android',results,errors,failed},null,2)+'\n');
  console.log(JSON.stringify({checks:results.length,pass:results.length,errors,failed,evidence:out}));
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
