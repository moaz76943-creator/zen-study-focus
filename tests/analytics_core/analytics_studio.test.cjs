'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const A=require('../../android/app/src/main/assets/web/analytics_core_v21.js');
const S=require('../../android/app/src/main/assets/web/analytics_studio.js');
test('SVG daily bars have recorded values only, accessible interactive day marks',()=>{
 const report=A.buildReport({sessionHistory:[{id:'a',date:'2026-10-19',minutes:12,domain:'study'}]},
 {today:'2026-10-19',startDate:'2026-10-18',endDate:'2026-10-19'});
 const svg=S.barsSvg(report.daily);assert.match(svg,/data-day="2026-10-19"/);
 assert.match(svg,/tabindex="0" role="button"/);assert.match(svg,/12 min, 1 sessions/);
 assert.equal((svg.match(/<rect /g)||[]).length,2);assert.match(svg,/height="0.00"/);
});
test('heatmap SVG has exactly one day per year and no bogus intensity',()=>{
 const days=A.yearHeatmap({sessionHistory:[{id:1,date:'2024-02-29',minutes:1,domain:'study'}]},2024);
 const svg=S.heatmapSvg(days);assert.equal((svg.match(/<rect /g)||[]).length,366);
 assert.match(svg,/data-day="2024-02-29"/);assert.match(svg,/Calendar year heatmap/);
});
test('SVG renderer rejects forged date or negative statistics',()=>{
 assert.throws(()=>S.barsSvg([{key:'<svg>',minutes:5,sessions:1}]),TypeError);
 assert.throws(()=>S.barsSvg([{key:'2026-10-19',minutes:-5,sessions:1}]),TypeError);
 assert.throws(()=>S.heatmapSvg([]),TypeError);
});
test('week and month aggregation keys are valid interactive SVG categories',()=>{
 const r=A.buildReport({sessionHistory:[
 {id:'a',date:'2026-09-30',minutes:18,domain:'study'},
 {id:'b',date:'2026-10-01',minutes:32,domain:'work'}]},
 {today:'2026-10-01',startDate:'2026-09-29',endDate:'2026-10-01'});
 const weekly=S.barsSvg(r.weekly),monthly=S.barsSvg(r.monthly);
 assert.match(weekly,/data-day="2026-09-28"/);
 assert.match(monthly,/data-day="2026-09"/);
 assert.match(monthly,/data-day="2026-10"/);
 assert.match(monthly,/32 min, 1 sessions/);
});
