'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ops=require('../../docs/control-center/v3-core.js');
const studioCore=require('../../docs/control-center/studio-core.js');
const baseline=require('../../docs/control-center/design-config.json');
const script=fs.readFileSync(path.resolve(__dirname,'../../docs/control-center/v3-ui.js'),'utf8');

function harness(){
  class Element{
    constructor(tag){this.tagName=tag;this.children=[];this.listeners={};this.style={};this.attributes={};
      this.value='';this.disabled=false;this.textContent='';this.classList={toggle:()=>{}};}
    addEventListener(name,callback){(this.listeners[name]??=[]).push(callback);}
    replaceChildren(...items){this.children=items;}
    append(...items){this.children.push(...items);}
    setAttribute(name,value){this.attributes[name]=value;}
    focus(){document.activeElement=this;}
    blur(){document.activeElement=null;}
    scrollIntoView(){}
    remove(){}
    click(){for(const handler of (this.listeners.click||[]))handler({target:this,preventDefault(){}});}
    change(value,type='change'){this.value=value;for(const handler of (this.listeners[type]||[]))handler({target:this,files:this.files||[]});}
  }
  const elements=new Map(),handlers=new Map();
  const defaults={
    'v3-task-view':'blocked','v3-task-sort':'status','v3-pr-filter':'all',
    'v3-pr-search':'','v3-risk-filter':'all','v3-search':'','v3-theme-preset':''
  };
  const document={
    readyState:'complete',activeElement:null,
    createElement:tag=>new Element(tag),
    getElementById(id){
      if(!elements.has(id)){const el=new Element('div');el.value=defaults[id]??'';elements.set(id,el);}
      return elements.get(id);
    },
    addEventListener(name,callback){(handlers.get(name)||handlers.set(name,[]).get(name)).push(callback);},
    dispatchEvent(event){for(const cb of handlers.get(event.type)||[])cb(event);},
    body:new Element('body')
  };
  let current=studioCore.validateConfig(baseline);
  const studio={
    getState(){return {current:studioCore.validateConfig(current),baseline:studioCore.validateConfig(baseline),screen:'timer'};},
    applyConfig(next){current=studioCore.validateConfig(next);document.dispatchEvent({type:'df:studio-changed'});}
  };
  const data={
    schema_version:1,inspected_ref:'a'.repeat(40),
    tasks:[{id:'DF-001',title:'Audio report',area:'AUDIO',status:'BLOCKED',evidence:'license'},
      {id:'DF-002',title:'Notes review',area:'NOTES',status:'TESTED',evidence:'source'}],
    prs:[{number:37,title:'Dashboard',draft:true,html_url:'https://github.com/moaz76943-creator/zen-study-focus/pull/37',created_at:'2026-01-01T00:00:00Z'}],
    runs:[{id:3,name:'Quality audit',status:'completed',conclusion:'success',
      html_url:'https://github.com/moaz76943-creator/zen-study-focus/actions/runs/3'}],
    findings:[],audit:null
  };
  const ctx={document,globalThis:{DeepFocusV3Core:ops,DeepFocusControlCenter:{getSnapshot:()=>data},DeepFocusStudioUI:studio},URL,Date,Blob,
    setTimeout,clearTimeout};
  vm.runInNewContext(script,ctx,{timeout:3000});
  return {document,element:id=>document.getElementById(id),getCurrent:()=>current,applyConfig:studio.applyConfig};
}

test('mounts source data, draws task/PR/CI panels and release gates',()=>{
  const h=harness();
  assert.match(h.element('v3-task-count').textContent,/1 مهمة/);
  assert.equal(h.element('v3-task-results').children.length,1);
  assert.equal(h.element('v3-release-gates').children.length,5);
  assert.equal(h.element('v3-prs').children.length,1);
  assert.match(h.element('v3-ci-trend').textContent,/100%/);
});
test('interactive search includes matching task and closes using Escape',()=>{
  const h=harness(),search=h.element('v3-search');
  search.change('Audio','input');
  assert.equal(h.element('v3-search-results').children.length,1);
  assert.equal(search.attributes['aria-expanded'],'true');
  search.focus();
  h.document.dispatchEvent({type:'keydown',key:'Escape'});
  assert.equal(search.value,'');
  assert.equal(search.attributes['aria-expanded'],'false');
});
test('presets, undo/redo, screen reset are reversible local staged changes',()=>{
  const h=harness();
  h.element('v3-theme-preset').change('forest');
  assert.notEqual(h.getCurrent().theme.primary,baseline.theme.primary);
  h.element('v3-undo').click();
  assert.equal(h.getCurrent().theme.primary,baseline.theme.primary);
  h.element('v3-redo').click();
  assert.notEqual(h.getCurrent().theme.primary,baseline.theme.primary);
  const altered=studioCore.updateSetting(h.getCurrent(),'timer','spacing',25);
  h.applyConfig(altered);
  assert.equal(h.getCurrent().screens.timer.spacing,25);
  h.element('v3-reset-screen').click();
  assert.equal(h.getCurrent().screens.timer.spacing,baseline.screens.timer.spacing);
});
