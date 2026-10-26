'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const Studio=require('../../android/app/src/main/assets/web/analytics_studio.js');

function rig(onExport){
 const doc={createElement(tag){
   return {tagName:tag.toUpperCase(),children:[],attributes:{},events:{},style:{},value:'',textContent:'',className:'',disabled:false,
     setAttribute(k,v){this.attributes[k]=String(v);},
     getAttribute(k){return this.attributes[k]??null;},
     addEventListener(k,fn){this.events[k]=fn;},
     appendChild(c){this.children.push(c);if(this.tagName==='SELECT'&&!this.value)this.value=c.value;return c;},
     append(...cs){this.children.push(...cs);},
     replaceChildren(...cs){this.children=cs;},
     remove(){this.removed=true;}
   };
 }};
 const host={ownerDocument:doc,appendChild(x){this.child=x;}};
 const ui=Studio.mount(host,()=>({sessionHistory:[{id:1,date:'2026-10-26',domain:'study',minutes:5}],tasksList:[]}),{
   today:'2026-10-26',startDate:'2026-10-26',endDate:'2026-10-26',onExport
 });
 const filters=host.child.children.find(x=>x.className==='dfa-filters');
 const receipt=filters.children.find(x=>x.className==='dfa-export-status');
 const fields=filters.children.filter(x=>x.tagName==='LABEL').map(x=>x.children[0]);
 const exportButton=filters.children.find(x=>x.tagName==='BUTTON');
 return {ui,receipt,fields,button:exportButton};
}

test('CSV receipts are truthful: saved needs explicit acknowledgment; cancellation and rejection never report success',async()=>{
 let answer={status:'cancelled'};
 const r=rig(async()=>answer);
 assert.ok(r.receipt,'Accessible receipt element missing');
 assert.equal(r.receipt.getAttribute('role'),'status');
 await r.button.events.click();
 assert.match(r.receipt.textContent,/cancel|إلغاء/i);
 assert.doesNotMatch(r.receipt.textContent,/saved|حفظ/i);
 answer={status:'saved'};
 await r.button.events.click();
 assert.match(r.receipt.textContent,/saved|حفظ/i);
 answer={status:'failed'};
 await r.button.events.click();
 assert.match(r.receipt.textContent,/fail|error|تعذّر/i);
 answer=undefined;
 await r.button.events.click();
 assert.match(r.receipt.textContent,/fail|error|تعذّر/i);
 r.ui.destroy();
});

test('late CSV receipt cannot announce success after changed/invalid date; old picker cannot duplicate',async()=>{
 let finish,calls=0;
 const promise=new Promise(resolve=>{finish=resolve;});
 const r=rig(()=>{calls++;return promise;});
 const pending=r.button.events.click();
 await r.button.events.click();
 assert.equal(calls,1);
 r.fields[2].value='2026-10-27';r.fields[2].events.change();
 assert.equal(r.button.disabled,true);
 finish({status:'saved'});
 await pending;
 assert.equal(r.receipt.textContent,'','Late receipt must be ignored if user changed filters');
 assert.equal(r.button.disabled,true);
 r.ui.destroy();
});
