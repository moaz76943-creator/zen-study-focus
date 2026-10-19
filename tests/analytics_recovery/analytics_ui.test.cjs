'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const UI=require('../../android/app/src/main/assets/web/analytics_recovery_ui.js');
function documentFixture(){
 const doc={createElement(tag){
  return {tagName:tag.toUpperCase(),children:[],events:{},attributes:{},style:{},value:'',
   setAttribute(k,v){this.attributes[k]=v;},
   getAttribute(k){return this.attributes[k];},
   addEventListener(k,fn){this.events[k]=fn;},
   appendChild(child){this.children.push(child);if(this.tagName==='SELECT'&&!this.value)this.value=child.value;return child;},
   append(...nodes){for(const n of nodes)this.appendChild(n);},
   replaceChildren(...nodes){this.children=[];this.append(...nodes);},
   remove(){this.removed=true;}
  };
 }};
 return {ownerDocument:doc,children:[],appendChild(x){this.children.push(x);}};
}
const item=(id,date,minutes)=>({id,date,minutes,domain:'study'});
function nodes(inst){
 const wrapper=inst.element;
 const filters=wrapper.children[1];
 const fields=filters.children.filter(x=>x.tagName==='LABEL').map(x=>x.children[1]);
 const buttons=filters.children.filter(x=>x.tagName==='BUTTON');
 return {wrapper,fields,buttons,status:wrapper.children[2],cards:wrapper.children[3],
  split:wrapper.children[5],chart:wrapper.children[7],detail:wrapper.children[8]};
}
test('DF-128: day SVG click and keyboard drill into real session records',()=>{
 const target=documentFixture();
 const ui=UI.mount(target,()=>({sessionHistory:[item('real','2026-10-19',42)]}),
 {today:'2026-10-19'});
 const n=nodes(ui);
 assert.match(n.chart.innerHTML,/data-bucket="2026-10-19"/);
 const mark={getAttribute:()=> '2026-10-19'};
 n.chart.events.click({type:'click',target:{closest:()=>mark}});
 const table=n.detail.children.find(x=>x.tagName==='TABLE');
 assert.equal(table.children[1].children.length,1);
 assert.equal(table.children[1].children[0].children[1].textContent,'real');
 let prevented=false;
 n.chart.events.keydown({type:'keydown',key:'Enter',
  preventDefault(){prevented=true;},target:{closest:()=>mark}});
 assert.equal(prevented,true);
 ui.destroy();assert.equal(n.wrapper.removed,true);
});
test('DF-127/136: range input rejects reversed dates and Reset clears all controls',()=>{
 const ui=UI.mount(documentFixture(),()=>({sessionHistory:[item(1,'2026-10-19',10)]}),
 {today:'2026-10-19',saveCSV:async()=>({status:'saved'})});
 const n=nodes(ui);
 n.fields[2].value='2026-10-20';
 n.fields[2].events.change();
 assert.match(n.status.textContent,/valid date range/);
 assert.equal(n.buttons[1].disabled,true);
 assert.equal(ui.getReport().totals.minutes,10);
 n.fields[0].value='work';n.fields[1].value='weekly';
 n.buttons[0].events.click();
 assert.equal(n.fields[0].value,'all');
 assert.equal(n.fields[1].value,'daily');
 assert.equal(n.fields[2].value,'2026-09-20');
 assert.equal(n.status.textContent,'');
 assert.equal(n.buttons[1].disabled,false);
});
test('DF-125: tapping today KPI changes range and shows actual details',()=>{
 const ui=UI.mount(documentFixture(),()=>({sessionHistory:[item(1,'2026-10-12',20),
  item(2,'2026-10-19',10)]}),{today:'2026-10-19'});
 const n=nodes(ui);
 n.cards.children[0].events.click();
 assert.equal(n.fields[2].value,'2026-10-19');
 assert.equal(ui.getReport().totals.minutes,10);
 assert.equal(n.detail.children.find(x=>x.tagName==='TABLE').children[1].children.length,1);
});
test('DF-131: export cancel/failure and unavailable adapter are truthful',async()=>{
 const empty=UI.mount(documentFixture(),()=>({sessionHistory:[]}),{today:'2026-10-19'});
 const no=nodes(empty);
 assert.equal(no.buttons[1].disabled,true);assert.match(no.buttons[1].title,/unavailable/);
 let count=0;
 const ui=UI.mount(documentFixture(),()=>({sessionHistory:[item(1,'2026-10-19',15)]}),
 {today:'2026-10-19',saveCSV:async payload=>{
  assert.match(payload.csv,/2026-10-19/);
  count++;return {status:count===1?'cancelled':'saved'};
 }});
 const n=nodes(ui);
 await n.buttons[1].events.click();
 assert.equal(n.status.textContent,'Saving cancelled');
 await n.buttons[1].events.click();
 assert.equal(n.status.textContent,'CSV file saved');
 assert.equal(count,2);
});
test('DF-054: non-English analytics refuses partial or missing translations',()=>{
 assert.throws(()=>UI.mount(documentFixture(),()=>({}),{locale:'de'}),/translations required/);
 const ui=UI.mount(documentFixture(),()=>({sessionHistory:[]}),
 {locale:'de',today:'2026-10-19',translate:k=>'TRANSLATED '+k});
 assert.match(ui.element.children[0].textContent,/TRANSLATED/);
});

test('DF-129: activity ring displays only recorded ratios with keyboard drilldown',()=>{
 const svg=UI.renderActivitySvg({
  study:{minutes:25,sessions:1},read:{minutes:0,sessions:0},
  work:{minutes:75,sessions:2},sport:{minutes:0,sessions:0}
 });
 assert.match(svg,/data-domain="study"/);
 assert.match(svg,/data-domain="work"/);
 assert.match(svg,/25%/);assert.match(svg,/75%/);
 assert.doesNotMatch(svg,/[\u0660-\u0669\u06F0-\u06F9]/);
 const target=documentFixture();
 const ui=UI.mount(target,()=>({sessionHistory:[
 {id:'a',date:'2026-10-19',minutes:25,domain:'study'},
 {id:'b',date:'2026-10-19',minutes:75,domain:'work'}]}),{today:'2026-10-19'});
 const n=nodes(ui);
 assert.match(n.split.children[1].innerHTML,/data-domain="work"/);
 let stopped=false;
 n.split.events.keydown({type:'keydown',key:' ',
  preventDefault(){stopped=true;},
  target:{closest:()=>({getAttribute:()=> 'work'})}});
 assert.equal(stopped,true);
 const table=n.detail.children.find(x=>x.tagName==='TABLE');
 assert.equal(table.children[1].children.length,1);
 assert.equal(table.children[1].children[0].children[1].textContent,'b');
});
test('DF-130: empty activity ring cannot invent data',()=>{
 const svg=UI.renderActivitySvg({
  study:{minutes:0,sessions:0},read:{minutes:0,sessions:0},
  work:{minutes:0,sessions:0},sport:{minutes:0,sessions:0}});
 assert.doesNotMatch(svg,/data-domain=/);
 assert.match(svg,/No recorded minutes/);
});
