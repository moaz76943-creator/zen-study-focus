'use strict';
// TRACK09: actual Chromium DOM interactions against the staged integration tree.
// Synthetic fixtures exist only inside this disposable browser context.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const output=process.env.DF_TRACK09_EVIDENCE||'/tmp/track09-evidence';
const base=process.env.DF_COMPLETION_URL||'http://127.0.0.1:8770';
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:393,height:830}});
 const page=await context.newPage();
 const errors=[],results=[];
 page.on('pageerror',err=>errors.push(String(err)));
 try{
  await page.goto(base+'/index.html',{waitUntil:'load'});
  await page.waitForFunction(()=>typeof saveDailyGoals==='function'&&typeof startQuickTraining==='function'&&typeof renderTodayPlan==='function');
  await page.locator('#goalsEditButton').click();
  assert.equal(await page.locator('#dailyGoalsModal').evaluate(n=>n.classList.contains('open')),true);
  const goals=await page.evaluate(()=>{
   cfg.dailyGoalsMin={...(cfg.dailyGoalsMin||{}),historicDaily:77};
   cfg.weeklyGoalsMin={...(cfg.weeklyGoalsMin||{}),historicWeekly:333};
   // Input edits are genuine DOM values; save uses the production verified-write path.
   for(const domain of ['study','read','sport','work']){
    document.getElementById('goalInput-'+domain).value='30';
    document.getElementById('goalWeeklyInput-'+domain).value='180';
   }
   const saved=saveDailyGoals();
   return {saved,daily:cfg.dailyGoalsMin,weekly:cfg.weeklyGoalsMin,
    oldHistory:cfg.sessionHistory?.length||0,progress:[...document.querySelectorAll('#dailyGoalsRows [role=progressbar]')].map(n=>n.getAttribute('aria-valuenow'))};
  });
  assert.equal(goals.saved,true);
  assert.equal(goals.daily.historicDaily,77);
  assert.equal(goals.weekly.historicWeekly,333);
  assert.equal(goals.daily.study,30);
  assert.equal(goals.weekly.study,180);
  if(goals.oldHistory===0) assert.deepEqual(goals.progress,['0','0','0','0'],'Empty real history must give zero progress');
  results.push({case:'goal edit/save: retain unknown old preferences, true progress only',status:'PASS'});

  const refused=await page.evaluate(()=>{
   applyQuickTrainingPreset('work');
   const before={domain:cfg.domain,sessionId:timerSessionId,running:timerRunning,mode:currentTimerModeKey};
   const original=window.saveFortressData;
   window.saveFortressData=(key,value)=>key==='zen_fortress_cfg_v21'?false:original(key,value);
   try{
    startQuickTraining();
    return {before,after:{domain:cfg.domain,sessionId:timerSessionId,running:timerRunning,mode:currentTimerModeKey},active:!!quickTraining?.active};
   }finally{window.saveFortressData=original;}
  });
  assert.equal(refused.active,false);
  assert.deepEqual(refused.after,refused.before,'Rejected ACK must not disturb existing timer/activity');
  results.push({case:'quick training: rejected native-style ACK cannot start or disrupt timer',status:'PASS'});

  const originalTitle='خطة ۲۰۲۶ - المرحلة ٢',originalTime='٠٩:٣٠ — ۱۱:۰۰';
  const authored=await page.evaluate(({title,time})=>{
   const item={id:987654321,isStarter:false,date:localDateISO(),title,time,catKey:'study',done:false};
   tasksList.push(item);
   try{
    renderTodayPlan();
    return {name:document.querySelector('#todayPlanPreview .today-plan-task-name')?.textContent,
     detail:document.querySelector('#todayPlanPreview .today-plan-task-detail')?.textContent,
     percent:document.getElementById('todayPlanPercent').textContent};
   }finally{
    const index=tasksList.indexOf(item);if(index>=0)tasksList.splice(index,1);
    renderTodayPlan();
   }
  },{title:originalTitle,time:originalTime});
  assert.equal(authored.name,originalTitle,'Do not normalize authored numeric glyphs');
  assert.ok(authored.detail.includes(originalTime),'Do not normalize authored time');
  assert.match(authored.percent,/^[0-9]+%$/,'Generated percentage uses 0-9');
  results.push({case:'home agenda: authored Unicode text intact; derived ratio in Western digits',status:'PASS'});

  const dates=await page.evaluate(()=>{
   const saved=selectedCalDate;
   const invalid=goToHomeAgenda('2026-02-30');
   const untouched=selectedCalDate===saved;
   const valid=goToHomeAgenda('2026-10-21');
   return {invalid,untouched,valid,selected: selectedCalDate};
  });
  assert.equal(dates.invalid,false);assert.equal(dates.untouched,true);
  assert.equal(dates.valid,true);assert.equal(dates.selected,'2026-10-21');
  results.push({case:'calendar: invalid date rejected, valid local agenda reachable',status:'PASS'});

  await page.evaluate(()=>{applyLanguage('ar');renderDailyGoals();});
  const localized=await page.evaluate(()=>({
   dir:document.documentElement.dir,
   numbers:document.getElementById('dailyGoalsRows').textContent
  }));
  assert.equal(localized.dir,'rtl');
  assert.doesNotMatch(localized.numbers,/[\u0660-\u0669\u06f0-\u06f9]/);
  results.push({case:'Arabic RTL goal rendering does not generate Arabic-Indic digits',status:'PASS'});
  // Each locale's goal controls must work; missing translated copy is recorded as
  // an explicit admission blocker rather than counting English fallback as localized.
  const localeCoverage=[];
  for(const lang of 'en ar es zh hi fr de ru pt ja id tr ko vi it bn ur fa pl nl'.split(' ')){
   const state=await page.evaluate(lang=>{
    applyLanguage(lang);
    renderDailyGoals();
    openDailyGoalsModal();
    const heading=document.getElementById('dailyGoalsHeading')?.textContent;
    const inputs=[...document.querySelectorAll('#goalsEditGrid input')];
    const modal=document.getElementById('dailyGoalsModal');
    const generated=document.getElementById('dailyGoalsRows').textContent;
    const sourceCopy=Object.prototype.hasOwnProperty.call(GOAL_UI,lang);
    closeModal('dailyGoalsModal');
    return {lang,heading,dir:document.documentElement.dir,inputs:inputs.length,
      nativeGoalTranslation:sourceCopy,
      hasNonWesternGeneratedDigits:/[\u0660-\u0669\u06f0-\u06f9]/.test(generated),
      dialogClosed:!modal.classList.contains('open')};
   },lang);
   assert.equal(state.inputs,8,'Four daily and four weekly goal inputs per locale: '+lang);
   assert.equal(state.dialogClosed,true,'Goal dialog must close on '+lang);
   assert.equal(state.hasNonWesternGeneratedDigits,false,'Goals must use 0-9 in '+lang);
   assert.equal(state.dir,['ar','fa','ur'].includes(lang)?'rtl':'ltr','Wrong direction: '+lang);
   localeCoverage.push(state);
  }
  results.push({case:'20 locales: functional goal forms, RTL/LTR, generated 0-9',status:'PASS'});
  // All the browser fixture data stays within a newly created, disposable context.
  const fixtureSave=await page.evaluate(()=>{
   applyLanguage('en');
   const day=localDateISO();
   const record={id:'track09-persist-001',date:day,minutes:25,domain:'study',completed:true,mode:'focus'};
   const next={...cfg,sessionHistory:[
     record,{...record},{id:'track09-demo',date:day,minutes:100,domain:'study',source:'sample'}
   ],dailyGoalsMin:{...(cfg.dailyGoalsMin||{}),study:30}};
   const acknowledged=saveFortressData('zen_fortress_cfg_v21',next);
   if(acknowledged===true)cfg=next;
   return {acknowledged,day};
  });
  assert.equal(fixtureSave.acknowledged,true,'Disposable v21 session history fixture must persist');
  await page.reload({waitUntil:'load'});
  const restoration=await page.evaluate(()=>({
   ids:cfg.sessionHistory?.map(x=>x.id),
   actualMinutes:gsRecordedMinutes('study',localDateISO()),
   progress:document.querySelector('#dailyGoalsRows .goal-study [role="progressbar"]')?.getAttribute('aria-valuenow'),
   historicalKey:cfg.dailyGoalsMin?.historicDaily
  }));
  assert.deepEqual(restoration.ids,['track09-persist-001','track09-persist-001','track09-demo']);
  assert.equal(restoration.actualMinutes,25,'One true session, no duplicate or demo minutes');
  assert.equal(restoration.progress,'83','25 of 30 minutes must be 83%');
  assert.equal(restoration.historicalKey,77,'Historical goal keys must survive full page reload');
  results.push({case:'reload: original IDs, distinct sessions and actual goal percentage persist',status:'PASS'});
  const untranslated=localeCoverage.filter(row=>!row.nativeGoalTranslation).map(row=>row.lang);
  assert.deepEqual(errors,[],'Chromium JS errors');
  fs.mkdirSync(output,{recursive:true});
  await page.locator('#navTimer').click();
  await page.screenshot({path:output+'/track09-goals-393.png'});
  fs.writeFileSync(output+'/track09-results.json',JSON.stringify({results,errors,disposableFixture:true,
   localeCoverage,missingGoalTranslations:untranslated,
   localeTranslationGate:untranslated.length?'BLOCKED':'SOURCE_COVERED',
   android:'NOT_TESTED',releaseApproved:false},null,2));
  console.log(JSON.stringify({status:'PASS',cases:results.length,errors:errors.length}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
