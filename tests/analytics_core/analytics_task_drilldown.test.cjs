'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const Core=require('../../android/app/src/main/assets/web/analytics_core_v21.js');
const Studio=require('../../android/app/src/main/assets/web/analytics_studio.js');
const data={sessionHistory:[
 {id:'ok',date:'2026-10-26',domain:'study',minutes:12,taskId:5},
 {id:'missing',date:'2026-10-26',domain:'study',minutes:2,taskId:6},
 {id:'archived',date:'2026-10-26',domain:'study',minutes:3,taskId:7},
 {id:'duplicate',date:'2026-10-26',domain:'study',minutes:4,taskId:8},
 {id:'bad-negative',date:'2026-10-26',domain:'study',minutes:5,taskId:-1},
 {id:'rest',date:'2026-10-26',domain:'study',minutes:900,taskId:5,mode:'rest'}
],tasksList:[
 {id:5,title:'تركيز ۲',done:false},
 {id:7,title:'Archived',done:false,archived:true},
 {id:8,title:'Dup A',done:false},
 {id:8,title:'Dup B',done:false}
]};
test('Analytics links only valid unique real tasks without modifying history or losing genuine totals',()=>{
 const before=JSON.stringify(data),r=Core.buildReport(data,{
  today:'2026-10-26',startDate:'2026-10-26',endDate:'2026-10-26'
 });
 assert.deepEqual(r.sessions.map(s=>s.taskId),[5,null,null,null,null]);
 assert.equal(r.totals.minutes,26);
 assert.equal(JSON.stringify(data),before);
 assert.doesNotMatch(Core.toCSV(r),/taskId/,'Existing machine CSV schema must remain unchanged');
});
test('Accessible session details invoke navigation only for verified task links',()=>{
 const doc={createElement(tag){return {
  tagName:tag.toUpperCase(),children:[],attributes:{},events:{},style:{},value:'',textContent:'',className:'',disabled:false,
  setAttribute(k,v){this.attributes[k]=String(v);},getAttribute(k){return this.attributes[k]??null;},
  addEventListener(k,fn){this.events[k]=fn;},appendChild(c){this.children.push(c);if(this.tagName==='SELECT'&&!this.value)this.value=c.value;return c;},
  append(...cs){this.children.push(...cs);},replaceChildren(...cs){this.children=cs;},remove(){}};}};
 const host={ownerDocument:doc,appendChild(c){this.child=c;}},opened=[];
 const ui=Studio.mount(host,()=>data,{today:'2026-10-26',startDate:'2026-10-26',endDate:'2026-10-26',
  onOpenTask:id=>{opened.push(id);}});
 const panel=host.child.children.find(x=>x.className==='dfa-insight-kpis');
 panel.children[0].events.click();
 const detail=host.child.children.find(x=>x.className==='dfa-session-drilldown');
 const found=[];function walk(node){if(node.tagName==='BUTTON')found.push(node);for(const child of node.children||[])walk(child);}walk(detail);
 assert.equal(found.length,1,'Only one unique non-demo non-archived linked task should be interactive');
 assert.equal(found[0].getAttribute('data-task-id'),'5');
 found[0].events.click();assert.deepEqual(opened,[5]);
 ui.destroy();
});
