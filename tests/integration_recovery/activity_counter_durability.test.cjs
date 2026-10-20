'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/assets/web/app.js'),'utf8');
function extract(name){
 const begin=source.indexOf('function '+name+'('),end=source.indexOf('\n}',begin);
 assert.ok(begin>=0&&end>begin,'Missing live application function '+name);
 return source.slice(begin,end+2);
}
function scenario({sets=3,pagesRead=8,fail=false,ack=true,lang='en'}={}){
 const events=[],cfg={sets,pagesRead,lang};
 const context=vm.createContext({cfg,
  saveFortressData:(key,obj)=>{
   events.push(['save',key,JSON.stringify(obj)]);
   if(fail)throw new Error('QuotaExceededError');
   return ack;
  },
  showToast:t=>events.push(['toast',t]),
  syncHeaderMetrics:()=>events.push(['render']),
  toWest:x=>x,L:()=>({domSport:'Workout',domRead:'Reading'})
 });
 vm.runInContext(extract('logWorkoutSet')+'\n'+extract('addReadPages'),context);
 return {cfg,events,run:js=>vm.runInContext(js,context)};
}
test('workout count is unchanged and no success notification is rendered on quota failure',()=>{
 const s=scenario({fail:true});
 assert.equal(s.run('logWorkoutSet()'),false);
 assert.equal(s.cfg.sets,3);
 assert.equal(s.events.filter(x=>x[0]==='render').length,0);
 assert.ok(!s.events.some(x=>x[0]==='toast'&&/4\/4/.test(x[1])),'No success claim');
 assert.ok(s.events.some(x=>x[0]==='toast'));
});
test('reading progress is unchanged and no success notification on mirror failure',()=>{
 const s=scenario({fail:true});
 assert.equal(s.run('addReadPages(2)'),false);
 assert.equal(s.cfg.pagesRead,8);
 assert.equal(s.events.filter(x=>x[0]==='render').length,0);
 assert.ok(!s.events.some(x=>x[0]==='toast'&&/\+2/.test(x[1])));
});
test('return false or non-ack from persistence is not treated as success',()=>{
 const s=scenario({ack:false});
 assert.equal(s.run('logWorkoutSet()'),false);
 assert.equal(s.run('addReadPages(2)'),false);
 assert.equal(s.cfg.sets,3);
 assert.equal(s.cfg.pagesRead,8);
});
test('successful workout and reading updates are persisted exactly once and render after ack',()=>{
 const s=scenario();
 assert.equal(s.run('logWorkoutSet()'),true);
 assert.equal(s.run('addReadPages(2)'),true);
 assert.equal(s.cfg.sets,4);assert.equal(s.cfg.pagesRead,10);
 assert.deepEqual(s.events.map(x=>x[0]),['save','render','toast','save','render','toast']);
 assert.ok(s.events.filter(x=>x[0]==='save').every(x=>x[1]==='zen_fortress_cfg_v21'));
});
test('negative/NaN/infinite reading increments cannot corrupt the stored counter',()=>{
 const s=scenario();
 for(const v of ['-1','NaN','Infinity','0','1.5']){
  assert.equal(s.run('addReadPages('+v+')'),false,v);
 }
 assert.equal(s.cfg.pagesRead,8);
 assert.equal(s.events.some(x=>x[0]==='save'),false);
});
