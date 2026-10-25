'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'../android/app/src/main/assets/web/app.js'),'utf8');
const begin=app.indexOf('const HabitFocusEngine = (function() {');
const stopToken='window.HabitFocusEngine = HabitFocusEngine;';
const end=app.indexOf(stopToken,begin);
assert.ok(begin>=0 && end>begin,'streak engine not located');
const part=app.slice(begin,end+stopToken.length);
function habit(streak, langDays='Days') {
  let created=null;
  const storage=new Map([['df_streak_count','999'],['df_streak_last_date','2099-01-01']]);
  const badgeParent={firstChild:null,insertBefore(n){created=n;}};
  const document={
    addEventListener(){},
    getElementById(){return null;},
    querySelector(){return {parentElement:badgeParent};},
    createElement(){return {className:'',innerHTML:'',id:''};}
  };
  const ctx={
    window:{}, document, cfg:{streak},
    L(){return {daysUnit:langDays};},
    localDateISO(){return '2026-10-25';},
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v))},
  };
  vm.runInNewContext(part,ctx,{timeout:1500});
  return {engine:ctx.window.HabitFocusEngine,storage,created:()=>created};
}
test('streak reflects real session history summary, not a phantom or obsolete key',()=>{
  const h=habit(0);
  assert.equal(h.engine.getStreakData().count,0);
  assert.equal(h.engine.recordSessionForStreak(),0);
  assert.equal(h.storage.get('df_streak_count'),'999','Legacy counter must not be rewritten');
  const active=habit(3);
  assert.equal(active.engine.getStreakData().count,3);
});
test('visible streak text uses chosen language, not permanently English',()=>{
  const h=habit(5,'Tage');
  h.engine.injectStreakBadge();
  assert.match(h.created().innerHTML,/>5<\/span>/);
  assert.match(h.created().innerHTML,/>Tage<\/span>/);
  assert.doesNotMatch(h.created().innerHTML,/>Days Streak<\/span>/);
});
test('badge updates immediately when completed focus sessions update cfg.streak',()=>{
  const begin=app.indexOf('function syncHeaderMetrics() {');
  const end=app.indexOf('\nfunction updateTimerDisplay()',begin);
  assert.ok(begin>=0 && end>begin);
  const nodes=new Map();
  const context={
    cfg:{todayMins:8,streak:2,water:1,sets:0,pagesRead:0,sessions:2},
    document:{getElementById(id){if(!nodes.has(id))nodes.set(id,{textContent:''});return nodes.get(id);}},
    L(){return {daysUnit:'jours',waterWord:'Water',domSport:'Sport',domRead:'Read'};},
    toWest:x=>String(x),renderAnalyticsBars(){},renderTodayPlan(){},
  };
  vm.runInNewContext(app.slice(begin,end)+'\nsyncHeaderMetrics();',context,{timeout:1500});
  assert.equal(nodes.get('df-streak-badge-count').textContent,'2');
  assert.equal(nodes.get('df-streak-label').textContent,'jours');
});
test('badge mutation observer disconnects after successful mount',()=>{
  const p=app.indexOf('window.HabitFocusEngine = HabitFocusEngine;');
  const end=app.indexOf('/* ========================================================',p);
  const footer=app.slice(p, end>p?end:p+600);
  assert.match(footer,/obs\.disconnect\(\)/);
});
