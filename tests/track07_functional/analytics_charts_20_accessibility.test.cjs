'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const Studio=require('../../android/app/src/main/assets/web/analytics_studio.js');
const Locale=require('../../android/app/src/main/assets/web/localization_20_recovery.js');

function run(code){
 const doc={createElement(tag){
  return {tagName:tag.toUpperCase(),children:[],events:{},attributes:{},style:{},value:'',innerHTML:'',textContent:'',
   setAttribute(k,v){this.attributes[k]=v;},
   addEventListener(k,cb){this.events[k]=cb;},
   appendChild(n){this.children.push(n);if(this.tagName==='SELECT'&&!this.value)this.value=n.value;return n;},
   append(...ns){this.children.push(...ns);},
   replaceChildren(...ns){this.children=ns;},
   remove(){this.removed=true;}};}};
 const host={ownerDocument:doc,children:[],appendChild(n){this.children.push(n);return n;}};
 const m=Studio.mount(host,()=>({sessionHistory:[{id:5,date:'2026-10-19',domain:'study',minutes:25}],tasksList:[]}),
  {locale:code,today:'2026-10-20',startDate:'2026-10-01',endDate:'2026-10-20'});
 const chart=host.children[0].children.find(x=>x.tagName==='DIV'&&x.style?.overflowX==='auto');
 const heat=host.children[0].children.filter(x=>x.tagName==='DIV'&&x.style?.overflowX==='auto')[1];
 assert.ok(chart?.innerHTML&&heat?.innerHTML,'Expected both interactive SVGs for recorded session');
 m.destroy();
 return {chart:chart.innerHTML,heat:heat.innerHTML};
}
test('20 locale chart and heatmap accessible labels come from verified language pack',()=>{
 for(const code of Locale.LANGUAGES){
  const {chart,heat}=run(code);
  const translatedMinute=Locale.t(code,'minute');
  const translatedSessions=Locale.t(code,'sessions');
  const translatedChart=Locale.t(code,'chart');
  const translatedHeat=Locale.t(code,'heatmapYear');
  assert.ok(chart.includes('aria-label="'+translatedChart+'"'),code+' chart description');
  assert.ok(heat.includes('aria-label="'+translatedHeat+'"'),code+' heatmap description');
  assert.ok(chart.includes(translatedMinute),code+' translated minute unit');
  assert.ok(chart.includes(translatedSessions),code+' translated session count');
  assert.ok(heat.includes(translatedMinute),code+' heatmap minute unit');
  for(const ascii of [chart,heat]) assert.doesNotMatch(ascii,/[\u0660-\u0669\u06f0-\u06f9\u0966-\u096f\u09e6-\u09ef]/,code+' only Western numeric glyphs');
 }
});
test('chart/heatmap aria strings escape injected translated labels',()=>{
 const day=[{key:'2026-10-19',minutes:3,sessions:1}];
 const bars=Studio.barsSvg(day,{label:'X" & <y>',minute:'m" <z>',sessions:'s&n'});
 assert.ok(bars.includes('X&quot; &amp; &lt;y&gt;'));
 assert.doesNotMatch(bars,/aria-label="X" &/);
 const year=Array.from({length:365},(_,i)=>({key:new Date(Date.UTC(2025,0,1+i)).toISOString().slice(0,10),minutes:i===50?2:0,sessions:i===50?1:0}));
 const heat=Studio.heatmapSvg(year,{label:'Y" & <y>',minute:'min&'});
 assert.ok(heat.includes('Y&quot; &amp; &lt;y&gt;'));
});
