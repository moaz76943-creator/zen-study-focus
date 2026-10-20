'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const sourceUrl=process.env.DF_COMPLETION_URL||'http://127.0.0.1:8770';
const out=process.env.DF_ANALYTICS_EVIDENCE||'/tmp/deep-focus-analytics-evidence';
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:393,height:830}});
 const rows=[],errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 try{
  await page.goto(sourceUrl+'/index.html',{waitUntil:'load'});
  for(const lang of ['de','es','fa','ur','bn','hi']){
   for(const width of [320,393,430]){
    await page.setViewportSize({width,height:830});
    const result=await page.evaluate(({lang})=>{
     const host=document.createElement('div');
     host.id='isolatedAnalyticsQA';
     host.style.cssText='position:relative;width:100%;max-width:100%';
     document.getElementById('sec-analytics').appendChild(host);
     const today='2026-10-20';
     const snapshot={
       sessionHistory:[{id:'real-qa-session-1',date:'2026-10-19',domain:'study',minutes:25,completed:true}],
       tasksList:[],projects:[]
     };
     const handle=DeepFocusAnalyticsStudioV21.mount(host,()=>snapshot,{
       locale:lang,today,startDate:'2026-10-01',endDate:'2026-10-20'
     });
     const panel=handle.element;
     const text=panel.querySelector('h2')?.textContent;
     const dates=[...panel.querySelectorAll('input[type=date]')];
     const heading=DeepFocusLocale20Recovery.t(lang,'analyticsTitle');
     const totals=handle.getReport()?.totals.minutes;
     const report={lang,width:innerWidth,heading,text,dir:panel.getAttribute('dir'),expectedDir:DeepFocusLocale20Recovery.direction(lang),
       totals,dates:dates.map(e=>({direction:getComputedStyle(e).direction,lang:e.lang})),
       panelWidth:panel.getBoundingClientRect().width,
       horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1,
       activeButtons:[...document.querySelectorAll('.bnav-btn.active')].map(e=>e.id)};
     handle.destroy();host.remove();return report;
    },{lang});
    rows.push({...result,width});
   }
  }
  fs.mkdirSync(out,{recursive:true});
  await page.setViewportSize({width:320,height:830});
  await page.evaluate(()=>{
   const host=document.createElement('div');host.id='isolatedAnalyticsQA';document.getElementById('sec-analytics').append(host);
   window.__qaAnalytics=DeepFocusAnalyticsStudioV21.mount(host,()=>({
    sessionHistory:[{id:1,date:'2026-10-19',domain:'study',minutes:45}],tasksList:[],projects:[]
   }),{locale:'fa',today:'2026-10-20',startDate:'2026-10-01',endDate:'2026-10-20'});
   document.getElementById('navAnalytics').click();
  });
  await page.screenshot({path:out+'/analytics-fa-320.png',fullPage:true});
  await page.evaluate(()=>{window.__qaAnalytics.destroy();document.getElementById('isolatedAnalyticsQA').remove();});
  const bad=rows.filter(r=>r.text!==r.heading||r.dir!==r.expectedDir||r.totals!==25||
    r.dates.length!==2||r.dates.some(d=>d.direction!=='ltr')||r.horizontalOverflow);
  fs.writeFileSync(out+'/analytics-real-chromium.json',JSON.stringify({rows,bad,errors},null,2));
  console.log(JSON.stringify({cases:rows.length,failed:bad.length,unhandledErrors:errors.length,screenshot:'analytics-fa-320.png'}));
  assert.deepEqual(bad,[],'Analytics must render correctly without horizontal viewport overflow in all tested languages');
  assert.deepEqual(errors,[],'No unhandled browser JS exceptions');
 }finally{await browser.close();}
})().catch(err=>{console.error(err);process.exitCode=1;});
