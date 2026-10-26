'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const S=require('../../android/app/src/main/assets/web/analytics_studio.js');
function rig(){
 const doc={createElement(tag){
  return {tagName:tag.toUpperCase(),children:[],attributes:{},events:{},style:{},value:'',textContent:'',className:'',disabled:false,
   setAttribute(k,v){this.attributes[k]=String(v);},getAttribute(k){return this.attributes[k]??null;},
   addEventListener(k,fn){this.events[k]=fn;},appendChild(child){this.children.push(child);if(this.tagName==='SELECT'&&!this.value)this.value=child.value;return child;},
   append(...children){this.children.push(...children);},replaceChildren(...children){this.children=children;},
   remove(){this.removed=true;}};}
 };
 const host={ownerDocument:doc,appendChild(e){this.child=e;}};
 const data={sessionHistory:[
   {id:'real-study',date:'2026-10-26',minutes:12,domain:'study'},
   {id:'real-read',date:'2026-10-25',minutes:8,domain:'read'},
   {id:'older',date:'2026-10-14',minutes:9,domain:'study'},
   {id:'fake-rest',date:'2026-10-26',minutes:900,domain:'study',mode:'rest'}
 ],goalSnapshots:[{date:'2026-10-26',domain:'study',targetMinutes:20}]};
 const before=JSON.stringify(data);
 const ui=S.mount(host,()=>data,{today:'2026-10-26',startDate:'2026-10-01',endDate:'2026-10-26'});
 return {ui,root:host.child,source:data,before};
}
test('Read-only dashboard KPI buttons drill into real daily/weekly/monthly records without counting rest',()=>{
 const r=rig(),find=cls=>r.root.children.find(x=>x.className===cls);
 const panel=find('dfa-insight-kpis');assert.ok(panel,'Quick KPI drilldowns missing');
 const buttons=panel.children.filter(x=>x.tagName==='BUTTON');
 assert.deepEqual(buttons.map(x=>x.getAttribute('data-period-days')),[ '1','7','30' ]);
 buttons[0].events.click();
 assert.equal(r.ui.getReport().period.days,1);
 assert.equal(r.ui.getReport().totals.minutes,12);
 buttons[1].events.click();
 assert.equal(r.ui.getReport().period.days,7);
 assert.equal(r.ui.getReport().totals.minutes,20);
 buttons[2].events.click();
 assert.equal(r.ui.getReport().period.days,30);
 assert.equal(r.ui.getReport().totals.minutes,29);
 assert.equal(JSON.stringify(r.source),r.before);
 r.ui.destroy();
});
test('Activity ring is accessible, selects genuine domain sessions and renders session table',()=>{
 const r=rig(),find=cls=>r.root.children.find(x=>x.className===cls);
 const ring=find('dfa-activity-ring'),detail=find('dfa-session-drilldown');
 assert.ok(ring&&ring.innerHTML.includes('data-domain="study"'),'activity ring is missing study segment');
 assert.match(ring.innerHTML,/tabindex="0" role="button"/);
 const target={closest(){return {getAttribute(){return 'study';}};}};
 ring.events.click({target,type:'click'});
 const table=detail.children.find(x=>x.tagName==='TABLE');
 assert.ok(table,'drilldown is missing accessible table');
 const allText=JSON.stringify(table);
 assert.match(allText,/real-study/);
 assert.match(allText,/older/);
 assert.doesNotMatch(allText,/real-read|fake-rest/);
 assert.equal(JSON.stringify(r.source),r.before);
 r.ui.destroy();
});
test('Rolling comparison and separately dated goal snapshot totals display without using mutable current goals',()=>{
 const r=rig(),find=cls=>r.root.children.find(x=>x.className===cls);
 const compare=find('dfa-week-comparison');
 assert.ok(compare,'previous week comparison missing');
 assert.match(compare.textContent,/12|20/);
 const historic=find('dfa-historical-goals');
 assert.ok(historic,'historical dated goal section missing');
 assert.match(JSON.stringify(historic),/20/);
 assert.equal(r.ui.getReport().historicalGoals.available,true);
 r.ui.destroy();
});
