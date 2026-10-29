'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const S=require('../../android/app/src/main/assets/web/analytics_studio.js');
function rig(onExport){
 let nativeBackup=0,blobDownloads=0;
 const doc={defaultView:{
   ZenNative:{exportBackupToFile(){nativeBackup++;}},
   Blob:class{},URL:{createObjectURL(){blobDownloads++;return 'blob:dummy';},revokeObjectURL(){}},
   setTimeout(fn){fn();}
 },createElement(tag){
   return {tagName:tag.toUpperCase(),children:[],attributes:{},events:{},style:{},value:'',textContent:'',className:'',disabled:false,
    setAttribute(k,v){this.attributes[k]=String(v);},getAttribute(k){return this.attributes[k]??null;},
    addEventListener(k,fn){this.events[k]=fn;},
    appendChild(c){this.children.push(c);if(this.tagName==='SELECT'&&!this.value)this.value=c.value;return c;},
    append(...cs){this.children.push(...cs);},replaceChildren(...cs){this.children=cs;},
    click(){blobDownloads++;},remove(){}};
 }};
 const host={ownerDocument:doc,appendChild(c){this.child=c;}};
 const opts={today:'2026-10-26',startDate:'2026-10-26',endDate:'2026-10-26'};
 if(onExport)opts.onExport=onExport;
 const ui=S.mount(host,()=>({sessionHistory:[{id:'g',date:'2026-10-26',domain:'study',minutes:5}]}),opts);
 const filters=host.child.children.find(e=>e.className==='dfa-filters');
 const btn=filters.children.find(e=>e.tagName==='BUTTON');
 const status=filters.children.find(e=>e.className==='dfa-export-status');
 const fields=filters.children.filter(e=>e.tagName==='LABEL').map(e=>e.children[0]);
 return {ui,btn,status,fields,getNativeCalls:()=>nativeBackup,getBlobCalls:()=>blobDownloads};
}
test('Android WebView never falls back to an unsupported Blob download for CSV without verified native adapter',async()=>{
 const r=rig();
 assert.equal(r.btn.disabled,true,'Native WebView has no CSV Save callback and must fail closed');
 assert.match(r.status.textContent,/unavailable|غير متاح/i);
 await r.btn.events.click();
 assert.equal(r.getNativeCalls(),0,'Backup file API must never receive raw analytics CSV');
 assert.equal(r.getBlobCalls(),0,'WebView must not simulate successful document save');
 r.fields[2].value='2026-10-27';r.fields[2].events.change();
 r.fields[2].value='2026-10-26';r.fields[2].events.change();
 assert.equal(r.btn.disabled,true,'Valid range cannot unlock absent native CSV bridge');
 r.ui.destroy();
});
test('When a real native adapter is injected, its saved/cancelled/failed receipts remain available',async()=>{
 let calls=0;
 const r=rig(async()=>{calls++;return {status:'saved'};});
 assert.equal(r.btn.disabled,false);
 await r.btn.events.click();
 assert.equal(calls,1);
 assert.match(r.status.textContent,/saved|حفظ/i);
 assert.equal(r.getBlobCalls(),0);
 assert.equal(r.getNativeCalls(),0);
 r.ui.destroy();
});
