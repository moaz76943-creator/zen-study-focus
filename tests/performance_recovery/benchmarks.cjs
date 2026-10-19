'use strict';
/* Synthetic, local JS core timings only. NEVER describe as Android WebView, startup, DOM, audio or GPU measurements. */
const {performance}=require('node:perf_hooks');
const path=require('node:path');
const {windowRange}=require('./optimizers.cjs');
const source=name=>require(path.resolve(__dirname,'../../android/app/src/main/assets/web',name));
const Notes=source('notes_core_v21.js');
const Tasks=source('tasks_core_v21.js');
const Analytics=source('analytics_recovery_core.js');
const samples=[];
const iterations=Math.max(1,Math.min(40,parseInt(process.argv[2]||'7',10)||7));
const notes=Array.from({length:5000},(_,i)=>({
  id:i,title:'Note '+i,body:i%100===0?'target_keyword lecture':'ordinary lecture',
  isStarter:false,createdAt:i,updatedAt:i,catKey:'quick'
}));
const tasks={cfg:{},tasksList:Array.from({length:1000},(_,i)=>({
  id:i,title:i%10===0?'Target task '+i:'Other task '+i,
  date:'2026-10-19',catKey:'study',done:false,isStarter:false,status:'todo'
}))};
const analytics={sessionHistory:Array.from({length:10000},(_,i)=>({
  id:'verified-'+i,date:'2026-10-19',minutes:25,domain:'study',mode:'focus',completed:true
}))};
function measure(label,fn,verify){
  for(let i=0;i<2;i++)verify(fn()); // warm up & assert real result first
  const readings=[];
  const heapBefore=process.memoryUsage().heapUsed;
  const rssBefore=process.memoryUsage().rss;
  for(let i=0;i<iterations;i++){
    const start=performance.now();
    const result=fn();
    readings.push(performance.now()-start);
    verify(result);
  }
  const heapAfter=process.memoryUsage().heapUsed,rssAfter=process.memoryUsage().rss;
  const sorted=readings.slice().sort((a,b)=>a-b);
  const percentile=p=>sorted[Math.max(0,Math.ceil(sorted.length*p)-1)];
  samples.push({label,iterations,ms:{min:sorted[0],median:percentile(.5),p95:percentile(.95),max:sorted.at(-1)},
    memoryObservationBytes:{heapBefore,heapAfter,rssBefore,rssAfter}});
}
measure('notes_core.search_5000',()=>Notes.search(notes,{query:'target_keyword',limit:30}),r=>{
  if(r.total!==50||r.items.length!==30)throw Error('unexpected note result');
});
measure('tasks_core.search_1000',()=>Tasks.searchTasks(tasks,{query:'Target'}),r=>{
  if(r.length!==100)throw Error('unexpected task result');
});
measure('analytics_recovery.buildReport_10000',()=>Analytics.buildReport(analytics,{
  today:'2026-10-19',startDate:'2026-10-19',endDate:'2026-10-19'}),r=>{
  if(r.quality.accepted!==10000||r.totals.minutes!==250000)throw Error('unexpected analytics result');
});
measure('candidate.window_5000',()=>windowRange(notes,40,40,40),r=>{
  if(r.items.length!==40||r.total!==5000)throw Error('unexpected window result');
});
console.log(JSON.stringify({kind:'synthetic-node-core-benchmark',platform:'Node.js (NOT Android)',
  version:process.version,arch:process.arch,os:process.platform,
  iterations,fixtures:{notes:5000,tasks:1000,sessions:10000},
  timingNote:'Synchronous JS domain functions only: excludes DOM, browser paint, storage, decoding, cold startup, GPU and device RAM.',
  memoryNote:'Node process observational heap/rss delta includes GC noise; not Android WebView RSS.',
  results:samples},null,2));
