'use strict';
// Desktop Chromium only. All writes are in a fresh disposable browser context.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const out=process.env.DF_COMPLETION_EVIDENCE||'/workspace/scratch/completion-evidence/browser';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const results=[],errors=[];let page;
 try{
  const context=await browser.newContext({viewport:{width:360,height:800}});
  const url=process.env.DF_COMPLETION_URL||'http://127.0.0.1:8770';
  await context.route('**/*',r=>new URL(r.request().url()).origin===new URL(url).origin?r.continue():r.abort());
  page=await context.newPage();page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.locator('#navNotes').click();await page.evaluate(()=>openNoteModal());
  await page.locator('#inpNoteTitle').fill('Original ٢ فارسی');await page.locator('#inpNoteBody').fill('  نص ٣\nKeep १२\n');
  const before=await page.evaluate(()=>({title:document.getElementById('inpNoteTitle').value,body:document.getElementById('inpNoteBody').value,fp:DeepFocusNotesEditorUI.openedFingerprint()}));
  await page.evaluate(()=>applyLanguage('ar'));
  assert.equal(await page.locator('#nsux-preview-toggle').innerText(),'معاينة');
  assert.equal(await page.locator('#nsux-status option').first().innerText(),'كل الملاحظات');
  assert.equal(await page.locator('#nsux-book-filter').getAttribute('aria-label'),'الدفتر');
  assert.deepEqual(await page.evaluate(()=>({title:document.getElementById('inpNoteTitle').value,body:document.getElementById('inpNoteBody').value,fp:DeepFocusNotesEditorUI.openedFingerprint()})),before);
  await page.locator('#nsSaveButton').click();assert.equal(await page.locator('#noteModal').evaluate(n=>n.classList.contains('open')),false);
  const savedCount=await page.evaluate(()=>notesList.length);
  assert.equal(await page.evaluate(()=>saveNewNote()),false);
  assert.equal(await page.evaluate(()=>notesList.length),savedCount,'Late duplicate Save callback cannot create another note');
  await page.reload();await page.locator('#navNotes').click();
  assert.ok((await page.locator('#notesStackBox').innerText()).includes(before.title));
  const id=await page.evaluate(title=>notesList.find(n=>n.title===title).id,before.title);
  await page.evaluate(id=>openNoteModal(null,id),id);assert.equal(await page.locator('#inpNoteBody').inputValue(),before.body);
  results.push({scope:'open-editor en/ar refresh preserves unsaved Unicode; save/reload roundtrip',status:'PASS'});
  await page.locator('#inpNoteBody').fill('Updated content');
  const savedBefore=await page.evaluate(()=>JSON.stringify(notesList));
  await page.evaluate(()=>{window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('Fixture quota failure','QuotaExceededError');};});
  await page.locator('#nsSaveButton').click();
  assert.equal(await page.locator('#noteModal').evaluate(n=>n.classList.contains('open')),true);
  assert.equal(await page.evaluate(()=>JSON.stringify(notesList)),savedBefore);
  await page.evaluate(()=>{Storage.prototype.setItem=window.originalSetItem;delete window.originalSetItem;});
  await page.locator('#nsSaveButton').click();
  assert.equal(await page.evaluate(id=>notesList.find(n=>n.id===id).body,id),'Updated content');
  results.push({scope:'real Notes UI: quota failure retains editor and notes; verified retry',status:'PASS'});
  for(const locale of 'en ar es zh hi fr de ru pt ja id tr ko vi it bn ur fa pl nl'.split(' ')){
   await page.evaluate(locale=>{applyLanguage(locale);openQuickTrainingFromNav();},locale);
   for(const key of ['trainingTitle','work','rest','rounds','presetTabata','presetWorkout']){
    const actual=await page.locator(`[data-qt="${key}"]`).first().innerText();
    assert.equal(actual,await page.evaluate(key=>quickText(key),key));
   }
   await page.screenshot({path:out+'/training-'+locale+'.png',fullPage:true});
   results.push({scope:'rendered training labels and explicit duration units',locale,status:'PASS'});
  }
  await page.evaluate(()=>{applyLanguage('en');selectTimerMode(1,'focus',null);toggleTimerPlay();timerActiveMs=60000;timerTargetTime=Date.now()-1;});
  // Simulated elapsed time here is fixture input, not evidence of clock accuracy.
  const oldCfg=await page.evaluate(()=>JSON.stringify(cfg));
  await page.evaluate(()=>{window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('Fixture quota failure','QuotaExceededError');};runTimerTick();});
  assert.equal(await page.evaluate(()=>JSON.stringify(cfg)),oldCfg);
  assert.equal(await page.evaluate(()=>timerSessionId!==null&&timerLeft===0&&!timerRunning),true);
  await page.evaluate(()=>{Storage.prototype.setItem=window.originalSetItem;delete window.originalSetItem;});
  await page.locator('#navTimer').click();await page.locator('#mainPlayBtn').click();
  assert.equal(await page.evaluate(()=>cfg.sessionHistory.length),1);
  await page.evaluate(()=>finalizeTimerSession(false));assert.equal(await page.evaluate(()=>cfg.sessionHistory.length),1);
  results.push({scope:'timer UI quota/retry uses one credit (simulated elapsed fixture)',status:'PASS'});
  await page.evaluate(()=>{applyLanguage('ar');switchTab('sec-notes',document.getElementById('navNotes'));openNoteModal();});
  await page.locator('#inpNoteTitle').fill('Link target');await page.locator('#inpNoteBody').fill('Target content');await page.locator('#nsSaveButton').click();
  const targetId=await page.evaluate(()=>notesList.find(n=>n.title==='Link target').id);
  const card=page.locator('.nsux-card').filter({has:page.getByRole('heading',{name:before.title,exact:true})});
  await card.locator('summary').click();
  await card.getByRole('button',{name:'ربط ملاحظة',exact:true}).click();
  await page.locator('dialog[open]').getByRole('button',{name:/^Link target/}).click();
  await page.waitForFunction(({id,targetId})=>notesList.find(n=>n.id===id)?.notesV21?.links?.includes(targetId),{id,targetId});
  const count=await page.evaluate(()=>notesList.length);
  await card.locator('summary').click();await card.getByRole('button',{name:'استنساخ',exact:true}).click();
  assert.equal(await page.evaluate(()=>notesList.length),count+1);
  assert.equal(await page.evaluate(()=>new Set(notesList.map(n=>n.id)).size),count+1);
  results.push({scope:'real Notes overflow links another note and duplicates with unique numeric ID',status:'PASS'});
  assert.deepEqual(errors,[]);
 }catch(e){results.push({scope:'browser scenario',status:'FAIL',error:e.message});if(page)await page.screenshot({path:out+'/failure.png',fullPage:true});process.exitCode=1;}
 finally{fs.writeFileSync(out+'/results.json',JSON.stringify({environment:'desktop Chromium, disposable context, remote requests blocked',results,errors},null,2));console.log(JSON.stringify({passed:results.filter(r=>r.status==='PASS').length,failed:results.filter(r=>r.status==='FAIL'),errors},null,2));await browser.close();}
})();
