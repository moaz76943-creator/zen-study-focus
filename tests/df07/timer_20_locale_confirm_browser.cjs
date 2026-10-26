'use strict';
// Canonical bundled-app desktop Chromium verification only; not Android native UIAutomator.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const codes='en ar es zh hi fr de ru pt ja id tr ko vi it bn ur fa pl nl'.split(' ');
const base=process.env.DF_COMPLETION_URL||'http://127.0.0.1:8770';
const out=process.env.DF07_LOCALE_TIMER_EVIDENCE||'/tmp/df07-timer20';
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const results=[],pageErrors=[];
 const browser=await chromium.launch({executablePath:process.env.DF_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try {
  const context=await browser.newContext({viewport:{width:393,height:830},isMobile:true,hasTouch:true});
  await context.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort());
  const page=await context.newPage();
  page.on('pageerror',e=>pageErrors.push(String(e)));
  await page.goto(base+'/index.html',{waitUntil:'load'});
  await page.evaluate(()=>{
   selectTimerMode(25,'focus',document.getElementById('modeFocusBtn'));
   if(!timerRunning)toggleTimerPlay();
  });
  const original=await page.evaluate(()=>({id:timerSessionId,mode:currentTimerModeKey,total:timerTotal,running:timerRunning,label:customSessionLabel}));
  assert.equal(original.running,true);
  assert.ok(original.id);
  for(const lang of codes){
   const expected=await page.evaluate(code=>{
    applyLanguage(code);
    return {lang:cfg.lang,message:quickText('replacePrompt'),english:QUICK_TRANSLATIONS.en[QUICK_KEYS.indexOf('replacePrompt')]};
   },lang);
   assert.equal(expected.lang,lang,'Language switch did not commit '+lang);
   assert.ok(typeof expected.message==='string'&&expected.message.trim().length>=10,lang+' missing confirmation text');
   // Classify English fallback as a real coverage gap, never proof of translation.
   const fallback=lang!=='en'&&expected.message===expected.english;
   let observedDialog=null;
   page.once('dialog',async dialog=>{
    observedDialog={type:dialog.type(),message:dialog.message()};
    await dialog.dismiss();
   });
   await page.locator('#modeShortBtn').click();
   assert.ok(observedDialog,'No user-facing confirmation for '+lang);
   assert.equal(observedDialog.type,'confirm',lang+' should request consent');
   assert.equal(observedDialog.message,expected.message,lang+' wrong dialog copy');
   const after=await page.evaluate(()=>({id:timerSessionId,mode:currentTimerModeKey,total:timerTotal,running:timerRunning,label:customSessionLabel}));
   assert.deepEqual(after,original,lang+' Cancel altered active session');
   results.push({locale:lang,status:'PASS',messageMatched:true,cancelPreserved:true,englishFallback:fallback});
  }
  assert.equal(results.length,20);
  assert.deepEqual(pageErrors,[],'Unhandled browser JS exceptions');
  const gaps=results.filter(r=>r.englishFallback).map(r=>r.locale);
  fs.writeFileSync(path.join(out,'timer-20-locale-confirm.json'),JSON.stringify({source:'current checkout',environment:'desktop Chromium mobile emulation only',results,englishFallbackGaps:gaps,nativeAndroid:'NOT_TESTED',saf:'NOT_TESTED',releaseApproved:false},null,2)+'\n');
  console.log(JSON.stringify({localeCancelPass:results.length,untranslatedEnglishFallback:gaps,jsErrors:pageErrors.length,android:'NOT_TESTED'}));
 } catch(error){
  fs.writeFileSync(path.join(out,'FAILED.txt'),String(error.stack||error));
  throw error;
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});