'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../../../android/app/src/main/assets/web/analytics_core_v21.js');
require('../../../android/app/src/main/assets/web/js/df99_multiscreen_i18n.js');
require('../../../android/app/src/main/assets/web/js/df99_reviewed_packs.js');
const S = require('../../../android/app/src/main/assets/web/analytics_studio.js');
const packs = require('../../../assets/i18n/df99_reviewed_packs.json');

function dom() {
  const doc = {createElement(tag) {
    const el = {tagName:tag.toUpperCase(),children:[],style:{},attributes:{},value:'',disabled:false,textContent:'',
      setAttribute(k,v){this.attributes[k]=String(v);},
      getAttribute(k){return this.attributes[k] ?? null;},
      addEventListener(k,fn){(this.events ||= {})[k]=fn;},
      appendChild(child){this.children.push(child);if(this.tagName==='SELECT'&&!this.value)this.value=child.value;return child;},
      append(...children){this.children.push(...children);},
      replaceChildren(...children){this.children=children;},
      remove(){this.removed=true;}};
    return el;
  }};
  const target={ownerDocument:doc,children:[],appendChild(el){this.children.push(el);}};
  return {doc,target};
}
const fixture=()=>{
 const history=[{id:'unique',date:'2026-10-19',minutes:12,domain:'study'},
   {id:'unique',date:'2026-10-19',minutes:999,domain:'study'},
   {id:'second',date:'2026-10-18',minutes:8,domain:'read'}];
 return {cfg:{sessionHistory:history},tasksList:[],projects:[]};
};
const mount=(locale='de',data=fixture(),more={})=>{
 const {target}=dom();const exports=[];
 const inst=S.mount(target,()=>data,{locale,today:'2026-10-19',startDate:'2026-10-18',
   endDate:'2026-10-19',goals:{study:10},onExport:csv=>exports.push(csv),...more});
 const wrapper=target.children[0],filters=wrapper.children[1];
 const inputs=filters.children.filter(el=>el.tagName==='LABEL').map(el=>el.children[0]);
 const button=filters.children.find(el=>el.tagName==='BUTTON');
 return {target,inst,wrapper,inputs,button,exports};
};

test('53 reviewed analytics packs resolve at runtime through DF99Locale, not a JSON-only check',()=>{
 assert.equal(Object.keys(packs).length,53);
 for (const [code,entry] of Object.entries(packs)) {
   if (!entry.analytics) continue;
   for (const [key,translation] of Object.entries(entry.analytics)) {
     assert.equal(globalThis.DF99Locale.t(code,'analytics',key,'missing'),translation,code+'/'+key);
   }
 }
 const x=mount('de');
 assert.equal(x.wrapper.children[0].textContent,packs.de.analytics.title);
 assert.equal(x.inputs[0].parentLabel?.textContent ?? x.wrapper.children[1].children[0].textContent,packs.de.analytics.activity);
 assert.equal(x.wrapper.children[1].children[1].textContent,packs.de.analytics.period);
 assert.equal(x.button.textContent,packs.de.analytics.export);
 assert.equal(x.wrapper.children[2].children[0].children[0].textContent,packs.de.analytics.minutes);
 assert.equal(x.wrapper.children[4].textContent,packs.de.analytics.chart); // translated chart heading
});

test('German, French, Arabic and Persian keep locale direction, translated visible state and Latin digits',()=>{
 for (const [locale,dir] of [['de','ltr'],['fr','ltr'],['ar','rtl'],['fa','rtl']]) {
   const x=mount(locale);assert.equal(x.wrapper.attributes.dir,dir);
   assert.equal(x.inst.getReport().totals.sessions,2,'duplicate sessions must not inflate totals');
   const kpis=x.wrapper.children[2].children;
   assert.equal(kpis[0].children[1].textContent,'20');
   assert.equal(kpis[1].children[1].textContent,'2');
   if(packs[locale]?.analytics)assert.equal(x.wrapper.children[0].textContent,packs[locale].analytics.title);
   x.inst.destroy();
 }
});

test('accessible SVG bar and leap year heatmap labels use the same translated resolver',()=>{
 const bars=S.barsSvg([{key:'2026-10-19',minutes:12,sessions:1}],{locale:'de'});
 assert.match(bars,/12/);assert.match(bars,new RegExp(packs.de.analytics.sessions));
 assert.doesNotMatch(bars,/Recorded minutes by credited day/);
 const days=A.yearHeatmap({sessionHistory:[{id:1,date:'2024-02-29',minutes:3,domain:'study'}]},2024);
 const svg=S.heatmapSvg(days,{locale:'de'});
 assert.equal((svg.match(/<rect /g)||[]).length,366);
 assert.match(svg,/data-day="2024-02-29"/);
 assert.doesNotMatch(svg,/Calendar year heatmap of verified session records/);
});

test('bad dates or inverted/excessive range fail closed, suppress stale CSV and recover',()=>{
 const x=mount();const start=x.inputs[2],end=x.inputs[3];
 assert.equal(x.inst.getReport().totals.minutes,20);
 start.value='2026-10-20';start.events.change();
 assert.equal(x.inst.getReport(),null);assert.equal(x.button.disabled,true);
 x.button.events.click();assert.equal(x.exports.length,0);
 start.value='2026-10-18';end.value='not-a-date';end.events.change();
 assert.equal(x.inst.getReport(),null);
 end.value='2026-10-19';start.events.change();
 assert.equal(x.inst.getReport().totals.minutes,20);assert.equal(x.button.disabled,false);
 start.value='2000-01-01';start.events.change();
 assert.equal(x.inst.getReport(),null);assert.equal(x.button.disabled,true);
});

test('day/week/month interactions and full year heatmap cannot fabricate events',()=>{
 const x=mount('fr');const grouping=x.inputs[1],data=x.inst.getReport();
 assert.equal(data.daily.length,2);assert.equal(data.weekly.length,2);assert.equal(data.monthly.length,1);
 grouping.value='weekly';grouping.events.change();assert.equal(x.inst.getReport().totals.sessions,2);
 grouping.value='monthly';grouping.events.change();assert.equal(x.inst.getReport().totals.minutes,20);
 const heat=x.wrapper.children[x.wrapper.children.length-1];
 assert.match(heat.innerHTML,/2026-10-19/);
});

test('CSV retains original machine-readable headers, ASCII numbers, duplicate exclusion and source immutability',()=>{
 const data=fixture(),original=JSON.stringify(data),x=mount('fa',data);
 x.button.events.click();
 assert.equal(x.exports.length,1);
 assert.match(x.exports[0],/^"id","date","domain","minutes"/);
 assert.equal((x.exports[0].match(/"unique"/g)||[]).length,1);
 assert.doesNotMatch(x.exports[0],/999/);
 assert.equal(JSON.stringify(data),original);
});
