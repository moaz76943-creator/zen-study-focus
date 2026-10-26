'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const Core=require('../../android/app/src/main/assets/web/analytics_core_v21.js');
const Studio=require('../../android/app/src/main/assets/web/analytics_studio.js');

function rig() {
 const data={
  sessionHistory:[
   {id:'old',date:'2026-01-10',domain:'study',minutes:25,taskId:77},
   {id:'current',date:'2026-10-26',domain:'study',minutes:10}
  ],
  tasksList:[{id:77,title:'مراجعة ۱۲۳',done:false,source:'user'}]
 };
 const doc={createElement(tag){return {
  tagName:tag.toUpperCase(),children:[],attributes:{},events:{},style:{},
  value:'',textContent:'',innerHTML:'',className:'',disabled:false,
  setAttribute(k,v){this.attributes[k]=String(v);},
  getAttribute(k){return this.attributes[k]??null;},
  addEventListener(k,fn){this.events[k]=fn;},
  appendChild(el){this.children.push(el);if(this.tagName==='SELECT'&&!this.value)this.value=el.value;return el;},
  append(...els){this.children.push(...els);},
  replaceChildren(...els){this.children=els;},
  remove(){}
 };}};
 const opened=[];
 const host={ownerDocument:doc,appendChild(el){this.child=el;}};
 const ui=Studio.mount(host,()=>data,{
  today:'2026-10-26',startDate:'2026-10-26',endDate:'2026-10-26',
  onOpenTask:id=>opened.push(id)
 });
 const detail=host.child.children.find(el=>el.className==='dfa-session-drilldown');
 const heat=host.child.children.find(el=>el.style?.overflowX==='auto'&&el.innerHTML.includes('data-day="2026-01-10"'));
 const rows=()=>detail.children.find(el=>el.tagName==='TABLE')?.children.find(el=>el.tagName==='TBODY')?.children||[];
 const click=(day)=>heat.events.click({
  type:'click',currentTarget:heat,target:{closest(){return {getAttribute(k){return k==='data-day'?day:null;}};}}
 });
 return {data,ui,detail,heat,rows,click,opened};
}

test('Annual heatmap details access genuine January records even when report date is October',()=>{
 const x=rig();
 assert.ok(x.heat,'The annual heatmap must display the earlier credited day');
 assert.equal(x.ui.getReport().totals.minutes,10);
 x.click('2026-01-10');
 assert.equal(x.rows().length,1,'Annual visible day must not misleadingly report no sessions');
 assert.equal(x.rows()[0].children[0].textContent,'2026-01-10');
 assert.equal(x.rows()[0].children[3].textContent,'25');
 const link=x.rows()[0].children[4].children[0];
 assert.equal(link.textContent,'مراجعة ۱۲۳');
 link.events.click();
 assert.deepEqual(x.opened,[77]);
 // Selecting a heatmap cell must not silently expand dashboard KPIs or exported CSV.
 assert.equal(x.ui.getReport().period.startDate,'2026-10-26');
 assert.equal(x.ui.getReport().totals.minutes,10);
 assert.equal(Core.toCSV(x.ui.getReport()).includes('"old"'),false);
 x.ui.destroy();
});

test('Heatmap empty days return truthful empty details while current filtered report remains intact',()=>{
 const x=rig();
 x.click('2026-01-11');
 assert.equal(x.rows().length,0);
 assert.equal(x.ui.getReport().totals.sessions,1);
 x.ui.destroy();
});
