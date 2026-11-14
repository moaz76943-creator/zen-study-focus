#!/usr/bin/env node
'use strict';
// Analytics scale probe (Node, current v21 core). Synthetic data only. NOT an Android WebView measurement.
const fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/assets/web/analytics_core_v21.js'),'utf8');
const m={exports:{}};new Function('module','exports',src)(m,m.exports);const core=m.exports;
const now=()=>Number(process.hrtime.bigint())/1e6;
const mk=n=>Array.from({length:n},(_,i)=>({id:i+1,date:'2026-09-'+String(i%30+1).padStart(2,'0'),minutes:i%50+1,domain:['study','work','read','sport'][i%4]}));
const opt={today:'2026-10-19',startDate:'2026-09-01',endDate:'2026-09-30'};
const out={note:'node '+process.version+', synthetic, not Android',runs:[],checks:[]};
function time(label,fn){global.gc&&global.gc();const h0=process.memoryUsage().heapUsed,t=now();const r=fn();const ms=now()-t;out.runs.push({label,ms:+ms.toFixed(1),heapDeltaMB:+((process.memoryUsage().heapUsed-h0)/1048576).toFixed(1)});return r;}
for(const n of [10000,50000]){
  const h=mk(n),before=JSON.stringify(h);
  const r=time('buildReport '+n,()=>core.buildReport({sessionHistory:h},opt));
  out.checks.push({n,totalSessions:r.totals.sessions,totalMinutes:r.totals.minutes,mutated:JSON.stringify(h)!==before});
  time('buildReport domain filter(study) '+n,()=>core.buildReport({sessionHistory:h},Object.assign({domain:'study'},opt)));
  time('toCSV sessions '+n,()=>core.toCSV(r,'sessions'));
}
// empty and degenerate
const e=core.buildReport({sessionHistory:[]},opt);out.checks.push({empty:e.totals});
const e2=core.buildReport({},opt);out.checks.push({noHistory:e2.totals});
// duplicates: same id repeated must not double count
const d=mk(1000).concat(mk(1000));const rd=core.buildReport({sessionHistory:d},opt);out.checks.push({duplicateIdsInput:2000,counted:rd.totals.sessions,quality:rd.quality});
// zero/fractional minutes
const z=[{id:1,date:'2026-09-01',minutes:0,domain:'study'},{id:2,date:'2026-09-01',minutes:0.4,domain:'study'},{id:3,date:'2026-09-01',minutes:25,domain:'study'},{id:4,date:'2026-09-01',minutes:-5,domain:'study'},{id:5,date:'bad',minutes:5,domain:'study'}];
const rz=core.buildReport({sessionHistory:z},opt);out.checks.push({zeroFractionalNegativeBad:{counted:rz.totals,quality:rz.quality}});
console.log(JSON.stringify(out,null,1));
