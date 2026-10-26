'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const Core=require('../../android/app/src/main/assets/web/analytics_core_v21.js');
const Studio=require('../../android/app/src/main/assets/web/analytics_studio.js');

test('Analytics excludes template/demo task sources from linked sessions and task totals',()=>{
 const history=[{id:'a',date:'2026-10-26',domain:'study',minutes:12,taskId:7},
  {id:'b',date:'2026-10-26',domain:'study',minutes:8,taskId:8},
  {id:'c',date:'2026-10-26',domain:'study',minutes:4,taskId:9},
  {id:'d',date:'2026-10-26',domain:'study',minutes:3,taskId:10}];
 const data={sessionHistory:history,tasksList:[
  {id:7,title:'demo source',done:false,source:'demo'},
  {id:8,title:'sample source',done:false,source:'sample'},
  {id:9,title:'fixture source',done:false,source:'fixture'},
  {id:10,title:'real authored task',done:false,source:'user'}]};
 const before=JSON.stringify(data);
 const report=Core.buildReport(data,{today:'2026-10-26',startDate:'2026-10-26',endDate:'2026-10-26'});
 assert.deepEqual(report.sessions.map(row=>row.taskId),[null,null,null,10]);
 assert.equal(report.tasks.total,1);
 assert.equal(report.totals.sessions,4,'Real session totals must not be lost just because a link is unsafe');
 assert.equal(report.totals.minutes,27);
 assert.equal(JSON.stringify(data),before);
 assert.doesNotMatch(Core.toCSV(report),/taskId|demo source/,'Keep existing CSV schema untouched');
});

test('A linked task that becomes a demo source after render does not navigate',()=>{
 const tasksList=[{id:42,title:'Real task',done:false,source:'user'}];
 const data={sessionHistory:[{id:11,date:'2026-10-26',domain:'work',minutes:9,taskId:42}],tasksList};
 const doc={createElement(tag){return {
  tagName:tag.toUpperCase(),children:[],attributes:{},events:{},style:{},value:'',textContent:'',className:'',disabled:false,
  setAttribute(k,v){this.attributes[k]=String(v);},getAttribute(k){return this.attributes[k]??null;},
  addEventListener(k,fn){this.events[k]=fn;},appendChild(c){this.children.push(c);if(this.tagName==='SELECT'&&!this.value)this.value=c.value;return c;},
  append(...cs){this.children.push(...cs);},replaceChildren(...cs){this.children=cs;},remove(){}
 };}};
 const host={ownerDocument:doc,appendChild(c){this.child=c;}},opened=[];
 const ui=Studio.mount(host,()=>data,{today:'2026-10-26',startDate:'2026-10-26',endDate:'2026-10-26',
  onOpenTask:id=>opened.push(id)});
 const panel=host.child.children.find(x=>x.className==='dfa-insight-kpis');
 panel.children[0].events.click();
 const detail=host.child.children.find(x=>x.className==='dfa-session-drilldown');
 const buttons=[];
 function visit(el){if(el.tagName==='BUTTON')buttons.push(el);for(const ch of el.children||[])visit(ch);}
 visit(detail);
 assert.equal(buttons.length,1);
 tasksList[0].source='demo';
 buttons[0].events.click();
 assert.deepEqual(opened,[]);
 ui.destroy();
});
