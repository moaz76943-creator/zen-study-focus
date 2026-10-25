'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const A=require('../../android/app/src/main/assets/web/analytics_core_v21.js');
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'v21.fixture.json'),'utf8'));
const opts={startDate:'2026-10-17',endDate:'2026-10-19',today:'2026-10-19'};
test('legacy v21 sessions count even when no timestamps exist; originals unchanged',()=>{
 const original=JSON.stringify(fixture),r=A.buildReport(fixture,opts);
 assert.equal(JSON.stringify(fixture),original);
 assert.deepEqual(r.totals,{minutes:115,sessions:4,averageMinutes:28.75});
 assert.equal(r.sessions[0].startedAt,null);assert.equal(r.sessions[0].endedAt,null);
 assert.equal(r.quality.timingVerified,0);
 assert.deepEqual(r.quality,{accepted:4,inRange:4,excluded:4,duplicates:1,invalid:2,samples:1,timingVerified:0});
});
test('numeric and string session IDs never collide; duplicate legitimate history counts once',()=>{
 const r=A.normalizeSessions([{id:7,date:'2026-10-19',minutes:4,domain:'study'},
 {id:'7',date:'2026-10-19',minutes:6,domain:'read'},
 {id:7,date:'2026-10-19',minutes:400,domain:'study'}]);
 assert.equal(r.sessions.length,2);assert.equal(A.summarize(r.sessions).minutes,10);assert.equal(r.duplicates,1);
});
test('invalid first duplicate never suppresses later valid session',()=>{
 const r=A.normalizeSessions([{id:'a',date:'2026-02-30',minutes:3,domain:'study'},
 {id:'a',date:'2026-10-19',minutes:3,domain:'study'}]);
 assert.equal(r.sessions.length,1);assert.equal(r.invalid,1);assert.equal(r.duplicates,0);
});
test('strict rejects corrupt, fabricated, out-of-range, missing and unsupported records',()=>{
 const h=[null,{id:1,date:'2026-10-19',minutes:'20',domain:'study'},
 {id:2,date:'2026-10-19',minutes:20,domain:'other'},
 {id:3,date:'2026-10-19',minutes:Infinity,domain:'study'},
 {id:4,date:'2026-10-19',minutes:1441,domain:'study'},
 {id:5,date:'2026-10-19',minutes:0,domain:'study',synthetic:true},
 {id:6,date:'2026-10-19',minutes:0,domain:'study'}];
 const r=A.normalizeSessions(h);assert.equal(r.sessions.length,1);assert.equal(r.sessions[0].minutes,0);
 assert.equal(r.invalid,5);assert.equal(r.samples,1);
});
test('daily weekly monthly and domain breakdown derive only from credited dates',()=>{
 const r=A.buildReport(fixture,opts);
 assert.deepEqual(r.daily.map(d=>[d.key,d.minutes,d.sessions]),[
 ['2026-10-17',25,1],['2026-10-18',60,2],['2026-10-19',30,1]]);
 assert.deepEqual(r.weekly.map(w=>[w.key,w.minutes]),[['2026-10-12',85],['2026-10-19',30]]);
 assert.deepEqual(r.monthly.map(m=>[m.key,m.minutes]),[['2026-10',115]]);
 assert.equal(r.byDomain.study.minutes,25);assert.equal(r.byDomain.read.minutes,20);
 assert.equal(r.byDomain.work.minutes,40);assert.equal(r.byDomain.sport.minutes,30);
});
test('streak policy counts active credited local days, permits yesterday and excludes zero-minute records',()=>{
 const r=A.buildReport(fixture,opts);assert.equal(r.streaks.current,3);assert.equal(r.streaks.longest,3);
 const h=[{id:'z',date:'2026-10-19',minutes:0,domain:'study'},
 {id:'a',date:'2026-10-18',minutes:1,domain:'study'},
 {id:'b',date:'2026-10-17',minutes:2,domain:'study'}];
 const result=A.buildReport({sessionHistory:h},opts);assert.equal(result.streaks.current,2);
});
test('unconfigured goals are unavailable; configured daily goals are compared against 3 real days',()=>{
 assert.equal(A.buildReport(fixture,opts).goals.available,false);
 const r=A.buildReport(fixture,{...opts,goals:{study:30,read:10}});
 assert.deepEqual(r.goals.byDomain,[{domain:'study',actualMinutes:25,targetMinutes:90,progress:27.78},
 {domain:'read',actualMinutes:20,targetMinutes:30,progress:66.67}]);
});
test('task stats exclude starter, duplicate IDs and archived; overdue requires explicit dueDate',()=>{
 const t=A.buildReport(fixture,opts).tasks;
 assert.equal(t.total,2);assert.equal(t.completed,1);assert.equal(t.remaining,1);
 assert.equal(t.archived,1);assert.equal(t.overdue,1);assert.equal(t.excluded,2);
 assert.deepEqual(t.projects,[{id:80,name:'October sprint',total:2,completed:1}]);
});
test('heatmap uses real leap-year date cells and avoids fabricated zeros in totals',()=>{
 const days=A.yearHeatmap({sessionHistory:[{id:'x',date:'2024-02-29',minutes:12,domain:'study'}]},2024);
 assert.equal(days.length,366);assert.equal(days.filter(x=>x.minutes).length,1);
 assert.equal(days.find(x=>x.key==='2024-02-29').minutes,12);
 assert.equal(A.yearHeatmap({},2025).length,365);
});
test('timezone and DST do not shift legacy credited local calendar dates',()=>{
 const src={sessionHistory:[{id:'before',date:'2026-03-29',minutes:10,domain:'study'},
 {id:'midnight',date:'2026-03-30',minutes:15,domain:'sport'}]};
 const r=A.buildReport(src,{startDate:'2026-03-29',endDate:'2026-03-30',today:'2026-03-30'});
 assert.deepEqual(r.daily.map(x=>x.minutes),[10,15]);
 assert.equal(r.streaks.current,2);
});
test('trusted future intervals retain real offset-aware instants; untrusted or naive times stay absent',()=>{
 const base={date:'2026-03-29',domain:'study',minutes:25};
 const r=A.normalizeSessions([
 {...base,id:'trusted',startedAt:'2026-03-29T01:50:00+01:00',endedAt:'2026-03-29T03:15:00+02:00',timeEvidence:'timer-monotonic-v1'},
 {...base,id:'untrusted',startedAt:'2026-03-29T01:50:00+01:00',endedAt:'2026-03-29T03:15:00+02:00'},
 {...base,id:'naive',startedAt:'2026-03-29T01:50:00',endedAt:'2026-03-29T03:15:00',timeEvidence:'timer-monotonic-v1'},
 {...base,id:'wrong',startedAt:'2026-03-29T04:00:00+02:00',endedAt:'2026-03-29T03:00:00+02:00',timeEvidence:'timer-monotonic-v1'}]);
 assert.equal(r.sessions.length,4);assert.equal(r.sessions[0].startedAt,'2026-03-29T00:50:00.000Z');
 assert.equal(r.sessions[0].endedAt,'2026-03-29T01:15:00.000Z');
 assert.equal(r.sessions.slice(1).every(s=>s.startedAt===null),true);
});
test('CSV RFC4180 escaping, filter and formula mitigation and blank unknown timestamps',()=>{
 const r=A.buildReport({sessionHistory:[{id:'=SUM(1+1),"x"',date:'2026-10-19',minutes:5,domain:'study'}]},
 {today:'2026-10-19',startDate:'2026-10-19',endDate:'2026-10-19'});
 const csv=A.toCSV(r);assert.match(csv,/"'=SUM\(1\+1\),""x"""/);
 assert.match(csv,/"2026-10-19","study","5","","","false"/);
 assert.ok(csv.endsWith('\r\n'));assert.match(A.toCSV(r,'daily'),/^"date","minutes","sessions"/);
});
test('empty state is honestly zero, null average and no invented goals',()=>{
 const r=A.buildReport({cfg:{todayMins:999,sessions:100}},opts);
 assert.deepEqual(r.totals,{minutes:0,sessions:0,averageMinutes:null});
 assert.equal(r.daily.length,3);assert.equal(r.tasks.completionRate,null);
 assert.equal(r.streaks.current,0);assert.equal(r.goals.available,false);
});
test('invalid date ranges or huge periods rejected',()=>{
 assert.equal(A.validDay('2026-02-30'),false);assert.equal(A.validDay('2024-02-29'),true);
 assert.throws(()=>A.buildReport({}, {today:'2026-10-19',startDate:'2026-10-20',endDate:'2026-10-19'}),RangeError);
 assert.throws(()=>A.buildReport({}, {today:'2026-10-19',startDate:'2010-01-01',endDate:'2026-10-19'}),RangeError);
});
