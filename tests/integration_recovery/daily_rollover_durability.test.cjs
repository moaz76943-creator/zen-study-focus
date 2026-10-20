'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../../android/app/src/main/assets/web/app.js'),'utf8');
const begin=source.indexOf('function syncDailyRollover() {'),end=source.indexOf('\nfunction L()',begin);
function setup({integrated=false,today='2026-10-19',metricsDate='2026-10-19'}={}){
 let failure=null,writes=0;const messages=[],input={value:today};
 const cfg={lang:'en',todayMins:37,sessions:8,streak:2,metricsDate,water:6,sets:3,pagesRead:9,quickFocusRemainderSec:45,
  unknown:{retain:'العربية ٢ — हिन्दी'},sessionHistory:[{id:'old',date:'2026-10-19',minutes:37,completed:true},{id:'new',date:'2026-10-20',minutes:12,completed:true}]};
 const c=vm.createContext({cfg,todayISO:today,selectedCalDate:today,calYear:2026,calMonth:9,Date,window:{},
  localDateISO:()=> '2026-10-20',acceptedFocusHistory:x=>x,computeActualStreak:()=>2,
  document:{getElementById:()=>input},L:()=>({saveFailed:'Save failed'}),showToast:m=>messages.push(m)});
 function commit(next){writes++;assert.equal(c.cfg.todayMins,37,'No in-memory publication before persistence');if(failure==='throw')throw Error('QuotaExceededError');if(failure==='false')return false;return true;}
 c.saveFortressData=(key,next)=>{assert.equal(key,'zen_fortress_cfg_v21');return commit(next);};
 if(integrated)c.window.DF22Integration={getSnapshot:()=>({cfg:c.cfg,tasksList:[],notesList:[]}),write(before,after){assert.equal(before.cfg,c.cfg);const ok=commit(after.cfg);if(ok)c.cfg=after.cfg;return ok;}};
 vm.runInContext(source.slice(begin,end),c);
 return {c,input,messages,run:()=>vm.runInContext('syncDailyRollover()',c),fail:x=>failure=x,get writes(){return writes;}};
}
for(const integrated of [false,true])for(const failure of ['throw','false'])test(`DF-CX-006 rollover ${failure} leaves cfg/calendar untouched and permits exact retry (journal=${integrated})`,()=>{
 const h=setup({integrated}),before=JSON.stringify(h.c.cfg);h.fail(failure);
 assert.equal(h.run(),false);assert.equal(JSON.stringify(h.c.cfg),before);assert.equal(h.c.todayISO,'2026-10-19');assert.equal(h.c.selectedCalDate,'2026-10-19');assert.equal(h.input.value,'2026-10-19');assert.equal(h.messages.length,1);
 h.fail(null);assert.equal(h.run(),true);assert.equal(h.c.cfg.todayMins,12);assert.equal(h.c.cfg.sessions,8);assert.equal(h.c.cfg.water,0);assert.equal(h.c.cfg.quickFocusRemainderSec,0);assert.equal(h.c.cfg.unknown.retain,'العربية ٢ — हिन्दी');assert.equal(h.c.cfg.sessionHistory.length,2);assert.equal(h.c.todayISO,'2026-10-20');assert.equal(h.c.selectedCalDate,'2026-10-20');assert.equal(h.input.value,'2026-10-20');
 const count=h.writes;assert.equal(h.run(),true);assert.equal(h.writes,count,'Opening another tab must not rewrite unchanged cfg');
});
test('unchanged daily state causes no writes even when storage cannot accept any write',()=>{
 const h=setup({today:'2026-10-20',metricsDate:'2026-10-20'});h.fail('throw');assert.equal(h.run(),true);assert.equal(h.writes,0);assert.deepEqual(h.messages,[]);
});
test('shared failed-save warning is present in all 20 existing dictionaries',()=>{
 const start=source.indexOf('// Shared save-failure text'),stop=source.indexOf('let todayISO =',start);
 const languages='en ar es zh hi fr de ru pt ja id tr ko vi it bn ur fa pl nl'.split(' '),DICT=Object.fromEntries(languages.map(l=>[l,{}]));
 vm.runInNewContext(source.slice(start,stop),{DICT});
 for(const l of languages){assert.ok(DICT[l].saveFailed.length>5,l);if(l!=='en')assert.notEqual(DICT[l].saveFailed,DICT.en.saveFailed,l);}
});
