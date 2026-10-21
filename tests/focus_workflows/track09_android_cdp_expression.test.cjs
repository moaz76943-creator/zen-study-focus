'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'track09_android_cdp.cjs'),'utf8');
const fragment=script.match(/\bconst expression=([\s\S]*?);\s*let state;/);
if(!fragment)throw Error('Track09 Android CDP expression missing');
const expression=Function('return '+fragment[1])();
test('TRACK09 RED: cold Android WebView query is safe before cfg globals finish loading',()=>{
 const document={
  querySelectorAll:()=>[],
  getElementById:()=>null
 };
 const actual=vm.runInNewContext(expression,{
  document,location:{href:'file:///android_asset/web/index.html'}
 });
 assert.equal(actual.ready,undefined);
 assert.equal(actual.sessionCount,null);
 assert.equal(actual.goals,0);
 assert.equal(actual.renderGoal,false);
 assert.equal(actual.packagePage,false);
});
test('TRACK09 RED: initialized Android WebView reports real goal controls without mutating state',()=>{
 const docs=new Map([
  ['goalsEditGrid',{}],['dailyGoalsModal',{}],['navCalendar',{}],
  ['sec-calendar',{}],['qtProgressPanel',{}],['mainPlayBtn',{}],
  ['dailyGoalsRows',{textContent:'25 / 30'}]
 ]);
 const cfg={sessionHistory:[{id:'historic',domain:'study',date:'2026-10-21',minutes:25}]};
 const env={
  document:{readyState:'complete',querySelectorAll:()=>[{}, {}, {}, {}],getElementById:id=>docs.get(id)||null},
  location:{href:'file:///android_asset/web/index.html'},
  cfg,renderDailyGoals(){},gsRecordedMinutes(){},goToHomeAgenda(){},startQuickTraining(){}
 };
 const actual=vm.runInNewContext(expression,env);
 assert.equal(actual.goals,4);
 assert.equal(actual.sessionCount,1);
 assert.equal(actual.generatedNumbers,'25 / 30');
 assert.equal(cfg.sessionHistory[0].id,'historic');
});
