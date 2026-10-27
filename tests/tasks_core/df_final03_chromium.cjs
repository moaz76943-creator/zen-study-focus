'use strict';
const {createEvidenceDirectory}=require('../android_e2e_recovery/private_evidence.cjs');
// Genuine Chromium rendering regression for Track 08; no user/device data.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
 const evidence=createEvidenceDirectory(process.env.TRACK08_BROWSER_EVIDENCE,'track08-canonical-browser-');
 const browser=await chromium.launch({executablePath:process.env.TRACK08_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const report=[];
 try{
  for(const locale of ['en','ar'])for(const width of [320,360,393,430]){
   const page=await browser.newPage({viewport:{width,height:780},deviceScaleFactor:1});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.setContent('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><main id="host" style="padding:8px"></main></body></html>');
   await page.addScriptTag({path:path.resolve('android/app/src/main/assets/web/tasks_core_v21.js')});
   await page.addScriptTag({path:path.resolve('android/app/src/main/assets/web/tasks_studio.js')});
   await page.evaluate(locale=>{
    window.__taskState={cfg:{sessionHistory:[],extension:{keep:'cfg'}},tasksList:[
     {id:12,title:'مهمة قديمة بدون تاريخ',done:false,catKey:'study',extension:{keep:'task'}},
     {id:13,title:'Scheduled',done:false,catKey:'study',date:'2026-10-21'}
    ]};
    window.__commitCount=0;
    window.__studio=DeepFocusTasksStudioV21.mount(document.getElementById('host'),{
     locale,now:()=>new Date(2026,9,21),
     readState:()=>JSON.parse(JSON.stringify(window.__taskState)),
     commit(before,after){
      if(JSON.stringify(before)!==JSON.stringify(window.__taskState))throw new Error('Snapshot revision mismatch');
      window.__taskState=JSON.parse(JSON.stringify(after));window.__commitCount++;return true;
     }
    });
   },locale);
   assert.equal(await page.locator('#df-task-results .df-title').filter({hasText:'مهمة قديمة بدون تاريخ'}).count(),1);
   assert.equal(await page.evaluate(()=>window.__commitCount),0);
   const edit=locale==='ar'?'تعديل':'Edit';
   const save=locale==='ar'?'حفظ':'Save';
   const oldCard=page.locator('#df-task-results .df-task').filter({hasText:'مهمة قديمة بدون تاريخ'});
   await oldCard.getByRole('button',{name:edit,exact:true}).click();
   const form=page.locator('form.df-form');
   assert.equal(await form.locator('input[type="date"]').inputValue(),'');
   assert.equal(await form.locator('input[type="checkbox"]').first().isChecked(),false);
   await form.locator('input[type="text"]').first().fill('مهمة معدلة بدون تاريخ');
   await form.getByRole('button',{name:save,exact:true}).click();
   const state=await page.evaluate(()=>{
    const row=window.__taskState.tasksList.find(t=>t.id===12);
    return {task:row,datePresent:Object.hasOwn(row,'date'),duePresent:Object.hasOwn(row,'dueAssigned'),
     other:window.__taskState.tasksList.find(t=>t.id===13),commits:window.__commitCount,
     dir:document.querySelector('.df-tasks')?.getAttribute('dir'),
     overflow:document.documentElement.scrollWidth>window.innerWidth+1};
   });
   assert.equal(state.task.title,'مهمة معدلة بدون تاريخ');
   assert.equal(state.datePresent,false);
   assert.equal(state.duePresent,false);
   assert.deepEqual(state.task.extension,{keep:'task'});
   assert.equal(state.other.date,'2026-10-21');
   assert.equal(state.commits,1);
   assert.equal(state.dir,locale==='ar'?'rtl':'ltr');
   assert.equal(state.overflow,false,'Horizontal page overflow at '+width+'px');
   assert.deepEqual(errors,[]);
   evidence.write(locale+'-'+width+'.png',await page.screenshot({fullPage:true}));
   report.push({locale,width,source:'actual canonical Chromium DOM',passed:true,commits:1,noDateMutation:true,overflow:false,jsErrors:0});
   await page.close();
  }
  evidence.write('results.json',JSON.stringify({status:'PASS',cases:report},null,2));
  console.log('TRACK08_BROWSER_PASS',JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error('TRACK08_BROWSER_FAIL',e);process.exitCode=1;});
