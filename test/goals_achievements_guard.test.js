const assert = require('assert');
const {
    updateGoalOnConfirmedSession,
    onLocaleOrThemeChange
} = require('../android/app/src/main/assets/web/js/goals_achievements_guard.js');

console.log("--- Running 🎯 Mission #012: Goals & Streaks Tests ---");

// Initial state
const initialGoal = {
    todayMinutes: 0,
    dailyTargetMinutes: 25,
    currentStreak: 0,
    longestStreak: 5,
    lastActiveDate: null,
    achievements: {}
};

// Test 1: Block Phantom Progress on Failed Storage Save
const resFailed = updateGoalOnConfirmedSession(
    initialGoal,
    { durationMinutes: 25, dateStr: "2026-10-22" },
    false // Storage unconfirmed!
);
assert.strictEqual(resFailed.updated, false);
assert.strictEqual(resFailed.reason, "STORAGE_NOT_CONFIRMED_PHANTOM_PROGRESS_BLOCKED");
assert.strictEqual(resFailed.progress.todayMinutes, 0);
console.log("✔ Test 1: Phantom progress blocked when storage is unconfirmed.");

// Test 2: Progress accurately advanced on confirmed save
const resSuccess1 = updateGoalOnConfirmedSession(
    initialGoal,
    { durationMinutes: 25, dateStr: "2026-10-22" },
    true // Confirmed!
);
assert.strictEqual(resSuccess1.updated, true);
assert.strictEqual(resSuccess1.progress.todayMinutes, 25);
assert.strictEqual(resSuccess1.progress.currentStreak, 1);
assert.strictEqual(resSuccess1.progress.lastActiveDate, "2026-10-22");
console.log("✔ Test 2: Confirmed session recorded streak and progress accurately.");

// Test 3: Consecutive Day Streak Increment (2026-10-22 -> 2026-10-23)
const resDay2 = updateGoalOnConfirmedSession(
    { ...resSuccess1.progress, todayMinutes: 0 },
    { durationMinutes: 30, dateStr: "2026-10-23" },
    true
);
assert.strictEqual(resDay2.progress.currentStreak, 2);
assert.strictEqual(resDay2.progress.lastActiveDate, "2026-10-23");
console.log("✔ Test 3: Consecutive day streak successfully incremented to 2.");

// Test 4: Guarantee Immutability on Locale/Theme Change
const afterThemeSwitch = onLocaleOrThemeChange(resDay2.progress);
assert.strictEqual(afterThemeSwitch.currentStreak, 2);
assert.strictEqual(afterThemeSwitch.longestStreak, 5);
assert.strictEqual(afterThemeSwitch.lastActiveDate, "2026-10-23");
console.log("✔ Test 4: Locale and Theme change verified to cause ZERO data mutation.");

console.log("--- All Mission #012 Goals Tests PASSED (GREEN) ---");
