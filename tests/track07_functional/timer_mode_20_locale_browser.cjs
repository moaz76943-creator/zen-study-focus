'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const codes=['en','ar','es','zh','hi','fr','de','ru','pt','ja','id','tr','ko','vi','it','bn','ur','fa','pl','nl'];
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const out=process.env.DF_TIMER_LOCALE_REPORT||'/tmp/timer-mode-20-locales.json';
 const rows=[],errors=[];
 try{
  const page=await browser.newPage({viewport:{width:393,height:830}});
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(process.env.DF_COMPLETION_URL||'http://127.0.0.1:8770',{waitUntil:'load'});
  await page.waitForFunction(()=>typeof selectTimerModeFromUser==='function'&&typeof quickText==='function');
  await page.evaluate(()=>{
   applyLanguage('en');
   selectTimerMode(25,'focus',document.getElementById('modeFocusBtn'));
   toggleTimerPlay();
  });
  const started=await page.evaluate(()=>({id:timerSessionId,total:timerTotal,mode:currentTimerModeKey,running:timerRunning}));
  assert.equal(started.running,true,'Use a real running focus session, not a fake flag');
  assert.ok(started.id,'Real focused session ID must be present');
  for(const locale of codes){
   await page.evaluate(code=>applyLanguage(code),locale);
   const expected=await page.evaluate(()=>quickText('replacePrompt'));
   let observed=null,accepted=null;
   page.once('dialog',async dialog=>{observed=dialog.message();accepted=false;await dialog.dismiss();});
   await page.locator('#modeShortBtn').click();
   const current=await page.evaluate(()=>({id:timerSessionId,total:timerTotal,mode:currentTimerModeKey,running:timerRunning}));
   assert.equal(observed,expected,locale+' must use its localized discard confirmation');
   assert.equal(accepted,false);
   assert.deepEqual(current,started,locale+' cancelled mode change must leave the focus session intact');
   rows.push({locale,button:'modeShortBtn',status:'PASS',localized:true,sessionPreserved:true});
  }
  assert.deepEqual(errors,[]);
  fs.writeFileSync(out,JSON.stringify({rows,errors,source:'real Chromium rendered app buttons',releaseApproved:false},null,2));
  console.log('TIMER_MODE_20_LOCALE_REAL_BUTTON_PASS',rows.length);
 }finally{
  await browser.close();
 }
})().catch(e=>{console.error('TIMER_MODE_20_LOCALE_FAIL',e);process.exitCode=1});
