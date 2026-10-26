'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const url=process.env.DF_LOCALE_URL||'http://127.0.0.1:8770/index.html';
const dest=process.env.DF_LOCALE_REPORT||'/tmp/df03-browser-locale.json';
const codes=['en','ar','es','zh','hi','fr','de','ru','pt','ja','id','tr','ko','vi','it','bn','ur','fa','pl','nl'];
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const rows=[],errors=[];
 try{
  const page=await browser.newPage({viewport:{width:393,height:820}});
  page.on('pageerror',error=>errors.push(String(error).slice(0,200)));
  await page.goto(url,{waitUntil:'load'});
  for(const code of codes){
   const problems=[];
   try{
    const meta=await page.evaluate(code=>LANG_CATALOG.find(x=>x.code===code),code);
    if(!meta)throw Error('Missing catalog entry '+code);
    const index=await page.evaluate(code=>LANG_CATALOG.findIndex(x=>x.code===code),code);
    await page.locator('.lang-switcher-pill').click();
    await page.locator('#langListScrollBox .lang-row-btn').nth(index).click();
    const actual=await page.evaluate(()=>({lang:document.documentElement.lang,dir:document.documentElement.dir,
      iso:document.getElementById('currentLangIso').textContent.trim(),
      label:document.querySelector('.lang-switcher-pill').getAttribute('aria-label')}));
    if(actual.lang!==code||actual.dir!==meta.dir||actual.iso!==meta.iso||!actual.label?.includes(meta.iso))
     problems.push('SWITCH:'+JSON.stringify(actual));
    for(const width of [320,393,430]){
     await page.setViewportSize({width,height:820});
     const measure=await page.evaluate(()=>{
      const ids=['navTimer','navTasks','navCalendar','navNotes','navSounds','navAnalytics'];
      return {scroll:document.documentElement.scrollWidth, viewport:innerWidth,
       labels:ids.map(id=>document.getElementById(id)?.textContent?.trim()||''),
       timer:document.getElementById('timerDigitsTxt')?.textContent||''};
     });
     if(measure.scroll>measure.viewport+2)problems.push('OVERFLOW:'+width);
     if(measure.labels.some(label=>!label))problems.push('NAV_LABEL:'+width);
     if(!/[0-9]/.test(measure.timer)||/[\u0660-\u0669\u06f0-\u06f9\u0966-\u096f\u09e6-\u09ef]/.test(measure.timer))
      problems.push('TIMER_DIGITS:'+width);
    }
    await page.reload({waitUntil:'load'});
    const saved=await page.evaluate(()=>({lang:document.documentElement.lang,dir:document.documentElement.dir,
     iso:document.getElementById('currentLangIso').textContent.trim()}));
    if(saved.lang!==code||saved.dir!==meta.dir||saved.iso!==meta.iso)
      problems.push('RELOAD:'+JSON.stringify(saved));
   }catch(error){problems.push('EXCEPTION:'+String(error.message||error).slice(0,250));}
   rows.push({code,status:problems.length?'FAIL':'PASS',problems});
  }
 }finally{await browser.close();}
 const report={source_sha:process.env.GITHUB_SHA||'LOCAL',kind:'REAL_CHROMIUM_NOT_ANDROID',
  cases:rows,errors,android:'NOT_TESTED',translation_parity:'NOT_TESTED',release_approved:false};
 fs.writeFileSync(dest,JSON.stringify(report,null,2));
 console.log(JSON.stringify({pass:rows.filter(x=>x.status==='PASS').length,
  fail:rows.filter(x=>x.status==='FAIL').length,errors:errors.length,examples:rows.filter(x=>x.problems.length).slice(0,5)}));
 assert.equal(rows.filter(x=>x.status==='FAIL').length,0,'Real picker + RTL + reload must pass');
 assert.equal(errors.length,0,'No browser uncaught errors');
})().catch(error=>{console.error(error);process.exitCode=1;});
