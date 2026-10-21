'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const base=process.env.DF_COMPLETION_URL||'http://127.0.0.1:8770';
const out=process.env.DF_LOCALE_EVIDENCE||'/tmp/deepfocus-locale-navigation';
const languages=['en','ar','es','zh','hi','fr','de','ru','pt','ja','id','tr','ko','vi','it','bn','ur','fa','pl','nl'];
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:320,height:780}});
 const errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 try {
  await page.goto(base+'/index.html',{waitUntil:'load'});
  await page.waitForFunction(()=>typeof applyLanguage==='function'&&!!document.getElementById('navAnalytics'),{timeout:15000});
  const rows=[];
  for(const lang of languages){
   for(const width of [320,360,393,430]){
    await page.setViewportSize({width,height:780});
    const row=await page.evaluate(({lang,width})=>{
      const problems=[];
      // Clean ephemeral browser, not the user's local WebView storage.
      try{ applyLanguage(lang); }catch(error){problems.push('LANGUAGE_SWITCH_EXCEPTION:'+String(error).slice(0,160));}
      const dir=['ar','fa','ur'].includes(lang)?'rtl':'ltr';
      const html=document.documentElement;
      if(html.lang!==lang)problems.push('INCORRECT_HTML_LANG:'+html.lang);
      if(html.dir!==dir)problems.push('INCORRECT_HTML_DIR:'+html.dir);
      for(const id of ['navTimer','navTasks','navCalendar','navNotes','navSounds','navAnalytics']){
        const el=document.querySelector('#'+id+' span[data-i18n]');
        if(!el){problems.push('MISSING_NAV:'+id);continue;}
        const key=el.getAttribute('data-i18n');
        const expected=DICT[lang]?.[key];
        if(!expected)problems.push('UNTRANSLATED_NAV_KEY:'+id+':'+key);
        if(expected && el.textContent!==String(expected).replace(/[\u0660-\u0669\u06f0-\u06f9\u0966-\u096f\u09e6-\u09ef]/g,d=>{const c=d.charCodeAt(0);return String(c-(c>=0x09e6?0x09e6:c>=0x0966?0x0966:c>=0x06f0?0x06f0:0x0660));}))
          problems.push('NAV_LABEL_MISMATCH:'+id);
      }
      const horizontal=document.documentElement.scrollWidth>innerWidth+1;
      if(horizontal)problems.push('HORIZONTAL_OVERFLOW');
      return {lang,width,dir:html.dir,htmlLang:html.lang,problems};
    },{lang,width});
    rows.push(row);
   }
  }
  fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(out+'/live-navigation-20-languages.json',JSON.stringify({rows,errors},null,2));
  const issues=rows.filter(x=>x.problems.length>0);
  console.log(JSON.stringify({tested:rows.length,distinctLanguages:languages.length,issues:issues.length,uncaught:errors.length,firstIssues:issues.slice(0,12)}));
  await page.screenshot({path:out+'/navigation-mobile-last-locale.png',fullPage:false});
  assert.deepEqual(issues,[],'Every language should successfully switch, preserve nav translation and fit on 320/360/393/430px');
  assert.deepEqual(errors,[],'No uncaught browser JavaScript errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
