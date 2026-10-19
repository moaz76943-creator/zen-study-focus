'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {parseTasks,countTasks,filterTasks,repairPrompt,shortSHA}=require('../../docs/control-center/control-center.js');
const ledger=[
  '| DF-001 | TESTED | BASELINE | preserve backup | source |',
  '| DF-002 | BLOCKED | AUDIO | document sounds | phone test |',
  '| DF-003 | IN_PROGRESS | NOTES | test editor | source |',
  '| DF-002 | TESTED | AUDIO | duplicate | should ignore |',
  '| --- | --- | --- | --- | --- |'
].join('\n');
test('parses official ledger rows, ignoring duplicates and non-task lines',()=>{
  const tasks=parseTasks(ledger);assert.equal(tasks.length,3);assert.equal(tasks[1].status,'BLOCKED');
});
test('counts statuses without interpreting TESTED as release approval',()=>{
  assert.deepEqual(countTasks(parseTasks(ledger)),{total:3,BLOCKED:1,TESTED:1,IN_PROGRESS:1,TODO:0,DEFERRED:0});
});
test('filters by status, area and text, prioritizing blocked tasks',()=>{
  const tasks=parseTasks(ledger);
  assert.deepEqual(filterTasks(tasks,'','ALL','ALL').map(t=>t.id),['DF-002','DF-003','DF-001']);
  assert.deepEqual(filterTasks(tasks,'sounds','BLOCKED','AUDIO').map(t=>t.id),['DF-002']);
});
test('repair prompt mentions exact SHA and safety constraints',()=>{
  const instructions=repairPrompt(parseTasks(ledger),'a'.repeat(40));
  assert.match(instructions,/DF-002/);assert.match(instructions,/ZEN21::/);
  assert.match(instructions,/a{40}/);assert.match(instructions,/Do NOT force-push/);
});
test('unknown SHA remains unknown, not fabricated',()=>{
  assert.equal(shortSHA('branch-name'),'غير متاح');
  assert.match(repairPrompt([],''),/افحصه أولًا/);
});

test('single-task repair action includes the requested non-blocked task',()=>{
  const only=parseTasks(ledger).filter(t=>t.id==='DF-003');
  assert.match(repairPrompt(only,'a'.repeat(40)),/DF-003/);
});
