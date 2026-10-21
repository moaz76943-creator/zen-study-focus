'use strict';
// Chromium simulation of Android's smaller visualViewport while layout viewport
// stays tall. Real API30 keyboard/ADB acceptance is a separate required gate.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
(async()=>{
 const out=process.env.DF_NOTE_IME_EVIDENCE||'/tmp/deep-focus-note-ime';
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const results=[];
 try {
  for(const width of [320,393])for(const language of ['en','ar']){
   const ctx=await browser.newContext({viewport:{width,height:820},isMobile:true,hasTouch:true,deviceScaleFactor:1});
   const page=await ctx.newPage();
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   try {
    await page.goto(process.env.DF_NOTE_IME_URL||'http://127.0.0.1:8770/index.html',{waitUntil:'load'});
    await page.evaluate(locale=>applyLanguage(locale),language);
    await page.locator('#navNotes').click();
    await page.locator('#nsNewButton').click();
    const title='Visual viewport Android QA '+width+' '+language;
    await page.locator('#inpNoteTitle').fill(title);
    const before=await page.evaluate(()=>{
      const modal=document.getElementById('noteModal');
      modal.style.setProperty('--nsux-height','378px');
      modal.style.setProperty('--nsux-top','0px');
      const r=modal.getBoundingClientRect();
      return {top:r.top,bottom:r.bottom};
    });
    assert.ok(before.top>=0&&before.bottom<=379,'NOTE_OVERLAY_BELOW_IME '+JSON.stringify(before));
    const body=page.locator('#inpNoteBody');
    await body.scrollIntoViewIfNeeded();
    const target=await page.evaluate(()=>{
      const r=document.getElementById('inpNoteBody').getBoundingClientRect();
      const x=r.left+r.width/2,y=r.top+r.height/2;
      const hit=document.elementFromPoint(x,y),n=document.getElementById('inpNoteBody');
      return {x,y,width:r.width,height:r.height,hit:hit===n||n.contains(hit)};
    });
    assert.ok(target.hit&&target.y>=0&&target.y<378,'NOTE_BODY_UNREACHABLE '+JSON.stringify(target));
    await body.fill('Real stored note under simulated keyboard Unicode ٢');
    const save=page.locator('#nsSaveButton');
    await save.scrollIntoViewIfNeeded();
    const saveGeo=await page.evaluate(()=>{
      const n=document.getElementById('nsSaveButton'),r=n.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
      return {x,y,hit:document.elementFromPoint(x,y)===n};
    });
    assert.ok(saveGeo.hit&&saveGeo.y>=0&&saveGeo.y<378,'NOTE_SAVE_UNREACHABLE '+JSON.stringify(saveGeo));
    await save.click();
    assert.equal(await page.evaluate(t=>notesList.filter(n=>n.title===t&&n.body==='Real stored note under simulated keyboard Unicode ٢').length,title),1);
    assert.deepEqual(errors,[]);
    results.push({width,language,status:'PASS',overlay:before,body:target,save:saveGeo});
   }catch(error){results.push({width,language,status:'FAIL',error:error.message});
    await page.screenshot({path:path.join(out,'fail-'+width+'-'+language+'.png')}).catch(()=>{});
    process.exitCode=1;
   }finally{await ctx.close();}
  }
 }finally{
  fs.writeFileSync(path.join(out,'note-ime-viewport.json'),JSON.stringify({environment:'Chromium simulated visualViewport height 378px',actualAndroid:'NOT_TESTED',results},null,2));
  console.log(JSON.stringify({cases:results.length,pass:results.filter(x=>x.status==='PASS').length,fail:results.filter(x=>x.status==='FAIL').map(x=>x.error)}));
  await browser.close();
 }
})().catch(e=>{console.error(e.message);process.exitCode=1;});
