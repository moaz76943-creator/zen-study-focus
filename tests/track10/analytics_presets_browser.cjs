'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const out=process.env.DF_ANALYTICS_EVIDENCE||'/tmp/df-track10-presets';
const base=process.env.DF_COMPLETION_URL||'http://127.0.0.1:8770';
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const errors=[],report=[];
 try{
  const page=await browser.newPage({viewport:{width:320,height:740}});
  page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(base+'/index.html',{waitUntil:'load'});
  await page.waitForFunction(()=>window.DeepFocusAnalyticsStudioV21&&window.DeepFocusLocale20Recovery,
    {timeout:15000});
  const codes=await page.evaluate(()=>window.DeepFocusLocale20Recovery.LANGUAGES);
  assert.equal(codes.length,20);
  for(const code of codes){
   const result=await page.evaluate(code=>{
    const host=document.createElement('div');document.body.appendChild(host);
    const snapshot={sessionHistory:[
      {id:'qa-older',date:'2026-09-22',minutes:40,domain:'read'},
      {id:'qa-recent',date:'2026-10-19',minutes:25,domain:'study'}
    ],tasksList:[]};
    let exports=0;
    const m=window.DeepFocusAnalyticsStudioV21.mount(host,()=>snapshot,{
      locale:code,today:'2026-10-20',onExport:async()=>{exports++;return{status:'saved'};}
    });
    try{
     const ui=m.element,button=key=>ui.querySelector('[data-action="'+key+'"]');
     const start=ui.querySelector('input[type=date]');
     const end=ui.querySelectorAll('input[type=date]')[1];
     const domain=ui.querySelector('.dfa-filters select');
     const exp=ui.querySelector('.dfa-filters button');
     const hasAll=['today','last7','last30','custom','reset'].every(key=>!!button(key));
     if(!hasAll)throw Error(code+' has missing period controls');
     button('today').click();
     if(start.value!=='2026-10-20'||m.getReport().totals.minutes!==0)
       throw Error(code+' Today not filtering');
     button('last7').click();
     if(start.value!=='2026-10-14'||m.getReport().totals.minutes!==25)
       throw Error(code+' Last 7 filtering');
     button('last30').click();
     if(start.value!=='2026-09-21'||m.getReport().totals.minutes!==65)
       throw Error(code+' Last 30 filtering');
     domain.value='read';domain.dispatchEvent(new Event('change',{bubbles:true}));
     if(m.getReport().totals.minutes!==40)throw Error(code+' domain filtering');
     button('reset').click();
     if(domain.value!=='all'||m.getReport().totals.minutes!==65)
       throw Error(code+' reset failed');
     start.value='2030-01-01';start.dispatchEvent(new Event('change',{bubbles:true}));
     if(!exp.disabled)throw Error(code+' invalid range should disable Export');
     button('last7').click();
     if(exp.disabled||start.value!=='2026-10-14')
       throw Error(code+' preset should repair invalid range and restore Export');
     if(ui.getAttribute('lang')!==code)throw Error(code+' language overwritten');
     const buttons=[...ui.querySelectorAll('.dfa-range-presets button')];
     if(buttons.some(b=>!b.textContent.trim()))throw Error(code+' untranslated empty preset');
     if(/[\u0660-\u0669\u06f0-\u06f9\u0966-\u096f\u09e6-\u09ef]/.test(
       buttons.map(x=>x.textContent).join(' ')))throw Error(code+' digit policy');
     return {lang:code,minutes:m.getReport().totals.minutes,
       presets:buttons.map(b=>b.textContent),dir:ui.getAttribute('dir'),exports};
    }finally{m.destroy();host.remove();}
   },code);
   report.push(result);
  }
  assert.deepEqual(errors,[]);
  assert.equal(report.length,20);
  fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(out+'/track10-20-language-presets.json',JSON.stringify({
    testedHead:process.env.GITHUB_SHA||'local',report,errors
  },null,2));
  console.log(JSON.stringify({validatedLocales:report.length,workingPeriodActions:100,
    pageErrors:errors.length}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
