'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=process.env.DF_COMPLETION_URL||'http://127.0.0.1:8770';
const out=process.env.DF_ANALYTICS_EVIDENCE||'/tmp/df-analytics-hot-switch';
const locales=['en','ar','es','zh','hi','fr','de','ru','pt','ja','id','tr','ko','vi','it','bn','ur','fa','pl','nl'];
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const errors=[],cases=[];
 try{
  const page=await browser.newPage({viewport:{width:360,height:780}});
  page.on('pageerror',err=>errors.push(String(err)));
  await page.goto(base+'/index.html',{waitUntil:'load'});
  await page.waitForFunction(()=>typeof applyLanguage==='function'&&
    !!document.getElementById('df22AnalyticsHost')&&
    !!document.getElementById('navAnalytics'),{timeout:15000});
  for(const lang of locales){
   const result=await page.evaluate(lang=>{
    applyLanguage(lang);
    document.getElementById('navAnalytics').click();
    const host=document.getElementById('df22AnalyticsHost');
    const panel=host.querySelector('.dfar-panel,.dfa-studio');
    const inputs=[...host.querySelectorAll('input[type=date]')];
    const title=panel?.querySelector('h2')?.textContent?.trim()||'';
    const direction=['ar','fa','ur'].includes(lang)?'rtl':'ltr';
    const engine=panel?.classList?.contains('dfar-panel')?'recovery':'studio';
    return {
      lang,engine,activeLanguage:document.documentElement.lang,
      activeDirection:document.documentElement.dir, panelDirection:panel?.getAttribute('dir'),
      title,hasPanel:!!panel,dateControls:inputs.length,
      westernDates:inputs.every(x=>x.lang==='en-u-nu-latn'&&x.style.direction==='ltr'),
      shortcuts:host.querySelectorAll('.dfa-range-presets [data-action]').length,
      screenOverflow:document.documentElement.scrollWidth>innerWidth+1,
      noneMissing:!host.textContent.includes('undefined')&&!host.textContent.includes('[object Object]')
    };
   },lang);
   cases.push(result);
   assert.equal(result.hasPanel,true,lang+' renders Analytics');
   assert.equal(result.activeLanguage,lang,lang+' page lang');
   assert.equal(result.activeDirection,['ar','fa','ur'].includes(lang)?'rtl':'ltr',lang+' dir');
   assert.equal(result.panelDirection,['ar','fa','ur'].includes(lang)?'rtl':'ltr',lang+' chart dir');
   assert.equal(result.dateControls,2,lang+' dates');
   assert.equal(result.westernDates,true,lang+' date digits LTR');
   assert.ok(result.title,lang+' title');
   assert.equal(result.noneMissing,true,lang+' placeholder leakage');
   assert.equal(result.screenOverflow,false,lang+' 360px width');
   if(!['en','ar'].includes(lang))
     assert.equal(result.shortcuts,5,lang+' studio period shortcuts');
  }
  assert.deepEqual(errors,[]);
  fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(out+'/track10-hot-switch-chromium.json',JSON.stringify({cases,errors},null,2));
  console.log(JSON.stringify({hotSwitched:cases.length,errorCount:errors.length,
    recovery:cases.filter(c=>c.engine==='recovery').length,
    studio:cases.filter(c=>c.engine==='studio').length}));
 }finally{await browser.close();}
})().catch(err=>{console.error(err);process.exitCode=1;});
