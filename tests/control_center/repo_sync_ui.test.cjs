'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../../docs/control-center/repo-sync-ui.js'),'utf8');
const core=require('../../docs/control-center/repo-sync-core.js');
const a='a'.repeat(40);
class Element{
 constructor(tag='div'){this.tag=tag;this.children=[];this.events={};this.textContent='';this.value='';this.className='';this.disabled=false;}
 addEventListener(event,fn){(this.events[event]??=[]).push(fn);}
 change(value,event='input'){this.value=value;for(const fn of this.events[event]||[])fn();}
 append(...children){this.children.push(...children);}
 replaceChildren(...children){this.children=children;}
}
function run(){
 const elements=new Map(),listeners=new Map();
 const $=id=>{
   if(!elements.has(id)){
     const e=new Element();if(id==='repo-review-filter')e.value='all';
     elements.set(id,e);
   }
   return elements.get(id);
 };
 let fetchCalls=0,observed=null;
 class Observer{constructor(cb){this.cb=cb;} observe(element){observed=element;} disconnect(){}}
 const document={readyState:'complete',getElementById:$,
  createElement:tag=>new Element(tag),
  addEventListener:(event,cb)=>{(listeners.get(event)||listeners.set(event,[]).get(event)).push(cb);}
 };
 const prs=[
   {number:70,title:'Nature audio QA',draft:true,head:{sha:a,ref:'nature-audio'},updated_at:'2026-10-20T17:00:00Z',
    html_url:'https://github.com/moaz76943-creator/zen-study-focus/pull/70'},
   {number:71,title:'Notes coverage',draft:false,head:{sha:a,ref:'notes-safety'},updated_at:'2026-10-20T18:00:00Z',
    html_url:'https://github.com/moaz76943-creator/zen-study-focus/pull/71'}
 ];
 const fake={DeepFocusRepoSyncCore:core,DeepFocusControlCenter:{getSnapshot:()=>({prs,stale:true})}};
 vm.runInNewContext(source,{document,globalThis:fake,IntersectionObserver:Observer,
   fetch:()=>{fetchCalls++;throw Error('Unexpected GitHub call on page load');},
   URL,AbortController,setTimeout,clearTimeout,console},{timeout:2000});
 return {element:$,get fetchCalls(){return fetchCalls;},observed,listeners};
}
test('sync-ui01 PR review queue renders real source rows, search and draft filter without extra API calls',()=>{
 const h=run();
 assert.equal(h.fetchCalls,0,'Opening the homepage must not eagerly consume public GitHub quota');
 assert.ok(h.observed,'Repository section should be lazily observed');
 assert.equal(h.element('repo-review-queue').children.length,2);
 h.element('repo-review-search').change('nature');
 assert.equal(h.element('repo-review-queue').children.length,1);
 assert.match(h.element('repo-review-state').textContent,/محفوظة\/جزئية/);
 h.element('repo-review-search').change('');
 h.element('repo-review-filter').change('draft','change');
 assert.equal(h.element('repo-review-queue').children.length,1);
});
test('sync-ui02 all loaded PR content is created using textContent only',()=>{
 assert.match(source,/textContent=String\(value\)/);
 assert.doesNotMatch(source,/innerHTML\s*=|eval\s*\(|localStorage|ZenNative|pulls\.merge/);
 assert.match(source,/df:project-refreshed/);
});
