'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const core=require('../../docs/control-center/planner-core.js');
const script=fs.readFileSync(path.resolve(__dirname,'../../docs/control-center/planner-ui.js'),'utf8');
const sha='a'.repeat(40);
const tasks=[
 {id:'DF-014',area:'NATURE_AUDIO',status:'BLOCKED',title:'Find genuine bird nature recordings.',evidence:'License not cleared'},
 {id:'DF-015',area:'NATURE_AUDIO',status:'IN_PROGRESS',title:'Verify Android audio mixing behavior.',evidence:'Device not tested'},
 {id:'DF-081',area:'NOTES',status:'BLOCKED',title:'Restore legacy user notes.',evidence:'Backup pending'}
];
function harness(){
 class Element{
  constructor(tag='div'){this.tagName=tag;this.children=[];this.events={};this.value='';this.textContent='';
    this.attributes={};this.disabled=false;this.href='';this.className='';this.classList={add:()=>{},remove:()=>{}};}
  append(...x){this.children.push(...x);}
  replaceChildren(...x){this.children=x;}
  setAttribute(k,v){this.attributes[k]=v;}
  removeAttribute(k){delete this.attributes[k];}
  getAttribute(k){return this.attributes[k]||null;}
  addEventListener(name,callback){(this.events[name]??=[]).push(callback);}
  click(){return Promise.all((this.events.click||[]).map(cb=>cb({preventDefault(){}})));}
  change(value,name='change'){this.value=value;return Promise.all((this.events[name]||[]).map(cb=>cb({target:this,preventDefault(){}})));}
  remove(){}
 }
 const inputs=new Map(),listeners=new Map();
 const defaults={'planner-area':'ALL','planner-status-filter':'actionable','planner-lane':'qa','planner-screen':'timer'};
 const document={
  readyState:'complete',body:new Element('body'),
  createElement:tag=>new Element(tag),
  getElementById:id=>{
   if(!inputs.has(id)){const result=new Element();result.value=defaults[id]||'';inputs.set(id,result);}
   return inputs.get(id);
  },
  addEventListener:(name,cb)=>{(listeners.get(name)||listeners.set(name,[]).get(name)).push(cb);},
  dispatchEvent:e=>{for(const cb of (listeners.get(e.type)||[]))cb(e);}
 };
 let snapshot={schema_version:1,inspected_ref:null,stale:true,tasks};
 const project={getSnapshot:()=>snapshot};
 const globals={DeepFocusPlannerCore:core,DeepFocusControlCenter:project};
 vm.runInNewContext(script,{document,globalThis:globals,URL,Blob,console,setTimeout,clearTimeout},{timeout:1500});
 return {element:id=>document.getElementById(id),document,setSnapshot:next=>{snapshot=next;document.dispatchEvent({type:'df:project-refreshed'});}};
}
test('offline task list displays real data and selecting one builds a bounded unverified brief',async()=>{
 const h=harness(),list=h.element('planner-task-list');
 assert.equal(list.children.length,3);
 await list.children[0].children[1].click();
 assert.match(h.element('planner-count').textContent,/1\s*\/\s*6/);
 assert.match(h.element('planner-preview').value,/DF-014/);
 assert.match(h.element('planner-preview').value,/UNVERIFIED_OFFLINE/);
 assert.equal(h.element('planner-issue').attributes['aria-disabled'],'true');
 assert.equal(h.element('planner-copy').disabled,false);
});
test('verified source refresh clears cross-SHA tasks and enables prepared issue only after re-selection',async()=>{
 const h=harness();
 await h.element('planner-task-list').children[0].children[1].click();
 h.setSnapshot({schema_version:1,inspected_ref:sha,stale:false,tasks});
 assert.match(h.element('planner-count').textContent,/0\s*\/\s*6/);
 await h.element('planner-task-list').children[0].children[1].click();
 assert.equal(h.element('planner-issue').attributes['aria-disabled'],'false');
 assert.ok(h.element('planner-issue').href.startsWith('https://github.com/moaz76943-creator/zen-study-focus/issues/new?'));
 h.setSnapshot({schema_version:1,inspected_ref:sha,stale:true,tasks});
 assert.equal(h.element('planner-issue').attributes['aria-disabled'],'true');
});
test('recommendation chooses current-area open work and clearing selection empties prompt',async()=>{
 const h=harness();
 await h.element('planner-area').change('NATURE_AUDIO');
 await h.element('planner-recommend').click();
 assert.match(h.element('planner-count').textContent,/2\s*\/\s*6/);
 assert.equal(h.element('planner-lane').value,'audio');
 assert.equal(h.element('planner-screen').value,'sounds');
 await h.element('planner-clear').click();
 assert.match(h.element('planner-count').textContent,/0\s*\/\s*6/);
 assert.equal(h.element('planner-preview').value,'');
});
