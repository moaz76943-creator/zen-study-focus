'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const context=await b.newContext();await context.addInitScript(()=>{delete Element.prototype.replaceChildren;delete DocumentFragment.prototype.replaceChildren;});
  const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(process.env.DF_COMPLETION_URL||'http://127.0.0.1:8770');
  await p.locator('#navTasks').click();assert.ok(await p.locator('.df-quick input').count());
  await p.locator('#navNotes').click();await p.locator('#nsNewButton').click();
  await p.locator('#inpNoteTitle').fill('Compatibility fixture');await p.locator('#inpNoteBody').fill('Preserved العربية ٢');await p.locator('#nsSaveButton').click();
  assert.equal(await p.evaluate(()=>notesList.find(n=>n.title==='Compatibility fixture').body),'Preserved العربية ٢');
  const result=await p.evaluate(()=>{
   const box=document.createElement('div'),child=document.createElement('b');child.textContent='kept';box.appendChild(child);
   box.replaceChildren(child,'<img onerror=alert(1)>');
   const textSafe=box.childNodes.length===2&&box.lastChild.nodeType===3&&box.querySelector('img')===null;
   const before=box.innerHTML;let rejected=false;try{box.replaceChildren('changed',box);}catch(e){rejected=e.name==='HierarchyRequestError';}
   const preserved=box.innerHTML===before;box.replaceChildren();
   return {textSafe,rejected,preserved,empty:box.childNodes.length===0};
  });assert.deepEqual(result,{textSafe:true,rejected:true,preserved:true,empty:true});assert.deepEqual(errors,[]);
  console.log('PASS: missing replaceChildren full-app bootstrap, task/notes UI, save, text injection boundary, invalid-node preservation and clear');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
