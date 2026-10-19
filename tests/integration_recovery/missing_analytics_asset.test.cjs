'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const app=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/assets/web/app.js'),'utf8');
test('DF-030 missing optional analytics script never erases cached metrics or saved history at rollover',()=>{
 let writes=0;
 const c=vm.createContext({window:{},cfg:{todayMins:37,sessions:3,streak:4,metricsDate:'2026-10-18',sessionHistory:[{id:'keep',date:'2026-10-18',minutes:37,domain:'study'}]},todayISO:'2026-10-18',Date,
  localDateISO:()=> '2026-10-19',document:{getElementById:()=>null},saveFortressData(){writes++;}});
 const start=app.indexOf('function acceptedFocusHistory('),end=app.indexOf('\nfunction L()',start);
 vm.runInContext(app.slice(start,end),c);const before=JSON.stringify(c.cfg);
 vm.runInContext('syncDailyRollover()',c);
 assert.equal(JSON.stringify(c.cfg),before);assert.equal(writes,0);
 assert.equal(vm.runInContext('computeActualStreak(cfg.sessionHistory)',c),4);
 assert.equal(vm.runInContext('acceptedFocusHistory(cfg.sessionHistory)',c),null);
});
