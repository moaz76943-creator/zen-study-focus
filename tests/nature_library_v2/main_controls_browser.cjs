'use strict';
// Real main-app DOM/media behavior, never human listening or Android evidence.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const assert=require('node:assert/strict');
(async()=>{
 const entry=path.resolve(process.argv[2]||'android/app/src/main/assets/web/index.html');
 const out=path.resolve(process.argv[3]||'/tmp/nature-main-controls');fs.mkdirSync(out,{recursive:true});
 const url=process.env.NATURE_MAIN_URL;
 if(url)assert.ok(['127.0.0.1','localhost'].includes(new URL(url).hostname));
 const executablePath=process.env.CHROME_BIN||['/usr/bin/chromium','/usr/bin/google-chrome'].find(p=>fs.existsSync(p));
 assert.ok(executablePath,'PREREQUISITE_MISSING:Chromium');
 const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox']});
 try{
  const context=await browser.newContext({offline:!url,viewport:{width:393,height:850}});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(url||pathToFileURL(entry).href);
  await page.locator('#navSounds').click();
  await page.waitForFunction(()=>document.getElementById('sec-sounds').classList.contains('active'));
  assert.equal(await page.locator('#soundsGridBox button[data-sound-toggle]').count(),2,
   'Main app playback needs real keyboard-accessible buttons, not clickable div cards');
  await page.evaluate(()=>{
   window.natureObserved=[];window.natureRealPlay=HTMLMediaElement.prototype.play;
   HTMLMediaElement.prototype.play=function(){this.muted=true;window.natureObserved.push(this);return window.natureRealPlay.call(this);};
  });
  const languages=await page.evaluate(()=>LANG_CATALOG.map(x=>x.code)),checks=[],layouts=[];
  assert.equal(languages.length,20);
  for(const lang of languages){
   await page.evaluate(code=>applyLanguage(code),lang);
   const labels=await page.evaluate(code=>DeepFocusNatureLibraryV2.messages[code],lang);
   if(lang!=='en')assert.notEqual(labels.blocked,await page.evaluate(()=>DeepFocusNatureLibraryV2.messages.en.blocked),'Non-English locale silently fell back to English');
   const button=page.locator('[data-sound-toggle="forest"]');
   assert.ok((await button.getAttribute('aria-label')).startsWith(labels.play+': '),lang);
   await button.focus();await page.keyboard.press('Enter');
   await page.waitForFunction(()=>window.natureObserved.at(-1)?.currentTime>.15);
   assert.equal(await button.getAttribute('aria-pressed'),'true');
   assert.ok((await button.getAttribute('aria-label')).startsWith(labels.stop+': '));
   assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('data-sound-toggle')),'forest','Re-render lost keyboard focus');
   await page.keyboard.press('Space');
   assert.equal(await button.getAttribute('aria-pressed'),'false');
   assert.equal(await page.evaluate(()=>Object.keys(activePlayers).length),0);
   const slider=page.locator('#soundsGridBox input[type=range]').first();
   await slider.focus();await page.keyboard.press('ArrowRight');
   assert.equal(await page.evaluate(()=>Object.keys(activePlayers).length),0,'Volume accidentally started playback');
   assert.match(await page.locator('.stile-volume-pct').first().textContent(),/^[0-9]+%$/);
   assert.equal(await page.locator('.stile-volume-pct').first().getAttribute('dir'),'ltr');
   await page.evaluate(()=>toggleSoundTile('earth'));
   assert.equal(await page.locator('#toastText').textContent(),labels.blocked,lang+' blocked message');
   await page.evaluate(()=>{window.natureNormalPlay=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=()=>Promise.reject(new Error('Injected rejection'));});
   await button.click();await page.waitForFunction(()=>Object.keys(activePlayers).length===0);
   assert.equal(await page.locator('#toastText').textContent(),labels.unavailable,lang+' failure message');
   await page.evaluate(()=>{HTMLMediaElement.prototype.play=window.natureNormalPlay;});
   for(const width of [320,360,393,430])for(const size of [16,32]){
    await page.setViewportSize({width,height:850});await page.evaluate(size=>{document.documentElement.style.fontSize=size+'px';},size);
    const geometry=await page.locator('#soundsGridBox').evaluate(box=>[...box.querySelectorAll('button[data-sound-toggle]')].map(b=>{
     const r=b.getBoundingClientRect(),card=b.closest('.sound-Rich-tile'),c=card.getBoundingClientRect();
     return {height:r.height,width:r.width,inCard:r.left>=c.left&&r.right<=c.right&&r.bottom<=c.bottom,overflow:card.scrollWidth>card.clientWidth};
    }));
    assert.ok(geometry.every(g=>g.height>=44&&g.width>=44&&g.inCard&&!g.overflow),JSON.stringify({lang,width,size,geometry}));
    layouts.push({lang,width,size});
   }
   await page.evaluate(()=>{document.documentElement.style.fontSize='16px';});
   await page.setViewportSize({width:393,height:850});checks.push({lang,keyboard:true,blocked:true,failure:true});
  }
  assert.deepEqual(await page.evaluate(()=>[...NATURE_APPROVED_FOR_PLAYBACK].sort()),['forest','wind']);
  assert.deepEqual(errors,[]);
  await page.evaluate(()=>applyLanguage('ar'));
  await page.locator('#soundsGridBox').scrollIntoViewIfNeeded();
  await page.waitForTimeout(2500); // Let the genuine failure toast expire naturally.
  await page.screenshot({path:path.join(out,'main-sounds.png')});
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({status:'PASS',sourceSha:process.env.GITHUB_SHA||null,offline:!url,checks,layouts,errors,scope:'Main-app browser, muted actual media; not Android or human review',releaseApproved:false},null,2));
  console.log('MAIN_NATURE_CONTROLS_PASS',checks.length,'languages',layouts.length,'layouts; real keyboard/media, preserved focus, blocked/error translations');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
