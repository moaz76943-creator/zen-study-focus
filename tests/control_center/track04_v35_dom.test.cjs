'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const core=require('../../docs/control-center/repo-sync-core.js');
const script=fs.readFileSync(path.join(__dirname,'../../docs/control-center/repo-sync-ui.js'),'utf8');
const A='a'.repeat(40),B='b'.repeat(40),C='c'.repeat(40),D='d'.repeat(40);
const repo='https://github.com/moaz76943-creator/zen-study-focus/';
const pr=(number,head,base)=>({number,head:{sha:head},base:{sha:base},
  draft:true,html_url:repo+'pull/'+number});
function harness(fail72=false){
 const all=new Map();
 class Element {
  constructor(tag='div'){
   this.tag=tag;this.id='';this.children=[];this.listeners={};this.attributes={};
   this.className='';this.dataset={};this.textContent='';this.disabled=false;this.href='';
  }
  append(...xs){this.children.push(...xs);}
  replaceChildren(...xs){this.children=xs;}
  insertAdjacentElement(_,el){all.set(el.id,el);}
  addEventListener(name,callback){(this.listeners[name]??=[]).push(callback);}
  setAttribute(name,value){this.attributes[name]=value;}
  removeAttribute(name){delete this.attributes[name];}
  async click(){for(const handler of this.listeners.click||[])await handler({target:this});}
 }
 for(const id of ['repo-sync','repo-sync-refresh','repo-sync-status','repo-sync-cards',
   'repo-sync-drift','repo-sync-workflows','overview','tasks','studio','reports']){
  const el=new Element();el.id=id;all.set(id,el);
 }
 const document={
  readyState:'complete',body:new Element('body'),
  getElementById:id=>all.get(id)||null,
  createElement:tag=>new Element(tag)
 };
 const requests=[];
 const pulls={25:pr(25,A,D),37:pr(37,B,A),70:pr(70,C,A),72:pr(72,D,B)};
 const browserFetch=async(url,opts)=>{
  requests.push({url,opts});
  if(fail72&&url.includes('/pulls/72'))return {ok:false,status:403};
  const n=Number(url.match(/\/pulls\/(\d+)/)?.[1]);
  return {ok:true,json:async()=>n?pulls[n]:{workflow_runs:[
    {id:888,head_sha:C,head_branch:'test',name:'Android emulator validation',
     status:'completed',conclusion:'failure',html_url:repo+'actions/runs/888'}]}};
 };
 const ctx={document,window:{addEventListener(){}},location:{hash:'#repo-sync'},
  globalThis:{DeepFocusRepoSyncCore:core},fetch:browserFetch,
  AbortController,setTimeout,clearTimeout,URL,Date};
 vm.runInNewContext(script,ctx,{timeout:3000});
 return {element:id=>all.get(id),requests,document};
}
const walk=el=>!el?'':el.textContent+' '+(el.children||[]).map(walk).join(' ');
const settle=()=>new Promise(resolve=>setTimeout(resolve,20));
test('v35 DOM renders four authentic PR cards, Android workflow evidence and phone shortcuts',async()=>{
 const h=harness();
 await settle();
 assert.equal(h.element('repo-sync-cards').children.length,4);
 assert.ok(walk(h.element('repo-sync-cards')).includes('PR #72'));
 assert.ok(walk(h.element('repo-sync-recovery')).includes('Android QA'));
 assert.ok(walk(h.element('repo-sync-recovery')).includes('FAIL'));
 assert.ok(walk(h.element('repo-sync-status')).includes('NOT APPROVED'));
 const nav=h.document.body.children.find(el=>el.id==='mobile-quick-nav');
 assert.equal(nav.children.length,5);
 assert.equal(nav.children[1].href,'#repo-sync');
 assert.equal(nav.children[1].attributes['aria-current'],'location');
 assert.ok(h.requests.some(r=>r.url.includes('/pulls/72')));
 assert.ok(h.requests.every(r=>r.opts.credentials==='omit'&&!r.opts.headers.Authorization));
 assert.equal(h.element('repo-sync-refresh').disabled,false);
});
test('v35 DOM displays partial sources, not fake green, when PR72 is rate-limited',async()=>{
 const h=harness(true);
 await settle();
 assert.match(h.element('repo-sync-status').textContent,/المصدر غير مكتمل/);
 assert.match(walk(h.element('repo-sync-recovery')),/NOT_VERIFIED/);
 assert.equal(h.element('repo-sync-refresh').disabled,false);
});
