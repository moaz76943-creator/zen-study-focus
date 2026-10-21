'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const output=process.env.DF_BUTTON_BINDING_EVIDENCE||'/tmp/deep-focus-all-buttons';
const base=process.env.DF_COMPLETION_URL||'http://127.0.0.1:8770';
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:393,height:830}});
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>{
   const native=EventTarget.prototype.addEventListener;
   const entries=new WeakMap();
   EventTarget.prototype.addEventListener=function(type,listener,opts){
    if(type==='click'||type==='change'||type==='input'){
     const set=entries.get(this)||new Set();
     set.add(type);
     entries.set(this,set);
    }
    return native.call(this,type,listener,opts);
   };
   window.__buttonAuditListeners=entries;
  });
  await page.goto(base+'/index.html',{waitUntil:'load'});
  const reports=[];
  for(const lang of ['en','ar','de','fa','bn']){
   const report=await page.evaluate(lang=>{
    applyLanguage(lang);
    const entries=window.__buttonAuditListeners;
    const controls=[...document.querySelectorAll('button,input,select,textarea,[role="button"]')];
    const counts={withInline:0,withListener:0,delegatedCandidates:0};
    const broken=[],unassigned=[],unlabeled=[];
    const root=Object.getPrototypeOf(window);
    for(const [index,el] of controls.entries()){
      if(el.matches('input[type="hidden"]'))continue;
      const snippets=[];
      for(const attr of ['onclick','onchange','oninput','onsubmit']){
       const code=el.getAttribute(attr);
       if(!code)continue;
       counts.withInline++;
       const handler=code.trim().match(/^([A-Za-z_$][A-Za-z_0-9$]*)\s*\(/);
       if(handler){
        // Check global binding without executing anything destructive.
        const exists=(typeof window[handler[1]]==='function');
        if(!exists)broken.push({tag:el.tagName,id:el.id||null,handler:handler[1],attr,code:code.slice(0,100)});
       }
       snippets.push(attr+':'+code.slice(0,80));
      }
      const listeners=entries.get(el);
      if(listeners?.size)counts.withListener++;
      if(!snippets.length&&!listeners?.size&&(el.tagName==='BUTTON'||el.getAttribute('role')==='button')){
       const parent=el.parentElement;
       const parentListener=parent&&entries.get(parent);
       if(!parentListener?.size)unassigned.push({id:el.id||null,label:(el.textContent||'').trim().slice(0,70),html:el.outerHTML.slice(0,130),index});
       else counts.delegatedCandidates++;
      }
      if(el.tagName==='BUTTON'){
       const rect=el.getBoundingClientRect();
       const visible=rect.width>0&&rect.height>0&&getComputedStyle(el).visibility!=='hidden';
       const label=(el.getAttribute('aria-label')||el.getAttribute('title')||(el.textContent||'').trim()).trim();
       if(visible&&!label)unlabeled.push({id:el.id||null,html:el.outerHTML.slice(0,160)});
      }
    }
    return {lang,totalControls:controls.length,broken,unassigned,unlabeled,counts};
   },lang);
   reports.push(report);
  }
  fs.mkdirSync(output,{recursive:true});
  fs.writeFileSync(output+'/control-binding-source-observed.json',JSON.stringify({reports,errors,
   limitations:'Bindings and accessible name check. Does NOT prove functional click postconditions; unassigned may use delegated listeners or native controls.'},null,2));
  const broken=reports.flatMap(r=>r.broken.map(x=>({lang:r.lang,...x})));
  console.log(JSON.stringify({locales:reports.length,totalRendered:reports[0].totalControls,
    brokenInlineBindings:broken.length,
    unassignedCandidates:reports[0].unassigned.length,
    unlabeledVisibleButtons:reports[0].unlabeled.length,
    pageErrors:errors.length,
    examples:broken.slice(0,5),unassignedExamples:reports[0].unassigned.slice(0,45)}));
  assert.deepEqual(broken,[],'Broken static inline button handlers must not ship');
  assert.deepEqual(errors,[],'Unhandled JS errors must not ship');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
