'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Studio=require('../../android/app/src/main/assets/web/analytics_studio.js');
const Digits=require('../../android/app/src/main/assets/web/numerals_ascii_v21.js');

const integration=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/assets/web/integration_v22.js'),'utf8');
function fixture(onExport){
 const doc={createElement(tag){return {tagName:tag.toUpperCase(),children:[],style:{},attributes:{},value:'',events:{},textContent:'',
  setAttribute(k,v){this.attributes[k]=v;},getAttribute(k){return this.attributes[k];},
  addEventListener(k,fn){this.events[k]=fn;},appendChild(child){this.children.push(child);if(this.tagName==='SELECT'&&!this.value)this.value=child.value;return child;},
  append(...children){this.children.push(...children);},replaceChildren(...children){this.children=children;},remove(){this.removed=true;}};}};
 const target={ownerDocument:doc,appendChild(n){this.child=n;}};
 const values={sessionHistory:[{id:100,date:'2026-10-19',domain:'study',minutes:25}],tasksList:[],projects:[]};
 const mounted=Studio.mount(target,()=>values,{locale:'de',today:'2026-10-20',startDate:'2026-10-01',endDate:'2026-10-20',onExport});
 const box=target.child,filters=box.children.find(x=>x.className==='dfa-filters');
 const fields=filters.children.filter(x=>x.tagName==='LABEL').map(x=>x.children[0]);
 return {mounted,box,fields,exportButton:filters.children.find(x=>x.tagName==='BUTTON'),
  status:box.children.find(x=>x.attributes?.role==='status')};
}
test('all-language Studio export must be wired to Android native SAF adapter, not silent WebView fallback',()=>{
 const i=integration.slice(integration.indexOf('function mountAnalytics()'),integration.indexOf('function refreshLocale()'));
 assert.match(i,/DeepFocusAnalyticsStudioV21\.mount[\s\S]*?onExport\s*:/);
 assert.match(i,/onExport\s*:\s*.*saveCsvThroughAndroid/);
});
test('native CSV Export click awaits actual file result; blocks repeated taps and never claims false success',async()=>{
 let resolve;const csv=new Promise(ok=>resolve=ok);let submits=0;
 const x=fixture((body,name,type)=>{submits++;assert.match(body,/2026-10-19/);assert.equal(name,'deep-focus-sessions.csv');return csv;});
 const click=x.exportButton.events.click();
 assert.equal(x.exportButton.disabled,true);
 x.exportButton.events.click();
 assert.equal(submits,1,'one pending SAF export at a time');
 resolve({status:'failed'});
 await click;
 assert.equal(x.exportButton.disabled,false);
 assert.match(x.status.textContent,/⚠/);
 assert.doesNotMatch(x.status.textContent,/✓/);
});
test('filter buttons must change domain, grouping and date range and never export stale invalid report',async()=>{
 let count=0;
 const x=fixture(()=>{count++;return Promise.resolve({status:'saved'});});
 x.fields[0].value='read';x.fields[0].events.change();
 assert.equal(x.mounted.getReport().totals.sessions,0,'domain filter is active');
 x.fields[0].value='study';x.fields[0].events.change();
 assert.equal(x.mounted.getReport().totals.minutes,25);
 x.fields[1].value='weekly';x.fields[1].events.change();
 assert.equal(x.fields[1].value,'weekly');
 x.fields[2].value='2030-10-20';x.fields[2].events.change();
 await x.exportButton.events.click();
 assert.equal(count,0,'invalid range must not export cached data');
 x.fields[2].value='2026-10-18';x.fields[2].events.change();
 await x.exportButton.events.click();
 assert.equal(count,1);
});
test('Western digits normalizer covers Arabic, Persian, Hindi and Bengali characters',()=>{
 assert.equal(Digits.toAsciiDigits('٠١٢٣٤٥٦٧٨٩ ۰۱۲۳۴۵۶۷۸۹ ०१२३४५६७८९ ০১২৩৪৫৬৭৮৯'),
 '0123456789 0123456789 0123456789 0123456789');
});
test('generated counter conversion never changes task or note content',()=>{
 const user={textContent:'ملاحظة ١٢٣',closest:()=>({}),tagName:'SPAN',childElementCount:0,
  getAttribute:()=>null,setAttribute(){throw Error('unsafe user change');}};
 const generated={textContent:'جلسة ١٢ | ۲۰',tagName:'SPAN',childElementCount:0,style:{},
  closest:()=>null,getAttribute:()=>null,setAttribute(){}};
 const scope={matches:()=>false,querySelectorAll:()=>[user,generated]};
 assert.equal(Digits.normalizeGeneratedUi(scope),1);
 assert.equal(user.textContent,'ملاحظة ١٢٣');
 assert.equal(generated.textContent,'جلسة 12 | 20');
});
