'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const A=require('../../android/app/src/main/assets/web/analytics_recovery_core.js');
const U=require('../../android/app/src/main/assets/web/analytics_recovery_ui.js');
const base={date:'2026-10-19',minutes:10,domain:'study'};
const window={today:'2026-10-19',startDate:'2026-09-29',endDate:'2026-10-19'};

test('DF-123: interrupted and short_break modes do not contribute focus',()=>{
 const n=A.normalizeSessions([{id:'a',...base,mode:'short_break'},
  {id:'b',...base,status:'interrupted'}, {id:'c',...base,completed:true,mode:'focus'}]);
 assert.equal(n.sessions.length,1);assert.equal(n.quality.nonFocus,2);
});
test('DF-122: conflicting task attribution and recorded evidence are disclosed',()=>{
 const n=A.normalizeSessions([{id:'a',...base,taskId:1},
   {id:'a',...base,taskId:2},
   {id:'b',...base},
   {id:'b',...base,timeEvidence:'timer-monotonic-v1',
    startedAt:'2026-10-19T10:00:00Z',endedAt:'2026-10-19T10:10:00Z'}]);
 assert.equal(n.quality.conflicts,2);assert.equal(n.quality.duplicates,2);
 assert.equal(n.sessions.length,2);
});
test('DF-132: an ambiguous starter/real ID collision is never a clickable task relation',()=>{
 const r=A.buildReport({sessionHistory:[{id:'s',...base,taskId:9}],
 tasksList:[{id:9,isStarter:true,title:'Example'},{id:9,title:'Real task'}]},window);
 assert.equal(r.sessions[0].taskId,null);
});
test('DF-121: reads never mutate source history, including user-authored identifier glyphs',()=>{
 const originals=[Object.freeze({id:'٠١٢',...base})];
 Object.freeze(originals);
 const r=A.buildReport({sessionHistory:originals},window);
 assert.equal(r.sessions[0].id,'٠١٢');
 assert.match(A.toCSV(r),/"٠١٢"/);
 assert.equal(r.totals.minutes,10);
});
test('DF-123: unusual source objects cannot execute their custom string conversion',()=>{
 const unusual={toString(){throw Error('should not run')}};
 const n=A.normalizeSessions([{id:'x',...base,source:unusual}]);
 assert.equal(n.sessions.length,1);
});
test('DF-129: SVG blocks injected descriptions and preserves actual measured labels',()=>{
 const chart=U.renderBarsSvg([{key:'2026-10',minutes:75,sessions:3}],
 {label:'<img src=x onerror=alert(1)>'});
 assert.doesNotMatch(chart,/<img/);
 assert.match(chart,/&lt;img/);
 assert.match(chart,/75 min/);
});
