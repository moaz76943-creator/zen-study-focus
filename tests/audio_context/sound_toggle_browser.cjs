'use strict';
// Real Chromium keyboard/focus regression for the production sound renderer.
// Audio output is a boundary fake: this does not certify media or Android playback.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const web=path.resolve(__dirname,'../../android/app/src/main/assets/web');
const app=fs.readFileSync(path.join(web,'app.js'),'utf8');
const audio=app.slice(app.indexOf('const SOUNDS_DATA = ['),app.indexOf('\n/* ========================================================\n   8. ANALYTICS'));
const html=fs.readFileSync(path.join(web,'index.html'),'utf8');
const styles=[...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(x=>x[1]).join('\n')+'\n'+fs.readFileSync(path.join(web,'white_2100.css'),'utf8');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  for(const lang of ['en','ar','de'])for(const width of [320,430]){
   const page=await browser.newPage({viewport:{width,height:830}});
   await page.setContent('<style>'+styles+'</style><section id="sec-sounds"><div id="soundsGridBox" class="sounds-photo-grid"></div></section>');
   await page.addScriptTag({content:`var cfg={lang:${JSON.stringify(lang)}};var plays=0,pauses=0;
    function L(){return {sounds:{rain:'Rain',ocean:'Ocean'}};}
    function escapeHtmlText(v){return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');}
    function toWest(v){return v;}function showToast(){}
    window.Audio=class {play(){plays++;return Promise.resolve();}pause(){pauses++;}};`});
   await page.addScriptTag({path:path.join(web,'js/locale_audio_settings_bridge.js')});
   await page.addScriptTag({content:audio+'\nrenderSoundsStudio();'});
   const control=page.locator('.sound-Rich-tile').first().locator('.stile-play-btn');
   assert.equal(await control.evaluate(el=>el.tagName),'BUTTON','native sound toggle required');
   const size=await control.boundingBox();assert.ok(size.width>=44&&size.height>=44,'44px sound target');
   await control.focus();await page.keyboard.press('Enter');
   assert.equal(await page.evaluate(()=>plays),1,'Enter starts exactly once');
   assert.equal(await control.getAttribute('aria-pressed'),'true');
   assert.equal(await control.evaluate(el=>document.activeElement===el),true,'focus survives start render');
   await page.keyboard.press('Space');
   assert.equal(await page.evaluate(()=>pauses),1,'Space stops exactly once');
   assert.equal(await control.getAttribute('aria-pressed'),'false');
   assert.equal(await control.evaluate(el=>document.activeElement===el),true,'focus survives stop render');
   const slider=page.locator('.sound-Rich-tile').first().locator('input');
   await slider.focus();await page.keyboard.press('ArrowLeft');
   await slider.click();
   assert.equal(await page.evaluate(()=>plays),1,'volume keyboard must not start audio');
   await control.click();
   assert.equal(await page.evaluate(()=>plays),2,'pointer click starts exactly once');
   assert.equal(await control.evaluate(el=>document.activeElement===el),true,'focus survives pointer render');
   await page.close();
  }
  console.log('PASS: six EN/AR/DE 320/430 Chromium sound-toggle keyboard/focus/target scenarios');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
