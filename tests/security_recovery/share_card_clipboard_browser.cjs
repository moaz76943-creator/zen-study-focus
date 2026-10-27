'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const source=fs.readFileSync(path.join(__dirname,'../../android/app/src/main/assets/web/app.js'),'utf8');
const start=source.indexOf('const ShareCardEngine = '),end=source.indexOf('window.ShareCardEngine = ShareCardEngine;',start);
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  for(const button of ['df-copy-summary-btn','df-native-share-btn'])for(const result of ['resolve','reject','missing']){
   const page=await browser.newPage();
   await page.route('https://deep-focus.test/**',route=>route.fulfill({contentType:'text/html',body:'<div class="stat-mins">25</div>'}));
   await page.goto('https://deep-focus.test/');
   await page.evaluate(result=>{
    localStorage.setItem('df_focused_task_text','literal task & text');window.__alerts=[];
    window.alert=msg=>window.__alerts.push(msg);
    Object.defineProperty(navigator,'share',{value:undefined});
    Object.defineProperty(navigator,'clipboard',{value:result==='missing'?undefined:{writeText:text=>{
     window.__copyText=text;
     return new Promise((resolve,reject)=>{window.__resolveCopy=resolve;window.__rejectCopy=reject;});
    }}});
   },result);
   await page.addScriptTag({content:source.slice(start,end)+'window.ShareCardEngine=ShareCardEngine;'});
   await page.evaluate(()=>ShareCardEngine.showShareCardModal());
   await page.locator('#'+button).click();
   if(result!=='missing'){
    assert.deepEqual(await page.evaluate(()=>window.__alerts),[],'pending write must not announce success');
    await page.evaluate(result=>result==='resolve'?window.__resolveCopy():window.__rejectCopy(Error('Disposable refusal')),result);
   }
   await page.waitForFunction(()=>window.__alerts.length===1);
   const message=await page.evaluate(()=>window.__alerts[0]);
   if(result==='resolve')assert.match(message,/copied/i);
   else {assert.doesNotMatch(message,/copied/i);assert.match(message,/could not copy/i);}
   assert.equal(await page.locator('#df-share-task').textContent(),'literal task & text');
   if(result!=='missing')assert.ok((await page.evaluate(()=>window.__copyText)).includes('literal task & text'));
   await page.close();
  }
  console.log('PASS: both share-card copy paths wait for ACK; rejected/unavailable clipboard never announces success');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
