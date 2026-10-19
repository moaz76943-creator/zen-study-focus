'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const app=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/assets/web/app.js'),'utf8');
function rig(integrated,training=false){
 const cfg={lang:'en',todayMins:0,sessions:0,streak:0,unknown:{keep:'١٢'},sessionHistory:[],quickFocusRemainderSec:45};
 let fail=false,writes=0,refresh=0;const messages=[];
 const c=vm.createContext({cfg,tasksList:[{id:7,title:'Task',isStarter:false}],window:{},JSON,Number,Math,
  currentTimerModeKey:'focus',timerSessionId:'stable-id',timerActiveMs:training?20000:60000,
  quickTraining:training?{active:true}:null,focusSessionTaskId:7,
  localDateISO:()=> '2026-10-20',computeActualStreak:()=>1,syncHeaderMetrics(){refresh++;},
  document:{dispatchEvent(){}},showToast:s=>messages.push(s),CustomEvent:class{},
  saveFortressData(key,next){writes++;if(fail)throw Error('QuotaExceededError');return true;}
 });
 const run=s=>vm.runInContext(s,c);
 if(integrated)c.window.DF22Integration={getSnapshot:()=>JSON.parse(run('JSON.stringify({cfg,tasksList,notesList:[]})')),
  write(before,after){writes++;if(fail)throw Error('QuotaExceededError');c.cfg=after.cfg;return true;},onSessionRecorded(){}};
 const start=app.indexOf('function creditCompletedSession('),end=app.indexOf('\nfunction finalizeTimerSession',start);
 run(app.slice(start,end));
 return {run,fail(v){fail=v;},messages,get writes(){return writes;},get refresh(){return refresh;}};
}
for(const integrated of [true,false])for(const training of [true,false])test(`DF-112/122 failed completion retains real credit for retry (journal=${integrated}, training=${training})`,()=>{
 const h=rig(integrated,training),before=h.run('JSON.stringify(cfg)');h.fail(true);
 assert.equal(h.run('creditCompletedSession()'),false);
 assert.equal(h.run('JSON.stringify(cfg)'),before,'Uncommitted IDs/counters/remainder must not be published');
 assert.equal(h.refresh,0);h.fail(false);
 assert.equal(h.run('creditCompletedSession()'),true);
 assert.equal(h.run('cfg.sessions'),1);assert.equal(h.run('cfg.sessionHistory.length'),1);
 assert.equal(h.run('cfg.sessionHistory[0].minutes'),1);
 assert.equal(h.run('cfg.sessionHistory[0].taskId'),7);
 assert.equal(h.run('cfg.unknown.keep'),'١٢');
 assert.equal(h.run('cfg.quickFocusRemainderSec'),training?5:45);
 const writes=h.writes;
 assert.equal(h.run('creditCompletedSession()'),true);
 assert.equal(h.writes,writes,'Duplicate callback must not rewrite or count again');
 assert.equal(h.run('cfg.sessions'),1);
});
test('rest completion is a successful no-op without focus credit or persistence',()=>{
 const h=rig(true);h.run('currentTimerModeKey="short"');
 assert.equal(h.run('creditCompletedSession()'),true);assert.equal(h.writes,0);
});
