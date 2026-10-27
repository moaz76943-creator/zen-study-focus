'use strict';
const {createEvidenceDirectory}=require('../android_e2e_recovery/private_evidence.cjs');
// Canonical bundled-app desktop Chromium verification only; not Android native UIAutomator.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const codes='en ar es zh hi fr de ru pt ja id tr ko vi it bn ur fa pl nl'.split(' ');
const base=process.env.DF_COMPLETION_URL||'http://127.0.0.1:8770';
const evidence=createEvidenceDirectory(process.env.DF07_LOCALE_TIMER_EVIDENCE,'df07-timer20-');
(async()=>{
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
   // Actual touchscreen gestures for each destructive control; no stubbed confirm.
   // Reset currently has an Arabic/English message only: report that language gap.
   const resetMessage=lang==='ar'
    ? 'إعادة الضبط ستلغي تقدم الجلسة الحالية. هل تريد المتابعة؟'
    : 'Reset will discard the current session progress. Continue?';
   const controls=[
    {name:'Short',selector:'#modeShortBtn',message:expected.message},
    {name:'Reset',selector:'#sec-timer button[onclick="resetTimerNow()"]',message:resetMessage},
    {name:'Skip',selector:'#sec-timer button[onclick="skipTimerPhase()"]',message:expected.message}
   ];
   for(const control of controls){
    let observedDialog=null;
    page.once('dialog',async dialog=>{
     observedDialog={type:dialog.type(),message:dialog.message()};
     await dialog.dismiss();
    });
    await page.locator(control.selector).tap();
    assert.ok(observedDialog,lang+' '+control.name+' did not request real consent');
    assert.equal(observedDialog.type,'confirm',lang+' '+control.name+' must show confirm');
    assert.equal(observedDialog.message,control.message,lang+' '+control.name+' incorrect dialog text');
    const after=await page.evaluate(()=>({id:timerSessionId,mode:currentTimerModeKey,total:timerTotal,running:timerRunning,label:customSessionLabel}));
    assert.deepEqual(after,original,lang+' '+control.name+' Cancel altered active session');
    results.push({
     locale:lang,control:control.name,status:'PASS',messageMatched:true,cancelPreserved:true,
     englishFallback:control.name==='Reset' ? !['en','ar'].includes(lang) : fallback
    });
   }
  }
  assert.equal(results.length,60,'20 locales x 3 real UI Cancel paths');
  assert.deepEqual(pageErrors,[],'Unhandled browser JS exceptions');
  const gaps=[...new Set(results.filter(r=>r.englishFallback&&r.control!=='Reset').map(r=>r.locale))];
  const resetEnglishFallbackLocales=codes.filter(lang=>!['en','ar'].includes(lang));
  evidence.write('timer-20-locale-confirm.json',JSON.stringify({source:'current checkout',environment:'desktop Chromium mobile emulation only',results,englishFallbackGaps:gaps,resetEnglishFallbackLocales,nativeAndroid:'NOT_TESTED',saf:'NOT_TESTED',releaseApproved:false},null,2)+'\n');
  console.log(JSON.stringify({localeCancelPass:results.length,controls:['Short','Reset','Skip'],untranslatedEnglishFallback:gaps,resetEnglishFallbackLocales,jsErrors:pageErrors.length,android:'NOT_TESTED'}));
 } catch(error){
  evidence.write('FAILED.txt',String(error.stack||error));
  throw error;
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
