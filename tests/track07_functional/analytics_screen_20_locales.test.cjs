'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const Studio=require('../../android/app/src/main/assets/web/analytics_studio.js');
const Locale=require('../../android/app/src/main/assets/web/localization_20_recovery.js');

function rig(language,extra={}){
 const doc={createElement(tag){return {tagName:tag.toUpperCase(),children:[],attributes:{},style:{},value:'',textContent:'',events:{},
  setAttribute(k,v){this.attributes[k]=v;},getAttribute(k){return this.attributes[k];},
  addEventListener(k,fn){this.events[k]=fn;},appendChild(n){this.children.push(n);if(this.tagName==='SELECT'&&!this.value)this.value=n.value;return n;},
  append(...ns){this.children.push(...ns);},replaceChildren(...ns){this.children=ns;},remove(){this.removed=true;}};}};
 const target={ownerDocument:doc,children:[],appendChild(n){this.children.push(n);}};
 const snap={sessionHistory:[{id:1,date:'2026-10-19',domain:'study',minutes:35}],tasksList:[],projects:[]};
 const mount=Studio.mount(target,()=>snap,{locale:language,today:'2026-10-20',startDate:'2026-10-01',endDate:'2026-10-20',...extra});
 const wrapper=target.children[0];const filters=wrapper.children.find(x=>x.className==='dfa-filters');
 const fields=filters.children.filter(x=>x.tagName==='LABEL');
 return {doc,wrapper,mount,filters,fields,
  start:fields[2].children[0],end:fields[3].children[0],
  grouping:fields[1].children[0],chart:wrapper.children.find(x=>x.tagName==='DIV'&&x.style?.overflowX==='auto')};
}

test('analytics is titled from existing verified UI dictionary for every one of 20 languages, not hardcoded English fallback',()=>{
 for(const lang of Locale.LANGUAGES){
  const ui=rig(lang);
  assert.equal(ui.wrapper.children[0].textContent,Locale.t(lang,'analyticsTitle'),lang);
  assert.equal(ui.fields[0].textContent,Locale.t(lang,'activity'),lang+' activity');
  assert.equal(ui.fields[2].textContent,Locale.t(lang,'from'),lang+' start date');
  assert.equal(ui.fields[3].textContent,Locale.t(lang,'to'),lang+' end date');
  assert.equal(ui.wrapper.attributes.dir,Locale.direction(lang),lang+' direction');
  assert.equal(ui.wrapper.attributes.lang,lang,lang+' language');
 }
});

test('date pickers and numeric UI use Western 0-9 with explicit LTR fields in RTL languages',()=>{
 for(const lang of ['ar','fa','ur','hi','bn']){
  const u=rig(lang);
  assert.equal(u.start.style.direction,'ltr');
  assert.equal(u.end.style.direction,'ltr');
  const kpi=u.wrapper.children.find(x=>x.tagName==='DIV'&&x.children.some(y=>y.tagName==='DIV'));
  assert.ok(u.wrapper.children[0].textContent);
  assert.equal(u.fields[1].children[0].children[0].textContent,Locale.t(lang,'daily'),lang);
  const allLabels=JSON.stringify(u.wrapper);
  assert.doesNotMatch(allLabels,/[\u0660-\u0669\u06f0-\u06f9\u0966-\u096f\u09e6-\u09ef]/,'Western digits in generated interface only');
 }
});

test('long selection chooses monthly aggregation rather than compressing thousands of inaccessible daily bars',()=>{
 const u=rig('en',{startDate:'2017-01-01',endDate:'2026-10-20'});
 assert.equal(u.grouping.value,'monthly');
 assert.equal(u.mount.getReport().period.startDate,'2017-01-01');
 assert.equal(u.mount.getReport().period.endDate,'2026-10-20');
});
