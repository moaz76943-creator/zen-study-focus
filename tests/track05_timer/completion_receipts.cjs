'use strict';
const assert = require('node:assert/strict');

// Consume real cfg receipts, never generate application state or timer events.
function completionReceipt(cfg, ids, minutes, remainderSec = 0) {
  assert.ok(cfg && typeof cfg === 'object', 'Completed cfg unavailable');
  assert.equal(minutes.length, ids.length, 'Expected completion IDs/minutes differ in length');
  assert.equal(new Set(ids).size, ids.length, 'Observed work IDs must be unique');
  assert.equal(cfg.sessions, ids.length, 'Session counter differs from actual completions');
  assert.equal(cfg.todayMins, minutes.reduce((sum, value) => sum + value, 0), 'Focus minutes include unearned/rest time');
  assert.deepEqual(cfg.completedTimerIds, ids, 'Completed-ID ledger differs from observed work sessions');
  assert.ok(Array.isArray(cfg.sessionHistory), 'Session history unavailable');
  assert.equal(cfg.sessionHistory.length, ids.length, 'Duplicate or missing history row');
  cfg.sessionHistory.forEach((row, index) => {
    assert.equal(row.id, ids[index], 'History ID differs from observed work session');
    assert.equal(row.minutes, minutes[index], 'History minutes differ from elapsed work');
    assert.equal(row.mode, 'focus', 'Rest history was credited as focus');
    assert.equal(row.completed, true, 'Completion flag missing');
  });
  assert.equal(Number(cfg.quickFocusRemainderSec || 0), remainderSec, 'Quick focus seconds include rest or lost work');
  return {ids:cfg.completedTimerIds, minutes:cfg.todayMins, remainderSec, history:cfg.sessionHistory};
}

module.exports = {completionReceipt};
