'use strict';
// Standalone real Chromium QA on disposable browser contexts; never operates on owner data.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const out=process.env.DF_COMPLETION_EVIDENCE||'/tmp/notes-complete';
fs.mkdirSync(out,{recursive:true});
const url=process.env.DF_COMPLETION_URL||'http://127.0.0.1:8770';
const results=[];
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const width of [320,393]){
   const context=await browser.newContext({viewport:{width,height:740},isMobile:true,hasTouch:true,permissions:['clipboard-read','clipboard-write']});
   await context.route('**/*',route=>new URL(route.request().url()).origin===new URL(url).origin?route.continue():route.abort());
   const page=await context.newPage();page.setDefaultTimeout(10000);
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   const title='Cornell QA '+width+' نص ٢';
   const body='☐ Study today\n☑ Reviewed\n<img src=x onerror=window.__NOTES_XSS=1>\n[visit](javascript:alert(1))';
   const card=()=>page.locator('.nsux-card').filter({has:page.getByRole('heading',{name:title,exact:true})});
   const step=async(name,fn)=>{
    try{const detail=await fn();results.push({width,scenario:name,status:'PASS',detail:detail||''});}
    catch(e){results.push({width,scenario:name,status:'FAIL',error:e.message});await page.screenshot({path:path.join(out,'failure-'+width+'-'+name.replace(/\W+/g,'-')+'.png'),fullPage:true}).catch(()=>{});throw e;}
   };
   try{
    await page.goto(url,{waitUntil:'load'});await page.evaluate(()=>applyLanguage('en'));await page.locator('#navNotes').click();
    await step('create Cornell with Unicode checklist and inert HTML',async()=>{
      await page.locator('#nsNewButton').click();
      await page.locator('#inpNoteTitle').fill(title);await page.locator('#inpNoteBody').fill(body);
      await page.locator('#selNoteCat').selectOption('cornell');
      const fields=page.locator('#nsux-cornell textarea');
      for(const [i,value] of ['Cue ٢','Notes العربية','Summary ü'].entries())await fields.nth(i).fill(value);
      await page.locator('#nsSaveButton').click();
      const note=await page.evaluate(t=>notesList.find(x=>x.title===t),title);
      assert.equal(note.body,body);assert.deepEqual([note.notesV21.cornell.cues,note.notesV21.cornell.notes,note.notesV21.cornell.summary],['Cue ٢','Notes العربية','Summary ü']);
      assert.equal(await page.locator('#noteModal').evaluate(x=>x.classList.contains('open')),false);
      assert.equal(await page.evaluate(()=>window.__NOTES_XSS||0),0);
      return {id:note.id,legacyType:typeof note.id};
    });
    await step('archive restore trash restore by real controls',async()=>{
      await card().locator('details summary').click();
      await card().getByRole('button',{name:'Archive',exact:true}).click();
      await page.locator('#nsux-status').selectOption('archived');
      assert.equal(await card().count(),1);
      await card().locator('details summary').click();
      await card().getByRole('button',{name:'Restore',exact:true}).click();
      await page.locator('#nsux-status').selectOption('active');
      await card().locator('details summary').click();
      await card().getByRole('button',{name:'Move to trash',exact:true}).click();
      await page.locator('#nsux-status').selectOption('trash');
      assert.equal(await card().count(),1);
      await card().getByRole('button',{name:'Restore',exact:true}).click();
      await page.locator('#nsux-status').selectOption('active');
      assert.equal(await card().count(),1);
      return 'Same numeric ID and full note preserved';
    });
    await step('edit with revision Undo and Redo',async()=>{
      await card().getByRole('button',{name:'Edit',exact:true}).click();
      await page.locator('#inpNoteBody').fill('New revision ٣ العربية');
      await page.locator('#nsSaveButton').click();
      await card().locator('details summary').click();
      await card().getByRole('button',{name:'Undo',exact:true}).click();
      assert.equal(await page.evaluate(t=>notesList.find(n=>n.title===t).body,title),body);
      await card().locator('details summary').click();
      await card().getByRole('button',{name:'Redo',exact:true}).click();
      assert.equal(await page.evaluate(t=>notesList.find(n=>n.title===t).body,title),'New revision ٣ العربية');
    });
    await step('autosave draft survives browser restart, restore retains authored text',async()=>{
      await card().getByRole('button',{name:'Edit',exact:true}).click();
      await page.locator('#inpNoteBody').fill('UNSAVED DRAFT نص خاص ٢');
      await page.waitForTimeout(850);
      assert.equal(await page.evaluate(()=>loadFortressData('deep_focus_unsaved_note_draft_v1',null)?.body),'UNSAVED DRAFT نص خاص ٢');
      await page.reload();await page.locator('#navNotes').click();
      await card().getByRole('button',{name:'Edit',exact:true}).click();
      await page.locator('#nsDraftRestore').click();
      assert.equal(await page.locator('#inpNoteBody').inputValue(),'UNSAVED DRAFT نص خاص ٢');
      assert.equal(await page.evaluate(t=>notesList.find(n=>n.title===t).body,title),'New revision ٣ العربية');
      await page.locator('#nsSaveButton').click();
      assert.equal(await page.evaluate(t=>notesList.find(n=>n.title===t).body,title),'UNSAVED DRAFT نص خاص ٢');
    });
    await step('render 1000 and 5000 notes without changing persisted records',async()=>{
      const evidence=await page.evaluate(()=>{
       const prev=notesList,original=JSON.stringify(prev),search=document.getElementById('inpSearchNotes');
       const timings=[];
       try{
        for(const size of [1000,5000]){
         const records=Array.from({length:size},(_,i)=>({id:100000+i,isStarter:false,title:'Note '+i,body:i%10===0?'needle <script>unsafe</script>':'plain',catKey:i%2?'quick':'cornell',pinned:i===0,notesV21:{tags:['bench'],notebookId:'bench'},createdAt:i+1,updatedAt:i+1}));
         notesList=records; search.value='';let start=performance.now();renderNotesStack();const mountMs=performance.now()-start;
         const rendered=document.querySelectorAll('.nsux-card').length;
         search.value='needle';start=performance.now();renderNotesStack();const filterMs=performance.now()-start;
         const summary=document.getElementById('nsVisibleCount').textContent;
         timings.push({size,mountMs,filterMs,rendered,filtered:summary});
        }
       }finally{notesList=prev;search.value='';renderNotesStack();}
       return {timings,persistedUnchanged:JSON.stringify(notesList)===original,scriptExecuted:window.__NOTES_XSS||0};
      });
      assert.equal(evidence.persistedUnchanged,true);
      assert.equal(evidence.scriptExecuted,0);
      for(const x of evidence.timings){assert.ok(x.rendered<=100&&x.rendered>0);assert.match(x.filtered,/100 \/ [0-9]+/);}
      return evidence.timings;
    });
    assert.deepEqual(errors,[]);
   }catch(e){process.exitCode=1;}
   finally{await context.close();}
  }
 }finally{
  const total=results.length,pass=results.filter(x=>x.status==='PASS').length,fail=results.filter(x=>x.status==='FAIL').length;
  const report={environment:'Chromium mobile touch emulation, 320/393px, fresh disposable contexts',total,pass,fail,results,androidAcceptance:'SEPARATE'};
  fs.writeFileSync(path.join(out,'notes-complete.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({total,pass,fail,errors:results.filter(x=>x.status==='FAIL')}));
  await browser.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
