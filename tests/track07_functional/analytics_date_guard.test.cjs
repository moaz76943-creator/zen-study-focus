'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const Studio=require('../../android/app/src/main/assets/web/analytics_studio.js');

function rig(){
 const doc={createElement(tag){return {tagName:tag.toUpperCase(),children:[],style:{},value:'',events:{},
  setAttribute(key,val){(this.attributes??={})[key]=val;},addEventListener(key,fn){this.events[key]=fn;},
  appendChild(node){this.children.push(node);if(this.tagName==='SELECT'&&!this.value)this.value=node.value;return node;},
  replaceChildren(...nodes){this.children=nodes;},append(...nodes){this.children.push(...nodes);},remove(){this.removed=true;}};}};
 const target={ownerDocument:doc,children:[],appendChild(node){this.children.push(node);}};
 let exports=0;
 const mount=Studio.mount(target,()=>({sessionHistory:[{id:'logged',date:'2026-10-19',domain:'study',minutes:25}],tasksList:[]}),
  {today:'2026-10-19',startDate:'2026-10-18',endDate:'2026-10-19',onExport(){exports++;}});
 const wrapper=target.children[0],filters=wrapper.children.find(x=>x.className==='dfa-filters');
 const fields=filters.children.filter(x=>x.tagName==='LABEL').map(x=>x.children[0]);
 const exportBtn=filters.children.find(x=>x.tagName==='BUTTON');
 return {mount,wrapper,start:fields[2],end:fields[3],exportBtn,exports:()=>exports};
}
test('07-05 invalid analytics date range is reported rather than throwing or exporting stale data',()=>{
 const ctx=rig();
 assert.equal(ctx.mount.getReport().totals.minutes,25);
 ctx.start.value='2026-11-01';
 assert.doesNotThrow(()=>ctx.start.events.change(),'Date-picker mistakes must not crash Analytics');
 assert.equal(ctx.mount.getReport().totals.minutes,25,'Last validated report remains intact');
 assert.ok(ctx.wrapper.children.some(x=>x.attributes?.['aria-live']==='polite'&&x.textContent),
  'Provide a visible accessible range validation message');
 ctx.exportBtn.events.click();assert.equal(ctx.exports(),0,'Do not export a stale report for invalid filter dates');
 ctx.start.value='2026-10-19';assert.doesNotThrow(()=>ctx.start.events.change());
 ctx.exportBtn.events.click();assert.equal(ctx.exports(),1,'Export resumes after a valid date is selected');
});
