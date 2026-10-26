'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const guardPath = path.join(
  __dirname, '..', '..',
  'android', 'app', 'src', 'main', 'assets', 'web', 'js', 'goals_achievements_guard.js'
);
const {
  updateGoalOnConfirmedSession,
  onLocaleOrThemeChange,
  STORAGE_KEY_GOALS
} = require(guardPath);

function streakSixState() {
  return {
    todayMinutes: 20,
    dailyTargetMinutes: 25,
    currentStreak: 6,
    longestStreak: 10,
    lastActiveDate: '2026-10-22',
    achievements: {}
  };
}

test('v21 goals storage key stays exactly zen_fortress_goals_progress_v21', () => {
  assert.equal(STORAGE_KEY_GOALS, 'zen_fortress_goals_progress_v21');
});

test('session record without dateStr is rejected and the streak anchor survives', () => {
  const res = updateGoalOnConfirmedSession(streakSixState(), { durationMinutes: 5 }, true);
  assert.equal(res.updated, false);
  assert.equal(res.reason, 'INVALID_SESSION_RECORD');
  assert.equal(res.progress.lastActiveDate, '2026-10-22');
  assert.equal(res.progress.todayMinutes, 20);
  assert.equal(res.progress.currentStreak, 6);
});

test('malformed date strings are rejected instead of corrupting streak verification', () => {
  const badDates = ['10-22-2026', '٢٠٢٦-١٠-٢٢', '2026-10-22T00:00:00', '', '2026-13-45', 20261022];
  for (const dateStr of badDates) {
    const res = updateGoalOnConfirmedSession(streakSixState(), { durationMinutes: 5, dateStr }, true);
    assert.equal(res.updated, false, `expected rejection for ${JSON.stringify(dateStr)}`);
    assert.equal(res.reason, 'INVALID_SESSION_RECORD');
    assert.equal(res.progress.lastActiveDate, '2026-10-22');
  }
});

test('rejected dateless record cannot wipe the persisted streak on save round-trip', () => {
  const rejected = updateGoalOnConfirmedSession(streakSixState(), { durationMinutes: 5 }, true);
  const persisted = JSON.parse(JSON.stringify(rejected.progress));
  assert.equal(persisted.lastActiveDate, '2026-10-22');

  const next = updateGoalOnConfirmedSession(persisted, { durationMinutes: 5, dateStr: '2026-10-23' }, true);
  assert.equal(next.updated, true);
  assert.equal(next.progress.todayMinutes, 25);
  assert.equal(next.progress.currentStreak, 7);
  assert.equal(next.progress.lastActiveDate, '2026-10-23');
  assert.ok(next.progress.achievements.streak_7_days);
});

test('phantom-progress block, valid records and locale/theme immutability stay intact', () => {
  const blocked = updateGoalOnConfirmedSession(
    streakSixState(),
    { durationMinutes: 5, dateStr: '2026-10-23' },
    false
  );
  assert.equal(blocked.updated, false);
  assert.equal(blocked.reason, 'STORAGE_NOT_CONFIRMED_PHANTOM_PROGRESS_BLOCKED');
  assert.equal(blocked.progress.lastActiveDate, '2026-10-22');

  const accepted = updateGoalOnConfirmedSession(
    { ...streakSixState(), todayMinutes: 0 },
    { durationMinutes: 30, dateStr: '2026-10-23' },
    true
  );
  assert.equal(accepted.updated, true);
  assert.equal(accepted.status, 'PROGRESS_RECORDED');
  assert.equal(accepted.progress.todayMinutes, 30);
  assert.equal(accepted.progress.currentStreak, 7);
  assert.equal(accepted.progress.lastActiveDate, '2026-10-23');

  const clone = onLocaleOrThemeChange(accepted.progress);
  assert.deepEqual(clone, accepted.progress);
  assert.notEqual(clone, accepted.progress);
});
