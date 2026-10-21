'use strict';
// TRACK 17 — bounded synthetic benchmark of actual domain cores; never an Android or WebView result.
// Run with: node tests/performance_recovery/track17_benchmark.cjs <repository-root> [iterations]
const assert=require('node:assert/strict');
const path=require('node:path');
const {performance}=require('node:perf_hooks');
const root=path.resolve(process.argv[2]||'.');
const iterations=Math.max(3,Math.min(30,Number(process.argv[3]||9)||9));
const load=name=>require(path.join(root,'android/app/src/main/assets/web',name));
const Notes=load('notes_core_v21.js');
const Tasks=load('tasks_core_v21.js');
const Analytics=load('analytics_recovery_core.js');
const notes=Array.from({length:5000},(_,i)=>({
  id:i,title:'Note '+i,body:i%100===0?'target_keyword lecture':'ordinary lecture',
  isStarter:false,createdAt:i,updatedAt:i,catKey:'quick'
}));
const taskState={cfg:{},tasksList:Array.from({length:1000},(_,i)=>({
  id:i,title:i%10===0?'Target task '+i:'Other task '+i,
  date:'2026-10-19',catKey:'study',done:false,isStarter:false,status:'todo'
}))};
const analyticState={sessionHistory:Array.from({length:10000},(_,i)=>({
  id:'verified-'+i,date:'2026-10-19',minutes:25,domain:'study',mode:'focus',completed:true
}))};
function bench(name,action,verify){
  for(let i=0;i<3;i++)verify(action());
  const time=[],cpu=[];
  const rssStart=process.memoryUsage().rss,heapStart=process.memoryUsage().heapUsed;
  for(let i=0;i<iterations;i++){
    const c=process.cpuUsage(),t=performance.now();
    const result=action();
    time.push(performance.now()-t);
    const used=process.cpuUsage(c);
    cpu.push((used.user+used.system)/1000);
    verify(result);
  }
  const sort=x=>x.sort((a,b)=>a-b);
  const quant=(a,p)=>a[Math.ceil(a.length*p)-1];
  sort(time);sort(cpu);
  return {name,samples:iterations,
    wallMs:{median:quant(time,.5),p95:quant(time,.95),max:time.at(-1)},
    cpuMs:{median:quant(cpu,.5),p95:quant(cpu,.95)},
    syncTasksOver50ms:time.filter(x=>x>50).length,
    heapBeforeBytes:heapStart,heapAfterBytes:process.memoryUsage().heapUsed,
    rssBeforeBytes:rssStart,rssAfterBytes:process.memoryUsage().rss};
}
const results=[
  bench('notes.search/5000',()=>Notes.search(notes,{query:'target_keyword',limit:30}),
    r=>{assert.equal(r.total,50);assert.equal(r.items.length,30);}),
  bench('tasks.search/1000',()=>Tasks.searchTasks(taskState,{query:'Target'}),
    r=>{assert.equal(r.length,100);assert.equal(r[0].id,0);}),
  bench('analytics.buildReport/10000',()=>Analytics.buildReport(analyticState,{
    today:'2026-10-19',startDate:'2026-10-19',endDate:'2026-10-19'}),
    r=>{assert.equal(r.quality.accepted,10000);assert.equal(r.totals.sessions,10000);
      assert.equal(r.totals.minutes,250000);assert.equal(r.quality.duplicates,0);})
];
assert.equal(notes.length,5000);assert.equal(taskState.tasksList.length,1000);
assert.equal(analyticState.sessionHistory.length,10000);
console.log(JSON.stringify({
  kind:'track17-synthetic-core-only',platform:'Node.js; NOT Android/WebView/DOM/cold-start',
  node:process.version,arch:process.arch,os:process.platform,root,iterations,
  fixtures:{notes:5000,tasks:1000,sessions:10000},
  interpretation:'One synchronous function call per sample. Memory is process-wide observation, not leak evidence. No production data is mutated.',
  results
},null,2));
