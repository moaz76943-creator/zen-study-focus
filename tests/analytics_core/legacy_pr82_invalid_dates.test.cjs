'use strict';
// Forward-port of old PR #82's unsafe analytics-date repro onto current DF99 UI.
// Test live code behavior; the old branch's stale render implementation must not be copied.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const Studio=require('../../android/app/src/main/assets/web/analytics_studio.js');

function rig(){
 const doc={createElement(tag){
  return {tagName:tag.toUpperCase(),children:[],style:{},value:'',events:{},attributes:{},
   setAttribute(key,val){this.attributes[key]=val;},
   addEventListener(key,fn){this.events[key]=fn;},
   appendChild(node){this.children.push(node);if(this.tagName==='SELECT'&&!this.value)this.value=node.value;return node;},
   replaceChildren(...nodes){this.children=nodes;},
   append(...nodes){this.children.push(...nodes);},
   remove(){this.removed=true;}};
 }};
 const target={ownerDocument:doc,children:[],appendChild(node){this.children.push(node);}};
 let exports=0;
 const source={cfg:{sessionHistory:[{id:'recorded',date:'2026-10-19',domain:'study',minutes:25}]},tasksList:[]};
 const instance=Studio.mount(target,()=>source,{today:'2026-10-19',startDate:'2026-10-18',
  endDate:'2026-10-19',onExport(csv){exports++;assert.match(csv,/2026-10-19/);}});
 const wrapper=target.children[0];
 const filters=wrapper.children.find(x=>x.className==='dfa-filters');
 const fields=filters.children.filter(x=>x.tagName==='LABEL').map(x=>x.children[0]);
 const exportBtn=filters.children.find(x=>x.tagName==='BUTTON');
 const error=wrapper.children.find(x=>x.attributes?.role==='alert');
 return {instance,fields,exportBtn,error,exports:()=>exports};
}

test('legacy PR82: inverted date range blocks stale export without throwing',()=>{
 const x=rig();
 assert.equal(x.instance.getReport().totals.minutes,25);
 x.fields[2].value='2026-11-01';
 assert.doesNotThrow(()=>x.fields[2].events.change());
 assert.equal(x.instance.getReport(),null);
 assert.equal(x.exportBtn.disabled,true);
 assert.equal(x.fields[2].attributes['aria-invalid'],'true');
 assert.equal(x.error.hidden,false);
 assert.ok(x.error.textContent);
 x.exportBtn.events.click();
 assert.equal(x.exports(),0);
 x.fields[2].value='2026-10-18';
 x.fields[2].events.change();
 assert.equal(x.instance.getReport().totals.minutes,25);
 assert.equal(x.exportBtn.disabled,false);
 x.exportBtn.events.click();
 assert.equal(x.exports(),1);
 x.instance.destroy();
});

test('legacy PR82: malformed and oversized date ranges remain blocked',()=>{
 const x=rig();
 for(const from of ['not-a-date','2000-01-01']){
  x.fields[2].value=from;
  assert.doesNotThrow(()=>x.fields[2].events.change());
  assert.equal(x.instance.getReport(),null);
  assert.equal(x.exportBtn.disabled,true);
  x.exportBtn.events.click();
  assert.equal(x.exports(),0);
 }
 x.instance.destroy();
});
