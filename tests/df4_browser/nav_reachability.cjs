'use strict';
// Real desktop-Chromium rendering: fail if a bottom tab exists but cannot be touched.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const ids=['navTasks','navCalendar','navNotes','navTimer','navTraining','navSounds','navAnalytics'];
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:393,height:830}});
  await page.goto(process.env.DF_COMPLETION_URL||'http://127.0.0.1:8770');
  const rows=[];
  for(const lang of ['en','ar','de','fr','ru']){
   for(const width of [320,360,393,430]){
    await page.setViewportSize({width,height:830});
    await page.evaluate(lang=>applyLanguage(lang),lang);
    const measured=await page.evaluate(ids=>ids.map(id=>{
     const n=document.getElementById(id),r=n.getBoundingClientRect();
     const x=r.left+r.width/2,y=r.top+r.height/2;
     const top=document.elementFromPoint(x,y);
     return {id,x,y,left:r.left,right:r.right,width:r.width,hit:!!top&&(n===top||n.contains(top)),
       top:top?.id||top?.className||top?.tagName,viewportWidth:innerWidth,viewportHeight:innerHeight};
    }),ids);
    for(const r of measured)rows.push({lang,width,...r,reachable:r.left>=-1&&r.right<=width+1&&r.width>=32&&r.hit});
   }
  }
  const bad=rows.filter(x=>!x.reachable);
  console.log(JSON.stringify({cases:rows.length,failed:bad.length,examples:bad.slice(0,15)}));
  assert.deepEqual(bad,[], 'Every one of seven nav tabs must be fully hit-testable on compact phones');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
