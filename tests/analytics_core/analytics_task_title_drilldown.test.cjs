'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const Studio=require('../../android/app/src/main/assets/web/analytics_studio.js');

function rig(taskTitle){
 const data={sessionHistory:[{id:1,date:'2026-10-26',domain:'work',minutes:7,taskId:9}],
   tasksList:[{id:9,title:taskTitle,done:false,source:'user'}]};
 const doc={createElement(tag){return {
  tagName:tag.toUpperCase(),children:[],attributes:{},events:{},style:{},value:'',textContent:'',className:'',disabled:false,
  setAttribute(k,v){this.attributes[k]=String(v);},getAttribute(k){return this.attributes[k]??null;},
  addEventListener(k,fn){this.events[k]=fn;},appendChild(c){this.children.push(c);if(this.tagName==='SELECT'&&!this.value)this.value=c.value;return c;},
  append(...cs){this.children.push(...cs);},replaceChildren(...cs){this.children=cs;},remove(){}
 };}};
 const host={ownerDocument:doc,appendChild(c){this.child=c;}},opened=[];
 const ui=Studio.mount(host,()=>data,{today:'2026-10-26',startDate:'2026-10-26',endDate:'2026-10-26',onOpenTask:id=>opened.push(id)});
 host.child.children.find(x=>x.className==='dfa-insight-kpis').children[0].events.click();
 const detail=host.child.children.find(x=>x.className==='dfa-session-drilldown');
 const found=[];function visit(el){if(el.tagName==='BUTTON')found.push(el);for(const ch of el.children||[])visit(ch);}visit(detail);
 assert.equal(found.length,1);
 return {data,ui,button:found[0],opened};
}

test('Task-linked session drilldown displays the actual user task title, not an opaque numeric ID',()=>{
 const x=rig('كتابة تقرير ١٢٣');
 assert.equal(x.button.textContent,'كتابة تقرير ١٢٣');
 assert.equal(x.button.getAttribute('data-task-id'),'9');
 x.button.events.click();assert.deepEqual(x.opened,[9]);
 x.ui.destroy();
});

test('Task title is inserted as inert text, preserving authored HTML and numeral characters',()=>{
 const authored='<img src=x onerror=alert(1)> ۱۲۳';
 const x=rig(authored);
 assert.equal(x.button.textContent,authored);
 assert.equal(x.button.getAttribute('data-task-id'),'9');
 x.ui.destroy();
});

test('Blank task title safely falls back to Western numeric task ID',()=>{
 const x=rig('');
 assert.equal(x.button.textContent,'9');
 x.ui.destroy();
});
