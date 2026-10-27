'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {completionReceipt} = require('./completion_receipts.cjs');

test('real completion receipt validates IDs, minutes, duplicates and work-only remainder', () => {
  const make = () => ({sessions:2, todayMins:0, completedTimerIds:['work-1','work-2'], quickFocusRemainderSec:40,
    sessionHistory:['work-1','work-2'].map(id => ({id,mode:'focus',completed:true,minutes:0,domain:'sport'}))});
  const cfg = make();
  assert.deepEqual(completionReceipt(cfg,['work-1','work-2'],[0,0],40).history,cfg.sessionHistory);
  for (const corrupt of [
    c => {c.sessions++;}, c => {c.todayMins++;},
    c => {c.completedTimerIds.push('rest');}, c => {c.completedTimerIds[1]='work-1';},
    c => {c.sessionHistory.pop();}, c => {c.sessionHistory[1].id='rest';},
    c => {c.sessionHistory[1].mode='short';}, c => {c.sessionHistory[1].minutes=1;},
    c => {c.sessionHistory[1].completed=false;}, c => {c.quickFocusRemainderSec=60;}
  ]) {
    const invalid=make();corrupt(invalid);
    assert.throws(() => completionReceipt(invalid,['work-1','work-2'],[0,0],40));
  }
  assert.throws(() => completionReceipt(null,['work-1'],[1]),/unavailable/);
});

test('one naturally elapsed custom minute requires one persisted minute', () => {
  const cfg={sessions:1,todayMins:1,completedTimerIds:['custom'],sessionHistory:[{id:'custom',minutes:1,mode:'focus',completed:true}]};
  assert.equal(completionReceipt(cfg,['custom'],[1]).minutes,1);
  assert.throws(() => completionReceipt(cfg,['custom'],[0]));
});
