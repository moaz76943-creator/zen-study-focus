'use strict';
// TRACK 04 / DF-070..084: genuine Chromium touchscreen taps and state outcomes.
// Desktop Chromium is NOT evidence of Android WebView, native dialogs or SAF.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');

const out = process.env.DF_TRACK04_EVIDENCE || '/tmp/df-track04';
const url = process.env.DF_COMPLETION_URL || 'http://127.0.0.1:8770';
const languages = 'en ar es zh hi fr de ru pt ja id tr ko vi it bn ur fa pl nl'.split(' ');
const navs = [
  ['navTasks','sec-tasks'],['navCalendar','sec-calendar'],
  ['navNotes','sec-notes'],['navTimer','sec-timer'],
  ['navTraining','sec-timer'],['navSounds','sec-sounds'],
  ['navAnalytics','sec-analytics']
];
const results = [];
const pageErrors = [];
function record(name,locale,state){results.push({name,locale,status:'PASS',state});}
async function observed(page){
  return page.evaluate(()=>{
    const nav=[...document.querySelectorAll('.bnav-btn.active')].map(n=>n.id);
    const screens=[...document.querySelectorAll('.screen-section.active')].map(n=>n.id);
    return {nav,screens,lang:document.documentElement.lang,
      trainingOpen:document.getElementById('quickTrainingDetails').open,
      tasks:tasksList.length,notes:notesList.length,sessionId:timerSessionId};
  });
}
(async()=>{
  fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({executablePath:process.env.DF4_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  let page;
  try {
    const context=await browser.newContext({viewport:{width:393,height:830},isMobile:true,hasTouch:true,deviceScaleFactor:1});
    await context.route('**/*',route=>new URL(route.request().url()).origin===new URL(url).origin?route.continue():route.abort());
    page=await context.newPage();
    page.setDefaultTimeout(9000);
    page.on('pageerror',e=>pageErrors.push(String(e.name||'Error')));
    await page.goto(url,{waitUntil:'load'});
    for(const locale of languages){
      const selected=await page.evaluate(l=>applyLanguage(l),locale);
      assert.equal(selected,true,'Language persistence refused for '+locale);
      for(const [button,screen] of navs){
        // tap() uses Playwright's touchscreen, not a JavaScript onclick injection.
        await page.locator('#'+button).tap();
        const state=await observed(page);
        assert.deepEqual(state.nav,[button],locale+' '+button+' active navigation');
        assert.deepEqual(state.screens,[screen],locale+' '+button+' visible screen');
        assert.equal(state.lang,locale,locale+' retained language after tap');
        if(button==='navTraining')assert.equal(state.trainingOpen,true,'Training tab expands actual training panel');
        record('mobile touch '+button+' -> '+screen,locale,{nav:state.nav[0],screen:state.screens[0]});
      }
    }
    assert.equal(results.length,140,'At least 100 real touch outcomes must be checked');

    // Cancellation must preserve the user's custom inputs in the actual rendered modal.
    for(const locale of ['en','ar','de','fa','ur']){
      assert.equal(await page.evaluate(l=>applyLanguage(l),locale),true);
      await page.locator('#navTimer').tap();
      await page.locator('#modeCustomBtn').tap();
      await page.locator('#inpCustomMins').fill('47');
      await page.locator('#inpCustomTitle').fill('Draft '+locale);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#customTimerModal').evaluate(n=>n.classList.contains('open')),false);
      assert.equal(await page.locator('#inpCustomTitle').inputValue(),'Draft '+locale);
      assert.equal(await page.locator('#inpCustomMins').inputValue(),'47');
      record('Escape closes custom modal without losing draft',locale,{minutes:'47'});
      await page.locator('#modeCustomBtn').tap();
      assert.equal(await page.locator('#inpCustomTitle').inputValue(),'Draft '+locale);
      await page.locator('#customTimerModal [data-i18n="btnCancel"]').tap();
      assert.equal(await page.locator('#customTimerModal').evaluate(n=>n.classList.contains('open')),false);
      assert.equal(await page.locator('#inpCustomTitle').inputValue(),'Draft '+locale);
      record('Cancel retains reopenable custom draft',locale,{title:'Draft '+locale});
    }
    // Test actual button outcome, storage round-trip, and duplicate tap safety.
    await page.evaluate(()=>applyLanguage('en'));
    await page.locator('#navTasks').tap();
    const taskTitle='Track04 tap saved task ٢';
    await page.locator('.df-quick input').fill(taskTitle);
    await page.locator('.df-quick button').tap();
    assert.equal(await page.evaluate(t=>tasksList.filter(x=>x.title===t).length,taskTitle),1);
    record('Task quick-add touch creates exactly one record','en',{title:taskTitle});
    await page.locator('#navNotes').tap();
    await page.locator('#nsNewButton').tap();
    const noteTitle='Track04 actual Save ۳';
    await page.locator('#inpNoteTitle').fill(noteTitle);
    await page.locator('#inpNoteBody').fill('Personal text ٢ stays unchanged');
    await page.locator('#nsSaveButton').tap();
    assert.equal(await page.evaluate(t=>notesList.filter(x=>x.title===t).length,noteTitle),1);
    record('Notes Save touch creates exactly one note','en',{title:noteTitle});
    await page.reload();
    assert.equal(await page.evaluate(t=>tasksList.filter(x=>x.title===t).length,taskTitle),1);
    assert.equal(await page.evaluate(t=>notesList.filter(x=>x.title===t&&x.body==='Personal text ٢ stays unchanged').length,noteTitle),1);
    record('Reopen persists actual tap-created task and original note digits','en',{tasks:1,notes:1});
    assert.deepEqual(pageErrors,[],'No uncaught JavaScript errors after actual touches');
  }catch(e){
    results.push({name:'unexpected outcome',status:'FAIL',error:String(e.message||e).slice(0,1000)});
    process.exitCode=1;
    if(page)await page.screenshot({path:path.join(out,'failed-mobile.png'),fullPage:true}).catch(()=>{});
  }finally{
    const summary={source:'current checked-out Git tree',environment:'real desktop Chromium touchscreen emulation (not Android)',realTouchOutcomes:results.filter(x=>x.status==='PASS').length,
      failed:results.filter(x=>x.status==='FAIL'),pageErrors,android:'NOT_TESTED',nativeDialog:'NOT_TESTED',saf:'NOT_TESTED',talkback:'NOT_TESTED',releaseApproved:false};
    fs.writeFileSync(path.join(out,'touch-outcomes.json'),JSON.stringify({summary,results},null,2)+'\n');
    console.log(JSON.stringify(summary));
    await browser.close();
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
