'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const Studio=require('../../android/app/src/main/assets/web/analytics_studio.js');
function mount(override={}){
  const doc={createElement(tag){
    return {tagName:tag.toUpperCase(),children:[],attributes:{},events:{},style:{},value:'',disabled:false,className:'',
      setAttribute(k,v){this.attributes[k]=String(v);},
      getAttribute(k){return this.attributes[k]??null;},
      addEventListener(k,fn){this.events[k]=fn;},
      appendChild(c){this.children.push(c);if(this.tagName==='SELECT'&&!this.value)this.value=c.value;return c;},
      append(...cs){this.children.push(...cs);},
      replaceChildren(...cs){this.children=cs;},remove(){this.removed=true;}
    };
  }};
  const host={ownerDocument:doc,appendChild(x){this.child=x;}};
  const ui=Studio.mount(host,()=>({sessionHistory:[
    {id:'a',date:'2026-03-30',domain:'study',minutes:10},
    {id:'b',date:'2026-03-25',domain:'read',minutes:5}
  ],tasksList:[]}),{today:'2026-03-30',locale:'en',...override});
  const filters=host.child.children.find(x=>x.className==='dfa-filters');
  const fields=filters.children.filter(x=>x.tagName==='LABEL').map(x=>x.children[0]);
  const presets=filters.children.find(x=>x.className==='dfa-range-presets');
  return {ui,fields,presets};
}
test('Today, 7-day and 30-day presets preserve credited local dates even over DST',()=>{
  const x=mount();
  assert.ok(x.presets,'Missing compact period shortcuts');
  const trigger=(days)=>{
    const button=x.presets.children.find(b=>b.getAttribute('data-range-days')===String(days));
    assert.ok(button,'Preset '+days+' is present');
    button.events.click();
    return x.ui.getReport().period;
  };
  assert.deepEqual([trigger(1).startDate,trigger(1).endDate],['2026-03-30','2026-03-30']);
  assert.equal(trigger(7).startDate,'2026-03-24');
  assert.equal(trigger(30).startDate,'2026-03-01');
  assert.equal(x.ui.getReport().totals.minutes,15);
  x.ui.destroy();
});
test('Date and chart/CSV filters survive a locale remount without changing history',()=>{
  const x=mount({startDate:'2026-03-25',endDate:'2026-03-30'});
  x.fields[0].value='read';x.fields[0].events.change();
  x.fields[1].value='weekly';x.fields[1].events.change();
  x.fields[4].value='monthly';x.fields[4].events.change();
  const selected=x.ui.getFilters();
  assert.deepEqual(selected,{startDate:'2026-03-25',endDate:'2026-03-30',domain:'read',grouping:'weekly',exportKind:'monthly'});
  x.ui.destroy();
  const y=mount({...selected,locale:'de'});
  assert.deepEqual(y.ui.getFilters(),selected);
  assert.equal(y.ui.getReport().totals.minutes,5);
  y.ui.destroy();
});
