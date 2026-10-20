'use strict';
// Real Chromium mobile-viewport hit testing; Android remains a separate QA gate.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const out=process.env.DF_COMPLETION_EVIDENCE||'/tmp/df-note-mobile';
 fs.mkdirSync(out,{recursive:true});
 const records=[];
 try{
  for(const width of [320,393])for(const height of [440,560])for(const locale of ['ar','en','de']){
   const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,deviceScaleFactor:1});
   const page=await context.newPage();page.setDefaultTimeout(9000);
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   try{
    await page.goto(process.env.DF_COMPLETION_URL||'http://127.0.0.1:8770',{waitUntil:'load'});
    await page.evaluate(l=>applyLanguage(l),locale);
    await page.locator('#navNotes').click();
    await page.locator('#nsNewButton').click();
    const fixture='Visible Save '+locale+' '+width+'x'+height;
    await page.locator('#inpNoteTitle').fill(fixture);
    await page.locator('#inpNoteBody').fill('Unicode ٢ العربية preserved after editing and restart.');
    const geometry=await page.evaluate(()=>{
      const card=document.querySelector('#noteModal .ns-editor');
      card.scrollTop=0;
      const save=document.getElementById('nsSaveButton'),r=save.getBoundingClientRect();
      const x=r.left+r.width/2,y=r.top+r.height/2;
      const hit=document.elementFromPoint(x,y);
      return {x,y,viewportWidth:innerWidth,viewportHeight:innerHeight,
        scrollTop:card.scrollTop,hit:hit===save||save.contains(hit),
        sticky:getComputedStyle(save.parentElement).position,
        footerVisible:!!(r.width>0&&r.height>=40)};
    });
    assert.equal(geometry.sticky,'sticky');
    assert.ok(geometry.footerVisible&&geometry.x>=0&&geometry.x<width&&geometry.y>=0&&geometry.y<height&&geometry.hit,
      'SAVE_UNREACHABLE: '+JSON.stringify({width,height,locale,geometry}));
    await page.locator('#nsSaveButton').click();
    assert.equal(await page.locator('#noteModal').evaluate(x=>x.classList.contains('open')),false);
    assert.equal(await page.evaluate(title=>notesList.filter(n=>n.title===title).length,fixture),1);
    await page.reload();await page.locator('#navNotes').click();
    assert.equal(await page.evaluate(title=>notesList.some(n=>n.title===title&&n.body==='Unicode ٢ العربية preserved after editing and restart.'),fixture),true);
    assert.deepEqual(errors,[]);
    records.push({width,height,locale,status:'PASS',geometry});
   }catch(e){
    records.push({width,height,locale,status:'FAIL',error:e.message});
    await page.screenshot({path:path.join(out,'fail-'+locale+'-'+width+'-'+height+'.png')}).catch(()=>{});
    process.exitCode=1;
   }finally{await context.close();}
  }
 }finally{
  fs.writeFileSync(path.join(out,'notes-viewport.json'),JSON.stringify({environment:'real Chromium mobile viewport/touch emulation',androidAcceptance:'NOT_TESTED',records},null,2));
  console.log(JSON.stringify({total:records.length,pass:records.filter(x=>x.status==='PASS').length,fail:records.filter(x=>x.status==='FAIL').slice(0,8)}));
  await browser.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
