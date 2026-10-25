#!/usr/bin/env node
/* Real, optional Chromium/Playwright layout smoke test. No network access.
 * Run: node tests/i18n/visual/browser_matrix.cjs
 * Screenshots and JSON are generated only by executing this script.
 */
'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {pathToFileURL}=require('node:url');
async function main(){
  let chromium;
  try { ({chromium}=require('playwright')); }
  catch(_){ console.error('NOT_TESTED: playwright + Chromium must be installed locally');process.exitCode=2;return; }
  const url=pathToFileURL(path.resolve(__dirname,'../../../android/app/src/main/assets/web/index.html')).href;
  const out=process.env.DF11_VISUAL_OUT||fs.mkdtempSync(path.join(os.tmpdir(),'df11-visual-'));
  fs.mkdirSync(out,{recursive:true});
  const languages=[
    ['ar','rtl'],['fa','rtl'],['ur','rtl'],['ckb','rtl'],
    ['ps','rtl'],['sd','rtl'],['ug','rtl'],
    ['zh','ltr'],['ja','ltr'],['ko','ltr'],
    ['hi','ltr'],['bn','ltr'],['ru','ltr'],['de','ltr']
  ];
  const widths=[320,360,393,430],zooms=[100,200],failures=[],observations=[];
  const browser=await chromium.launch({headless:true,args:['--allow-file-access-from-files']});
  try{
    for(const width of widths)for(const zoom of zooms)for(const [lang,dir] of languages){
      const context=await browser.newContext({viewport:{width,height:800},deviceScaleFactor:1});
      const page=await context.newPage();
      await page.route(/^https?:\/\//,route=>route.abort());
      try{
        await page.goto(url,{waitUntil:'load'});
        await page.evaluate(({lang,dir,zoom})=>{
          document.documentElement.lang=lang;
          document.documentElement.dir=dir;
          document.documentElement.style.fontSize=zoom+'%';
          const label=document.getElementById('currentLangLabel');
          if(label)label.textContent='Ungewöhnlich lange Beschriftung — العربية فارسی اردو';
          const pill=document.querySelector('.focus-hero-card .seg-pill');
          if(pill)pill.textContent='Sehr lange Fokuszeit-Einstellung';
          const user=document.getElementById('inpNoteTitle');
          if(user) user.value='عنوان المستخدم ١٢٣ فارسی ۱۲۳';
        },{lang,dir,zoom});
        const obs=await page.evaluate(()=>{
          const root=document.documentElement;
          const offscreen=[];
          const selector='.header-top-row button,.focus-hero-card .seg-pill,.modal-overlay.active button';
          for(const el of document.querySelectorAll(selector)){
            const rect=el.getBoundingClientRect();
            if(rect.width>0&&rect.height>0&&(rect.left < -1||rect.right>innerWidth+1))offscreen.push(el.className);
          }
          const field=document.getElementById('inpNoteTitle');
          return {innerWidth,scrollWidth:root.scrollWidth,dir:getComputedStyle(root).direction,
            clipped:root.scrollWidth>innerWidth+1,offscreen,
            userTextPreserved:!field||field.value==='عنوان المستخدم ١٢٣ فارسی ۱۲۳'};
        });
        observations.push({width,zoom,lang,...obs});
        if(obs.dir!==dir||obs.clipped||obs.offscreen.length||!obs.userTextPreserved)
          failures.push({width,zoom,lang,expected:dir,...obs});
        await page.screenshot({path:path.join(out,width+'-'+zoom+'-'+lang+'.png'),fullPage:true});
      }catch(err){failures.push({width,zoom,lang,error:String(err)});}
      finally{await context.close();}
    }
  }finally{await browser.close();}
  fs.writeFileSync(path.join(out,'matrix.json'),JSON.stringify({observations,failures},null,2));
  console.log('CHROMIUM_MATRIX:',observations.length,'cases,',failures.length,'failures; results:',out);
  if(failures.length){console.error(JSON.stringify(failures.slice(0,10),null,2));process.exitCode=1;}
}
main().catch(err=>{console.error(err);process.exitCode=1;});
