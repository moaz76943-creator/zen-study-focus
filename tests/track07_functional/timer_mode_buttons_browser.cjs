'use strict';
const {createEvidenceDirectory}=require('../android_e2e_recovery/private_evidence.cjs');
/* Real Chromium synthetic profile only: all real Timer mode buttons, navigation,
 * modal open/close and cancel/accept behavior; don't conflate static inventory
 * with functional success of every button.
 */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const evidence=createEvidenceDirectory(process.env.DF_BUTTON_EVIDENCE,'deep-focus-buttons-');
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
  // Prove that *actual reset/skip buttons* never erase a running focus session
  // when the Android-like JavaScript confirmation is declined.
  const freshFocus=async()=>{
    await page.evaluate(()=>{
      if(timerRunning)toggleTimerPlay();
      selectTimerMode(25,'focus',document.getElementById('modeFocusBtn'));
      toggleTimerPlay();
    });
    const fresh=await state();
    assert.equal(fresh.running,true,'Focus must run before each destructive action');
    return fresh;
  };
  for(const [name,selector] of [
    ['resetTimerNow','#sec-timer button[onclick="resetTimerNow()"]'],
    ['skipTimerPhase','#sec-timer button[onclick="skipTimerPhase()"]']
  ]){
    const fresh=await freshFocus();
    page.once('dialog',async d=>{dialogs.push({id:name,text:d.message()});await d.dismiss();});
    await page.locator(selector).click();
    const after=await state();
    assert.equal(dialogs.filter(x=>x.id===name).length,1,name+' must ask first');
    assert.equal(after.sessionId,fresh.sessionId,name+' must preserve session ID');
    assert.equal(after.total,fresh.total,name+' must preserve full duration');
    assert.equal(after.mode,fresh.mode,name+' must preserve mode');
    assert.equal(after.running,true,name+' must preserve active timer');
    results.push({control:name,flow:'physical button click, Cancel -> progress retained',status:'PASS'});
  }
  const customBefore=await freshFocus();
  const previousLabel=await page.evaluate(()=>customSessionLabel);
  await page.locator('#modeCustomBtn').click();
  await page.locator('#inpCustomMins').fill('47');
  await page.locator('#inpCustomTitle').fill('Retain entered label');
  page.once('dialog',async d=>{dialogs.push({id:'customCancel',text:d.message()});await d.dismiss();});
  await page.locator('#customTimerModal button[onclick="applyCustomTimerNow()"]').click();
  assert.equal((await state()).sessionId,customBefore.sessionId);
  assert.equal((await state()).running,true);
  assert.equal(await page.evaluate(()=>customSessionLabel),previousLabel,'Cancel does not overwrite label');
  assert.equal(await page.locator('#customTimerModal').evaluate(n=>n.classList.contains('open')),true);
  assert.equal(await page.locator('#inpCustomTitle').inputValue(),'Retain entered label');
  results.push({control:'modeCustomBtn Save',flow:'Cancel leaves editable form, label and session unchanged',status:'PASS'});
  page.once('dialog',async d=>{dialogs.push({id:'customAccept',text:d.message()});await d.accept();});
  await page.locator('#customTimerModal button[onclick="applyCustomTimerNow()"]').click();
  const customAfter=await state();
  assert.equal(customAfter.mode,'custom');
  assert.equal(customAfter.total,47*60);
  assert.equal(customAfter.running,false);
  assert.equal(await page.evaluate(()=>customSessionLabel),'Retain entered label (47m)');
  assert.equal(await page.locator('#customTimerModal').evaluate(n=>n.classList.contains('open')),false);
  results.push({control:'modeCustomBtn Save',flow:'Confirm switches to 47m, preserves entered title',status:'PASS'});
  // The sport-rest button must be safe even when another focus domain is active.
  await page.evaluate(()=>{if(timerRunning)toggleTimerPlay();selectTimerMode(25,'focus',document.getElementById('modeFocusBtn'));toggleTimerPlay();});
  const sportBefore=await state();
  page.once('dialog',async d=>{dialogs.push({id:'sportRest45',text:d.message()});await d.dismiss();});
  await page.locator('#sec-timer button[onclick="startQuickSportRest(45)"]').evaluate(n=>n.click());
  const sportAfter=await state();
  assert.equal(dialogs.filter(x=>x.id==='sportRest45').length,1,'sport rest must ask before ending focus');
  assert.equal(sportAfter.mode,sportBefore.mode);
  assert.equal(sportAfter.sessionId,sportBefore.sessionId);
  assert.equal(sportAfter.running,true);
  results.push({control:'sportRest45',flow:'DOM click Cancel -> focus session unchanged',status:'PASS'});

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

  await page.locator('#navAnalytics').click();
  evidence.write('analytics-main-screen-393.png',await page.screenshot({fullPage:false}));
  evidence.write('button-interaction-ledger.json',JSON.stringify({
   results,dialogs,discovered,uncaughtErrors:errors,
   note:'This is a named interaction subset. Other static/dynamic buttons are NOT_TESTED by this suite.',
   release_approved:false
  },null,2));
  console.log(JSON.stringify({functionalCases:results.length,status:'PASS',uncaughtErrors:errors.length,
   browserButtons:discovered.sourceButtons,notExhaustive:true}));
  assert.deepEqual(errors,[]);
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
