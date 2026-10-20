'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const UI=require('../../android/app/src/main/assets/web/analytics_recovery_ui.js');
function setup(){
 const elements=[];
 const doc={createElement(tag){
  const el={tagName:tag.toUpperCase(),children:[],style:{},attributes:{},events:{},value:'',textContent:'',
    setAttribute(k,v){this.attributes[k]=v;},getAttribute(k){return this.attributes[k];},
    addEventListener(k,fn){this.events[k]=fn;},
    appendChild(child){this.children.push(child);if(this.tagName==='SELECT'&&!this.value)this.value=child.value;return child;},
    append(...nodes){this.children.push(...nodes);},replaceChildren(...nodes){this.children=nodes;},
    remove(){this.removed=true;}};
  elements.push(el);return el;
 }};
 const target={ownerDocument:doc,children:[],appendChild(x){this.children.push(x);}};
 let release,saveCalls=0;
 const pending=new Promise(r=>release=r);
 const saver=()=>{saveCalls++;return pending;};
 const m=UI.mount(target,()=>({sessionHistory:[{id:17,date:'2026-10-19',domain:'study',minutes:35}],tasksList:[],projects:[]}),{
  locale:'en',today:'2026-10-20',startDate:'2026-10-17',endDate:'2026-10-20',saveCSV:saver
 });
 const w=target.children[0],filters=w.children.find(el=>el.className==='dfar-controls');
 const selects=filters.children.filter(x=>x.tagName==='LABEL').map(x=>x.children[1]);
 const buttons=filters.children.filter(x=>x.tagName==='BUTTON');
 const status=w.children.find(x=>x.className==='dfar-status');
 return {m,selects,buttons,status,resolve:release,saves:()=>saveCalls,wrapper:w};
}
test('native export stays disabled if dates become invalid while Android SAF chooser is pending',async()=>{
 const v=setup(),[domain,group,from,to,kind]=v.selects,[reset,exportBtn]=v.buttons;
 assert.equal(exportBtn.disabled,false);
 const p=exportBtn.events.click();
 assert.equal(exportBtn.disabled,true);
 from.value='2030-01-01';from.events.change();
 assert.equal(exportBtn.disabled,true);
 v.resolve({status:'saved'});
 await p;
 assert.equal(exportBtn.disabled,true,'SAF callback must not reactivate Export with invalid dates');
 await exportBtn.events.click();
 assert.equal(v.saves(),1,'must not export previously cached sessions with invalid filters');
 from.value='2026-10-18';from.events.change();
 assert.equal(exportBtn.disabled,false);
 group.value='weekly';group.events.change();assert.equal(group.value,'weekly');
 domain.value='read';domain.events.change();assert.equal(v.m.getReport().totals.sessions,0);
 reset.events.click();
 assert.equal(from.value,'2026-09-21');
 assert.equal(to.value,'2026-10-20');
 assert.equal(domain.value,'all');assert.equal(group.value,'daily');
 v.m.destroy();
});
