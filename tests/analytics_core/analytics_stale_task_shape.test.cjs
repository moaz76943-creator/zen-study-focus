'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const Studio=require('../../android/app/src/main/assets/web/analytics_studio.js');

test('rendered Analytics task link must revalidate original shape before navigation',()=>{
  const task={id:11,title:'Real task',done:false,source:'user'};
  const state={sessionHistory:[{id:5,date:'2026-10-26',domain:'work',minutes:7,taskId:11}],tasksList:[task]};
  const doc={createElement(tag){return {
    tagName:tag.toUpperCase(),children:[],attributes:{},events:{},style:{},value:'',textContent:'',className:'',disabled:false,
    setAttribute(k,v){this.attributes[k]=String(v);},
    getAttribute(k){return this.attributes[k]??null;},
    addEventListener(k,fn){this.events[k]=fn;},
    appendChild(child){this.children.push(child);if(this.tagName==='SELECT'&&!this.value)this.value=child.value;return child;},
    append(...children){this.children.push(...children);},
    replaceChildren(...children){this.children=children;},
    remove(){}
  };}};
  const opened=[],host={ownerDocument:doc,appendChild(child){this.child=child;}};
  const ui=Studio.mount(host,()=>state,{today:'2026-10-26',
    startDate:'2026-10-26',endDate:'2026-10-26',onOpenTask:id=>opened.push(id)});
  host.child.children.find(x=>x.className==='dfa-insight-kpis').children[0].events.click();
  const detail=host.child.children.find(x=>x.className==='dfa-session-drilldown');
  const buttons=[];
  const walk=node=>{if(node.tagName==='BUTTON')buttons.push(node);for(const c of node.children||[])walk(c);};
  walk(detail);
  assert.equal(buttons.length,1,'Valid recorded task must link normally');
  delete task.done;
  buttons[0].events.click();
  assert.deepEqual(opened,[],'Task with missing completion field no longer meets source identity contract');
  task.done=false;
  task.title=null;
  buttons[0].events.click();
  assert.deepEqual(opened,[],'Task with invalid title no longer meets source identity contract');
  task.title='Restored original';
  buttons[0].events.click();
  assert.deepEqual(opened,[11],'Valid genuine task remains navigable');
  assert.equal(state.sessionHistory[0].minutes,7);
  ui.destroy();
});
