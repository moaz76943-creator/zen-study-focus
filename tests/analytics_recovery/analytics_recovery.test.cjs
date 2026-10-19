'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const A=require('../../android/app/src/main/assets/web/analytics_recovery_core.js');
const U=require('../../android/app/src/main/assets/web/analytics_recovery_ui.js');
const item=(id,date,minutes,domain='study',extra={})=>({id,date,minutes,domain,...extra});
const opts={today:'2026-10-19',startDate:'2026-10-01',endDate:'2026-10-19'};
const run=(history,more={},options={})=>A.buildReport({cfg:{sessionHistory:history},...more},{...opts,...options});

test('DF-121: plain v21 records are credited without inventing historical hours',()=>{
 const r=run([item('session-1','2026-10-19',25)]);
 assert.equal(r.totals.minutes,25);assert.equal(r.totals.sessions,1);
 assert.equal(r.sessions[0].startedAt,null);assert.equal(r.sessions[0].endedAt,null);
});
test('DF-122: duplicates use typed ID and report conflicting values without double counting',()=>{
 const rows=[item('5','2026-10-18',20),item('5','2026-10-18',20),
             item('5','2026-10-19',30),item(5,'2026-10-19',7)];
 const n=A.normalizeSessions(rows);
 assert.equal(n.sessions.length,2);
 assert.equal(n.quality.duplicates,2);assert.equal(n.quality.conflicts,1);
 assert.equal(run(rows).totals.minutes,27);
 assert.deepEqual(n.rejects.map(x=>x.reason),['DUPLICATE_ID','CONFLICTING_DUPLICATE']);
});
test('DF-123: invalid, sample, rest, paused and incomplete sessions never earn focus',()=>{
 const r=run([item('valid','2026-10-19',12),
 item('demo','2026-10-19',30,'work',{isDemo:true}),
 item('test','2026-10-19',30,'work',{isTest:true}),
 item('synthetic','2026-10-19',30,'work',{source:'synthetic'}),
 item('rest','2026-10-19',30,'study',{mode:'shortBreak'}),
 item('cancelled','2026-10-19',30,'study',{status:'cancelled'}),
 item('unfinished','2026-10-19',30,'study',{completed:false}),
 item('negative','2026-10-19',-2),item('huge','2026-10-19',1441),
 item('bad-date','2026-02-30',7),item('bad-domain','2026-10-19',7,'foo')]);
 assert.equal(r.totals.minutes,12);
 assert.equal(r.totals.sessions,1);
 assert.equal(r.quality.excluded,10);
});
test('DF-124: only explicitly proven clock evidence may expose start/end; date is never moved',()=>{
 const r=run([item('a','2026-10-19',10,'study',{startedAt:'2026-10-18T23:00:00Z',endedAt:'2026-10-18T23:10:00Z'}),
 item('b','2026-10-19',15,'study',{startedAt:'2026-10-18T23:00:00Z',endedAt:'2026-10-18T23:15:00Z',timeEvidence:'timer-monotonic-v1'})]);
 assert.equal(r.sessions[0].startedAt,null);
 assert.equal(r.sessions[1].startedAt,'2026-10-18T23:00:00.000Z');
 assert.equal(r.sessions[1].date,'2026-10-19');
});
test('DF-125: three fixed rolling totals use actual credited dates',()=>{
 const r=run([item(1,'2026-10-19',10),item(2,'2026-10-13',20),item(3,'2026-10-12',30),
 item(4,'2026-09-20',40)],{},{startDate:'2026-09-01'});
 assert.deepEqual([r.dashboard.today.minutes,r.dashboard.last7.minutes,r.dashboard.last30.minutes],[10,30,60]);
});
test('DF-126: comparison is exactly 7 vs preceding 7, baseline zero yields null percent',()=>{
 const r=run([item(1,'2026-10-18',21),item(2,'2026-10-10',14)]);
 assert.equal(r.comparison.current.minutes,21);
 assert.equal(r.comparison.previous.minutes,14);
 assert.equal(r.comparison.changePercent,50);
 const zero=run([item(1,'2026-10-18',21)]);
 assert.equal(zero.comparison.changePercent,null);
});
test('DF-127,136: activity and date filter are strict; reversed range is rejected',()=>{
 const r=run([item(1,'2026-10-19',10),item(2,'2026-10-19',17,'work')],{},
 {startDate:'2026-10-19',domain:'work'});
 assert.equal(r.totals.minutes,17);
 assert.throws(()=>run([],{},{startDate:'2026-10-20',endDate:'2026-10-19'}),RangeError);
 assert.throws(()=>run([],{},{domain:'invalid'}),RangeError);
});
test('DF-129,137: SVG marks carry drilldown keys and no Eastern Arabic numerals',()=>{
 const svg=U.renderBarsSvg([{key:'2026-10-19',minutes:1234,sessions:2},{key:'2026-10-20',minutes:0,sessions:0}]);
 assert.match(svg,/data-bucket="2026-10-19"/);
 assert.match(svg,/tabindex="0"/);assert.match(svg,/role="button"/);
 assert.match(svg,/1234/);
 assert.doesNotMatch(svg,/[\u0660-\u0669\u06F0-\u06F9]/);
 assert.throws(()=>U.renderBarsSvg([{key:'<script>',minutes:1,sessions:1}]),TypeError);
});
test('DF-130: zero histories and missing snapshots produce no fake goals or percentages',()=>{
 const r=run([]);
 assert.deepEqual(r.totals,{minutes:0,sessions:0,averageMinutes:null});
 assert.equal(r.goals.available,false);assert.equal(r.comparison.changePercent,null);
 assert.equal(r.dashboard.today.sessions,0);assert.equal(r.streaks.current,0);
});
test('DF-132: link only to genuine numeric-ID task recorded on session',()=>{
 const r=run([item('a','2026-10-19',10,'study',{taskId:17}),
              item('b','2026-10-19',10,'study',{taskId:18})],
 {tasksList:[{id:17,title:'Real',done:false},{id:18,isStarter:true,title:'Example',done:false}]});
 assert.equal(r.sessions[0].taskId,17);assert.equal(r.sessions[1].taskId,null);
});
test('DF-134: leap day, ISO week boundary and streaks use credited local dates',()=>{
 const r=A.buildReport({sessionHistory:[
 item(1,'2024-02-28',10),item(2,'2024-02-29',10),item(3,'2024-03-01',10)]},
 {today:'2024-03-01',startDate:'2024-02-26',endDate:'2024-03-03'});
 assert.equal(r.streaks.current,3);
 assert.equal(r.daily.find(x=>x.key==='2024-02-29').minutes,10);
 assert.equal(r.weekly[0].key,'2024-02-26');
});
test('DF-135: goals only reflect explicitly recorded per-date snapshots',()=>{
 const absent=run([item(1,'2026-10-19',20)]);
 assert.equal(absent.goals.available,false);
 const real=run([item(1,'2026-10-19',20)],{
  goalSnapshots:[{date:'2026-10-19',domain:'study',targetMinutes:40}]},
  {startDate:'2026-10-19'});
 assert.equal(real.goals.available,true);
 assert.equal(real.goals.byDomain[0].actualMinutes,20);
 assert.equal(real.goals.byDomain[0].targetMinutes,40);
 assert.equal(real.goals.byDomain[0].coverageDays,1);
});
test('DF-131: CSV escapes formulas, quotes, CRLF and exposes only real exported rows',()=>{
 const r=run([item('=HYPERLINK("http://x")','2026-10-19',2)]);
 const csv=A.toCSV(r,'sessions');
 assert.match(csv,/^"id","date","domain","minutes"/);
 assert.match(csv,/"'=HYPERLINK\(""http:\/\/x""\)"/);
 assert.match(csv,/"2026-10-19"/);assert.ok(csv.endsWith('\r\n'));
 assert.doesNotMatch(csv,/[\u0660-\u0669\u06F0-\u06F9]/);
});
test('DF-131: save result is acknowledged only after promised outcome, cancellation and failure are distinct',async()=>{
 const r=run([item(1,'2026-10-19',10)]);
 let finish;
 const pending=new Promise(resolve=>finish=resolve);
 const exp=A.createExportController(()=>pending);
 const request=exp.submit(r,'sessions');
 assert.equal(exp.busy,true);
 assert.equal((await exp.submit(r,'sessions')).status,'busy');
 finish({status:'cancelled'});
 assert.equal((await request).status,'cancelled');
 assert.equal(exp.busy,false);
 assert.equal((await A.createExportController(async()=>({status:'saved'})).submit(r)).status,'saved');
 assert.equal((await A.createExportController(async()=>{throw Error('disk full');}).submit(r)).status,'failed');
 assert.equal((await A.createExportController(()=>undefined).submit(r)).status,'failed');
});
test('DF-133: 10,000 valid sessions aggregate without quadratic scan or double credit',()=>{
 const rows=Array.from({length:10000},(_,i)=>item('real-'+i,
   '2026-10-'+String(1+i%19).padStart(2,'0'),1,i%2?'work':'study'));
 rows.push(rows[0]);const start=performance.now();const r=run(rows);
 assert.equal(r.totals.sessions,10000);assert.equal(r.totals.minutes,10000);
 assert.equal(r.quality.duplicates,1);
 assert.ok(performance.now()-start<5000,'10,000-record aggregate took too long');
});
