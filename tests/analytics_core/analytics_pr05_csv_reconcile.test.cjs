'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const Core=require('../../android/app/src/main/assets/web/analytics_core_v21.js');
const Studio=require('../../android/app/src/main/assets/web/analytics_studio.js');

function rig(history, opts={}) {
  const doc={createElement(tag) {
    return {tagName:tag.toUpperCase(),children:[],attributes:{},events:{},style:{},value:'',textContent:'',innerHTML:'',disabled:false,
      setAttribute(key,value){this.attributes[key]=String(value);},
      getAttribute(key){return this.attributes[key];},
      appendChild(child){this.children.push(child);if(this.tagName==='SELECT'&&!this.value)this.value=child.value;return child;},
      append(...children){this.children.push(...children);},
      replaceChildren(...children){this.children=children;},
      addEventListener(key,fn){this.events[key]=fn;},
      remove(){this.removed=true;}
    };
  }};
  const target={ownerDocument:doc,appendChild(child){this.child=child;}};
  const instance=Studio.mount(target,()=>({sessionHistory:history,tasksList:[]}),{
    today:'2026-05-31',startDate:'2026-01-01',endDate:'2026-05-31',...opts
  });
  const filters=target.child.children.find(c=>c.className==='dfa-filters');
  const inputs=filters.children.filter(c=>c.tagName==='LABEL').map(c=>c.children[0]);
  const button=filters.children.find(c=>c.tagName==='BUTTON');
  const chart=target.child.children.find(c=>c.tagName==='DIV'&&c.innerHTML.includes('<svg'));
  return {instance,inputs,button,chart};
}

test('151-day range compresses daily bars to readable monthly chart without changing report totals',()=>{
  const data=[{id:'a',date:'2026-03-29',minutes:25,domain:'study'}];
  const ui=rig(data);
  assert.equal(ui.instance.getReport().period.days,151);
  assert.equal(ui.instance.getReport().totals.minutes,25);
  assert.ok(ui.chart,'Chart SVG must render');
  assert.ok((ui.chart.innerHTML.match(/<rect /g)||[]).length<=6,'Long daily range must render no more than six month bars');
  assert.match(ui.chart.innerHTML,/data-day="2026-03"/,'Real monthly bucket retained');
  assert.equal(JSON.stringify(data),JSON.stringify([{id:'a',date:'2026-03-29',minutes:25,domain:'study'}]));
});

test('UI exposes four CSV formats with correct native filename and machine-readable header',async()=>{
  const out=[];
  const ui=rig([{id:'b',date:'2026-03-29',minutes:25,domain:'read'}],{
    onExport:(csv,name)=>{out.push({csv,name});return Promise.resolve({status:'saved'});}
  });
  const selects=ui.inputs.filter(el=>el.tagName==='SELECT');
  assert.equal(selects.length,3,'Domain, graph grouping, and separate CSV kind selectors');
  assert.deepEqual(selects[2].children.map(el=>el.value),['sessions','daily','weekly','monthly']);
  selects[2].value='weekly';
  await ui.button.events.click();
  assert.equal(out[0].name,'deep-focus-weekly.csv');
  assert.match(out[0].csv,/^"period","minutes","sessions"\r\n/);
  assert.equal(ui.instance.getReport().totals.minutes,25);
  selects[2].value='sessions';
  await ui.button.events.click();
  assert.equal(out[1].name,'deep-focus-sessions.csv');
  assert.match(out[1].csv,/^"id","date","domain","minutes"/);
});

test('10k real sessions and duplicate/demo exclusion yield CSV-Analytics parity and ASCII digits',()=>{
  const source=Array.from({length:10000},(_,i)=>({
    id:'real-'+i,date:i%2?'2026-05-30':'2026-05-31',minutes:1,domain:'study',completed:true
  }));
  source.push({...source[0],minutes:900},{id:'demo',date:'2026-05-31',minutes:600,domain:'study',isDemo:true});
  const before=JSON.stringify(source);
  const report=Core.buildReport({sessionHistory:source},{today:'2026-05-31',startDate:'2026-05-30',endDate:'2026-05-31'});
  assert.equal(report.totals.sessions,10000);
  assert.equal(report.totals.minutes,10000);
  assert.equal(report.quality.duplicates,1);
  assert.equal(report.quality.samples,1);
  const rows=Core.toCSV(report,'sessions').trim().split('\r\n');
  assert.equal(rows.length,10001);
  const total=rows.slice(1).reduce((n,row)=>n+Number(row.split(',')[3].replaceAll('"','')),0);
  assert.equal(total,10000);
  for(const kind of ['daily','weekly','monthly']) {
    const csv=Core.toCSV(report,kind);
    assert.doesNotMatch(csv,/[٠-٩۰-۹०-९০-৯]/);
  }
  assert.equal(JSON.stringify(source),before);
});
