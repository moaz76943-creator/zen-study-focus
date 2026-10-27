'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Week=require('../../android/app/src/main/assets/web/js/room5/focus_weekly_intentions_engine.js');
const plan=()=>Week.createWeeklyPlan({weekStart:'2026-10-26',intentions:[{title:'Review German',day:'mon',priority:'high',estimatedMinutes:30},{title:'Read',day:'fri',estimatedMinutes:20}]}).plan;

test('B08 provides a deterministic, offline weekly plan',()=>{
  assert.equal(Week.SCHEMA_VERSION,1);
  const first=plan();
  assert.equal(first.weekStart,'2026-10-26');
  assert.equal(first.intentions.length,2);
  assert.deepEqual(plan(),first);
  assert.equal(Week.validateWeeklyPlan(first).ok,true);
  assert.equal(Week.createWeeklyPlan({weekStart:'2026-10-27'}).ok,false);
  assert.equal(Week.createWeeklyPlan({weekStart:'2026-02-30'}).ok,false);
});

test('B08 supports completing and restoring intentions without mutation',()=>{
  const original=plan();
  const done=Week.setCompleted(original,original.intentions[0].id,true);
  assert.equal(done.ok,true);
  assert.equal(done.plan.intentions[0].completed,true);
  assert.equal(original.intentions[0].completed,false);
  assert.equal(Week.setCompleted(done.plan,original.intentions[0].id,false).plan.intentions[0].completed,false);
  assert.equal(Week.setCompleted(done.plan,'missing',true).ok,false);
});

test('B08 supports additions, removal and day edits',()=>{
  const original=plan();
  const added=Week.addIntention(original,{title:'Exercise',day:'wed',estimatedMinutes:40});
  assert.equal(added.ok,true);
  assert.equal(added.plan.intentions.length,3);
  assert.equal(original.intentions.length,2);
  const id=added.plan.intentions[2].id;
  assert.equal(Week.moveIntention(added.plan,id,'sun').plan.intentions[2].day,'sun');
  assert.equal(Week.removeIntention(added.plan,id).plan.intentions.length,2);
  assert.equal(Week.addIntention(original,{title:''}).ok,false);
});

test('B08 summary only represents planned intention minutes, not completed timer credits',()=>{
  const original=plan();
  const done=Week.setCompleted(original,original.intentions[0].id,true).plan;
  const summary=Week.summarizeWeeklyPlan(done);
  assert.deepEqual({total:summary.total,completed:summary.completed,plannedMinutes:summary.plannedMinutes,doneMinutes:summary.doneMinutes},
    {total:2,completed:1,plannedMinutes:50,doneMinutes:30});
  assert.equal('creditedTimerMinutes' in summary,false);
});

test('B08 serializes, migrates, rejects unsupported versions and protects input',()=>{
  const original=plan();
  assert.deepEqual(Week.parse(Week.serialize(original)).plan,original);
  const old={schemaVersion:0,weekStart:'2026-10-26',intentions:[{title:'Plan work',day:'tue'}]};
  const migrated=Week.migrate(old);
  assert.equal(migrated.ok,true);
  assert.equal(migrated.plan.intentions.length,1);
  assert.equal(Week.parse('{bad').ok,false);
  assert.equal(Week.parse(JSON.stringify({schemaVersion:2,weekStart:'2026-10-26',intentions:[]})).ok,false);
  assert.equal(Week.createWeeklyPlan({weekStart:'2026-10-26',intentions:'bad'}).ok,false);
});
