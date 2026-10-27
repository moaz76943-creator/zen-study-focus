'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const source=fs.readFileSync(path.join(__dirname,'../../android/app/src/main/assets/web/app.js'),'utf8');
const start=source.indexOf('const ShareCardEngine = '),end=source.indexOf('window.ShareCardEngine = ShareCardEngine;',start);
assert.ok(start>=0&&end>start);
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage();
  await page.route('https://deep-focus.test/**',route=>route.fulfill({contentType:'text/html',body:'<div class="stat-mins"></div>'}));
  await page.goto('https://deep-focus.test/');
  const payload='<img src=x onerror="window.__shareCardInjected=true"> & "user text"';
  await page.evaluate(value=>{
   localStorage.setItem('df_focused_task_text',value);
   localStorage.setItem('df_streak_count',value);
   document.querySelector('.stat-mins').textContent=value;
   Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.__copied=text;}}});
   window.alert=()=>{};
  },payload);
  await page.addScriptTag({content:source.slice(start,end)+'window.ShareCardEngine=ShareCardEngine;'});
  await page.evaluate(()=>ShareCardEngine.showShareCardModal());
  assert.equal(await page.locator('#df-share-card-modal img').count(),0,'stored and rendered text must never become HTML');
  assert.equal(await page.evaluate(()=>Boolean(window.__shareCardInjected)),false);
  for(const id of ['df-share-task','df-share-streak','df-share-mins'])
   assert.equal(await page.locator('#'+id).textContent(),payload,'authored text preserved at '+id);
  await page.locator('#df-copy-summary-btn').click();
  assert.ok((await page.evaluate(()=>window.__copied)).includes(payload),'clipboard retains literal user text');
  await page.locator('#df-share-close').click();
  assert.equal(await page.locator('#df-share-card-modal').count(),0);
  console.log('PASS: actual share-card DOM rejects stored/metric HTML and preserves literal copied text');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
