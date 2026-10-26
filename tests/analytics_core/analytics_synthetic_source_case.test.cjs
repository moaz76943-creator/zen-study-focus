'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const Core=require('../../android/app/src/main/assets/web/analytics_core_v21.js');
const Studio=require('../../android/app/src/main/assets/web/analytics_studio.js');

test('Synthetic sources are excluded regardless of ASCII case or surrounding whitespace',()=>{
 const source={
  sessionHistory:[
   {id:1,date:'2026-10-26',minutes:500,domain:'study',source:' DEMO '},
   {id:2,date:'2026-10-26',minutes:7,domain:'study',source:'user'}
  ],
  tasksList:[
   {id:21,title:'fake task',done:true,source:' Fixture '},
   {id:22,title:'actual task',done:false,source:'user',projectId:41}
  ],
  projects:[{id:41,name:'fake project',source:' SAMPLE '}]
 };
 const before=JSON.stringify(source);
 const report=Core.buildReport(source,{today:'2026-10-26',startDate:'2026-10-26',endDate:'2026-10-26'});
 assert.equal(report.totals.minutes,7);
 assert.equal(report.totals.sessions,1);
 assert.equal(report.quality.samples,1);
 assert.equal(report.tasks.total,1);
 assert.equal(report.tasks.completed,0);
 assert.deepEqual(report.tasks.projects,[]);
 assert.equal(JSON.stringify(source),before);
});

test('Task navigation revalidates a source changed to uppercase demo after drilldown rendering',()=>{
 const state={sessionHistory:[{id:1,date:'2026-10-26',minutes:6,domain:'study',taskId:7}],
  tasksList:[{id:7,title:'A genuine task',done:false,source:'user'}]};
 const doc={createElement(tag){return {
  tagName:tag.toUpperCase(),children:[],attributes:{},events:{},style:{},value:'',textContent:'',className:'',disabled:false,
  setAttribute(k,v){this.attributes[k]=String(v);},getAttribute(k){return this.attributes[k]??null;},
  addEventListener(k,fn){this.events[k]=fn;},appendChild(c){this.children.push(c);if(this.tagName==='SELECT'&&!this.value)this.value=c.value;return c;},
  append(...cs){this.children.push(...cs);},replaceChildren(...cs){this.children=cs;},remove(){}
 };}};
 const opened=[],host={ownerDocument:doc,appendChild(c){this.child=c;}};
 const ui=Studio.mount(host,()=>state,{today:'2026-10-26',
  startDate:'2026-10-26',endDate:'2026-10-26',onOpenTask:id=>opened.push(id)});
 host.child.children.find(x=>x.className==='dfa-insight-kpis').children[0].events.click();
 const detail=host.child.children.find(x=>x.className==='dfa-session-drilldown');
 const row=detail.children.find(x=>x.tagName==='TABLE').children.find(x=>x.tagName==='TBODY').children[0];
 const link=row.children[4].children[0];
 state.tasksList[0].source=' dEmO ';
 link.events.click();
 assert.deepEqual(opened,[],'Stale button cannot navigate into a synthetic task');
 ui.destroy();
});
