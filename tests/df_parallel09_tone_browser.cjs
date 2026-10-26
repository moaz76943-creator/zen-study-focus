#!/usr/bin/env node
'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
  const out=process.env.DF09_PICKER_OUT||fs.mkdtempSync(path.join(os.tmpdir(),'df09-tone-'));
  fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({headless:true,executablePath:process.env.DF_CHROMIUM_BIN||undefined,args:['--allow-file-access-from-files']});
  const url=pathToFileURL(path.resolve(__dirname,'../android/app/src/main/assets/web/index.html')).href;
  const rows=[],failures=[];
  try {
    for(const width of [320,360,393,430])for(const locale of ['en','ar'])for(const zoom of [100,150,200]){
      const context=await browser.newContext({viewport:{width,height:780}});
      const page=await context.newPage();
      await page.route(/^https?:\/\//,r=>r.abort());
      try {
        await page.goto(url,{waitUntil:'load'});
        await page.evaluate(({locale,zoom})=>{
          document.documentElement.lang=locale;
          document.documentElement.dir=locale==='ar'?'rtl':'ltr';
          document.documentElement.style.fontSize=zoom+'%';
          if(typeof switchTab==='function') switchTab('sec-sounds',document.getElementById('navSounds'));
          else document.getElementById('sec-sounds').classList.add('active');
        },{locale,zoom});
        await page.waitForFunction(()=>document.querySelectorAll('#completionAlertPickerHost .completion-alert-option').length===6);
        const row=await page.evaluate(()=>{
          const host=document.getElementById('completionAlertPickerHost');
          const rect=host.getBoundingClientRect();
          const buttons=[...host.querySelectorAll('.completion-alert-option > button')];
          const inputs=[...host.querySelectorAll('input[type="radio"]')];
          const scope=host.querySelector('.completion-alert-picker').getBoundingClientRect();
          const problems=[];
          if(buttons.length!==6||inputs.length!==6)problems.push('choices');
          if(!buttons.every(b=>b.getBoundingClientRect().height>=43.5))problems.push('tap-height');
          if(rect.width>innerWidth+1||rect.left<0||rect.right>innerWidth+1)problems.push('horizontal-overflow');
          if(document.documentElement.scrollWidth>innerWidth+1)problems.push('document-overflow');
          return {width:innerWidth,locale:document.documentElement.lang,title:host.querySelector('h3')?.textContent,
            buttonCount:buttons.length,radioCount:inputs.length,hostWidth:rect.width,sectionWidth:scope.width,problems};
        });
        row.zoom=zoom;rows.push(row);if(row.problems.length)failures.push(row);
        if(width===320&&zoom===200)await page.screenshot({path:path.join(out,locale+'-320-200.png'),fullPage:true});
        if(width===393&&locale==='ar'&&zoom===100){
          const before=await page.evaluate(()=>localStorage.getItem('df_end_tone'));
          await page.locator('#completionAlertPickerHost .completion-alert-option > button').first().click();
          const afterPreview=await page.evaluate(()=>localStorage.getItem('df_end_tone'));
          if(before!==afterPreview)failures.push({error:'preview changed stored tone'});
          await page.locator('#completionAlertPickerHost input[value="woodblock"]').check();
          const saved=await page.evaluate(()=>localStorage.getItem('df_end_tone'));
          if(saved!=='woodblock')failures.push({error:'tone selection failed'});
        }
      }catch(err){failures.push({width,locale,zoom,error:String(err)});}
      finally{await context.close();}
    }
  }finally{await browser.close();}
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({rows,failures},null,2));
  console.log('DF09 Tone Picker browser:',rows.length,'/24, failures:',failures.length,out);
  if(failures.length){console.error(JSON.stringify(failures.slice(0,6),null,2));process.exitCode=1;}
})().catch(e=>{console.error(e);process.exitCode=1;});
