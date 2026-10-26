'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const Core=require('../../android/app/src/main/assets/web/analytics_core_v21.js');
const Studio=require('../../android/app/src/main/assets/web/analytics_studio.js');

function rig(){
 const history=Array.from({length:451},(_,id)=>({
  id,date:id===450?'2026-10-26':'2026-10-25',
  domain:'study',minutes:1,...(id===450?{taskId:77}:{})
 }));
 const state={sessionHistory:history,tasksList:[{
  id:77,title:'مهمة مؤرشفة؟ لا — ۱۲۳',done:false,source:'user'
 }]};
 const doc={createElement(tag){return {
  tagName:tag.toUpperCase(),children:[],attributes:{},events:{},style:{},
  value:'',textContent:'',className:'',disabled:false,removed:false,
  setAttribute(k,v){this.attributes[k]=String(v);},
  getAttribute(k){return this.attributes[k]??null;},
  addEventListener(k,fn){this.events[k]=fn;},
  appendChild(c){this.children.push(c);if(this.tagName==='SELECT'&&!this.value)this.value=c.value;return c;},
  append(...cs){this.children.push(...cs);},
  replaceChildren(...cs){this.children=cs;},
  remove(){this.removed=true;}
 };}};
 const opened=[];
 const host={ownerDocument:doc,appendChild(c){this.child=c;}};
 const ui=Studio.mount(host,()=>state,{today:'2026-10-26',
  startDate:'2026-10-25',endDate:'2026-10-26',onOpenTask:id=>opened.push(id)});
 const detail=host.child.children.find(c=>c.className==='dfa-session-drilldown');
 const panel=host.child.children.find(c=>c.className==='dfa-insight-kpis');
 const rows=()=>detail.children.find(c=>c.tagName==='TABLE')?.children.find(c=>c.tagName==='TBODY')?.children||[];
 const more=()=>detail.children.find(c=>c.getAttribute?.('data-drilldown-more')==='true'&&!c.removed);
 return {state,ui,detail,panel,rows,more,opened};
}

test('451 valid sessions are reachable in bounded 200-row increments without modifying credited totals or CSV',()=>{
 const x=rig();
 x.panel.children[1].events.click();
 assert.equal(x.ui.getReport().totals.sessions,451);
 assert.equal(x.rows().length,200);
 const button=x.more();
 assert.ok(button,'Sessions beyond first 200 must have an actionable continuation');
 button.events.click();
 assert.equal(x.rows().length,400);
 x.more().events.click();
 assert.equal(x.rows().length,451);
 assert.equal(x.more(),undefined,'No endless or misleading load-more button after all rows');
 assert.equal(x.ui.getReport().totals.minutes,451);
 assert.equal(Core.toCSV(x.ui.getReport()).split(String.fromCharCode(13,10)).filter(Boolean).length,452);
 const linked=x.rows().at(-1).children.at(-1).children[0];
 assert.equal(linked.textContent,'مهمة مؤرشفة؟ لا — ۱۲۳');
 linked.events.click();
 assert.deepEqual(x.opened,[77]);
 x.ui.destroy();
});

test('Changing a date preset discards the old 200-row pagination without losing live session data',()=>{
 const x=rig();
 x.panel.children[1].events.click();
 const old=x.more();
 assert.ok(old);
 x.panel.children[0].events.click();
 assert.equal(x.rows().length,1);
 assert.equal(x.more(),undefined);
 old.events.click();
 assert.equal(x.rows().length,1,'Stale detached continuation must not append records to active details');
 assert.equal(x.ui.getReport().totals.sessions,1);
 x.ui.destroy();
});
