'use strict';
/* Real Chromium synthetic profile only: all real Timer mode buttons, navigation,
 * modal open/close and cancel/accept behavior; don't conflate static inventory
 * with functional success of every button.
 */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const out=process.env.DF_BUTTON_EVIDENCE||'/tmp/deep-focus-buttons';
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const results=[],errors=[],dialogs=[];
 try {
  const context=await browser.newContext({viewport:{width:393,height:830}});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(process.env.DF_COMPLETION_URL||'http://127.0.0.1:8770');
  await page.waitForFunction(()=>typeof toggleTimerPlay==='function'&&!!document.getElementById('modeShortBtn'));
  await page.evaluate(()=>{applyLanguage('ar');selectTimerMode(25,'focus',document.getElementById('modeFocusBtn'));toggleTimerPlay();});
  const state=()=>page.evaluate(()=>({
   mode:currentTimerModeKey,total:timerTotal,sessionId:timerSessionId,
   running:timerRunning,active:timerActiveMs,domain:cfg.domain
  }));
  const before=await state();
  assert.equal(before.running,true,'Actual timer must be running before cancel test');
  for(const id of ['modeShortBtn','modeLongBtn']){
   const listener=async d=>{dialogs.push({id,text:d.message()});await d.dismiss();};
   page.once('dialog',listener);
   await page.locator('#'+id).click();
   const after=await state();
   assert.equal(dialogs.filter(x=>x.id===id).length,1,id+' must request confirmation');
   assert.equal(after.mode,before.mode,id+' cancelled mode must stay');
   assert.equal(after.total,before.total,id+' cancelled duration must stay');
   assert.equal(after.sessionId,before.sessionId,id+' cancelled session ID must stay');
   assert.equal(after.running,true,id+' cancelled session must continue');
   results.push({control:id,flow:'click -> genuine confirm -> Cancel; timer unchanged',status:'PASS'});
  }
  page.once('dialog',async d=>{dialogs.push({id:'modeLongBtn-confirm',text:d.message()});await d.accept();});
  await page.locator('#modeLongBtn').click();
  const accepted=await state();
  assert.equal(accepted.mode,'long');
  assert.equal(accepted.total,await page.evaluate(()=>cfg.longMin*60));
  assert.equal(accepted.running,false);
  results.push({control:'modeLongBtn',flow:'click -> confirm OK -> selected mode, timer stopped',status:'PASS'});

  // These are accessible button examples across screens, with observable DOM outcomes.
  const nav=[
   ['navTimer','sec-timer'],['navTasks','sec-tasks'],['navCalendar','sec-calendar'],
   ['navNotes','sec-notes'],['navSounds','sec-sounds'],['navAnalytics','sec-analytics']
  ];
  for(const [id,screen] of nav){
    await page.locator('#'+id).click();
    const active=await page.locator('#'+screen).evaluate(el=>el.classList.contains('active'));
    assert.equal(active,true,'Navigation did not activate '+screen);
    results.push({control:id,flow:'real click, target screen active',status:'PASS'});
  }
  await page.locator('#navTraining').click();
  const training=await page.evaluate(()=>document.getElementById('sec-timer').classList.contains('active'));
  assert.equal(training,true);
  results.push({control:'navTraining',flow:'quick-training button navigated to timer',status:'PASS'});
  for(const [id,modal] of [
    ['timerSettingsChip','timerSettingsModal'],
    ['goalsEditButton','dailyGoalsModal'],
    ['modeCustomBtn','customTimerModal']
  ]){
    await page.locator('#navTimer').click();
    await page.locator('#'+id).click();
    assert.equal(await page.locator('#'+modal).evaluate(el=>el.classList.contains('open')),true,id+' did not open modal');
    await page.evaluate(m=>closeModal(m),modal);
    assert.equal(await page.locator('#'+modal).evaluate(el=>el.classList.contains('open')),false,'modal not closed');
    results.push({control:id,flow:'click modal open then close',status:'PASS'});
  }
  await page.locator('#navNotes').click();
  await page.locator('#nsNewButton').click();
  assert.equal(await page.locator('#noteModal').evaluate(el=>el.classList.contains('open')),true);
  await page.evaluate(()=>nsCloseEditor());
  results.push({control:'nsNewButton',flow:'open note editor and cancel',status:'PASS'});

  const discovered=await page.evaluate(()=>{
   const buttons=[...document.querySelectorAll('button')];
   const visible=buttons.filter(el=>el.getBoundingClientRect().width>0&&getComputedStyle(el).visibility!=='hidden');
   return {sourceButtons:buttons.length,renderedVisible:visible.length,
     withInlineClick:buttons.filter(el=>el.getAttribute('onclick')).length,
     displayedIds:visible.map(b=>b.id).filter(Boolean)};
  });
  fs.mkdirSync(out,{recursive:true});
  await page.locator('#navAnalytics').click();
  await page.screenshot({path:out+'/analytics-main-screen-393.png',fullPage:false});
  fs.writeFileSync(out+'/button-interaction-ledger.json',JSON.stringify({
   results,dialogs,discovered,uncaughtErrors:errors,
   note:'This is a named interaction subset. Other static/dynamic buttons are NOT_TESTED by this suite.',
   release_approved:false
  },null,2));
  console.log(JSON.stringify({functionalCases:results.length,status:'PASS',uncaughtErrors:errors.length,
   browserButtons:discovered.sourceButtons,notExhaustive:true}));
  assert.deepEqual(errors,[]);
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
