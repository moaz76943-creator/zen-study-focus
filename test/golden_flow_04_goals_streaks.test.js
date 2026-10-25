/**
 * DEEP FOCUS — Golden Flow 4 End-to-End Test (Section 46)
 * Full User Journey:
 * Create Goal -> Complete Related Activity -> Verify Real Progress -> Reopen -> Verify Achievement
 */
const assert = require('assert');

// Import guards from Phase 1
const { updateGoalOnConfirmedSession, onLocaleOrThemeChange } = require('../android/app/src/main/assets/web/js/goals_achievements_guard.js');
const { formatPercentage } = require('../android/app/src/main/assets/web/js/numeral_invariant_guard.js');

console.log("==========================================================");
console.log(" [GOLDEN FLOW 4] Starting Goals & Real Streaks Journey    ");
console.log("==========================================================");

// Stage 1: Create Daily Goal (Target: 50 minutes of focus)
let userGoal = {
    todayMinutes: 0,
    dailyTargetMinutes: 50,
    currentStreak: 0,
    longestStreak: 3,
    lastActiveDate: null,
    achievements: {}
};
console.log("✔ Stage 1: Daily goal initialized (Target: 50 mins, Streak: 0).");

// Stage 2: Complete Session 1 (25 minutes) - Goal Partially Met
const session1 = { durationMinutes: 25, dateStr: "2026-10-22" };
const resSession1 = updateGoalOnConfirmedSession(userGoal, session1, true);

assert.strictEqual(resSession1.updated, true);
assert.strictEqual(resSession1.progress.todayMinutes, 25);
assert.strictEqual(resSession1.progress.currentStreak, 0, "Streak must not advance until full daily target is met.");
const pct1 = formatPercentage((resSession1.progress.todayMinutes / 50) * 100);
assert.ok(pct1.includes("50%"));
userGoal = resSession1.progress;
console.log("✔ Stage 2: Session 1 completed: Progress at 25/50 mins (50%), streak safely pending.");

// Stage 3: Complete Session 2 (25 minutes) - Goal Met!
const session2 = { durationMinutes: 25, dateStr: "2026-10-22" };
const resSession2 = updateGoalOnConfirmedSession(userGoal, session2, true);

assert.strictEqual(resSession2.updated, true);
assert.strictEqual(resSession2.progress.todayMinutes, 50);
assert.strictEqual(resSession2.progress.currentStreak, 1, "Streak must increment to 1 upon meeting full target.");
assert.strictEqual(resSession2.progress.lastActiveDate, "2026-10-22");
userGoal = resSession2.progress;
console.log("✔ Stage 3: Session 2 completed: Goal 100% achieved! Streak advanced to 1 day.");

// Stage 4: Next Day Session (2026-10-23) - Consecutive Day Streak
const nextDaySession = { durationMinutes: 50, dateStr: "2026-10-23" };
const nextDayState = { ...userGoal, todayMinutes: 0 };
const resDay2 = updateGoalOnConfirmedSession(nextDayState, nextDaySession, true);

assert.strictEqual(resDay2.progress.todayMinutes, 50);
assert.strictEqual(resDay2.progress.currentStreak, 2, "Consecutive day must advance streak to 2 days.");
assert.strictEqual(resDay2.progress.lastActiveDate, "2026-10-23");
userGoal = resDay2.progress;
console.log("✔ Stage 4: Consecutive day completed: Streak incremented to 2 days.");

// Stage 5: Reach 7 Consecutive Days (Simulate Day 6: 2026-10-27 -> Day 7: 2026-10-28)
// Setting up Day 6 legitimately so next day is strictly diffDays === 1
userGoal.currentStreak = 6;
userGoal.lastActiveDate = "2026-10-27";

const day7Session = { durationMinutes: 50, dateStr: "2026-10-28" };
const day7State = { ...userGoal, todayMinutes: 0 };
const resMilestone = updateGoalOnConfirmedSession(day7State, day7Session, true);

assert.strictEqual(resMilestone.progress.currentStreak, 7, "Streak must strictly reach 7 consecutive days.");
assert.ok(resMilestone.progress.achievements["streak_7_days"] !== undefined, "7-day achievement must unlock!");
assert.strictEqual(resMilestone.progress.achievements["streak_7_days"].title, "7-Day Focus Master");
userGoal = resMilestone.progress;
console.log("✔ Stage 5: 7-Day Focus Master achievement unlocked legitimately upon reaching 7 consecutive days.");

// Stage 6: Reopen App & Switch Language / Theme (Invariance Check)
console.log("[*] Simulating App Reopen & Theme/Locale switch to Arabic Dark Mode...");
const reloadedAfterThemeChange = onLocaleOrThemeChange(userGoal);

assert.strictEqual(reloadedAfterThemeChange.currentStreak, 7);
assert.strictEqual(reloadedAfterThemeChange.longestStreak, 7);
assert.strictEqual(reloadedAfterThemeChange.lastActiveDate, "2026-10-28");
assert.ok(reloadedAfterThemeChange.achievements["streak_7_days"] !== undefined);
console.log("✔ Stage 6: Full streak progress and unlocked achievements survived app reload and theme switch.");

console.log("==========================================================");
console.log(" [GOLDEN FLOW 4] ALL 6 STAGES PASSED (100% GREEN) ");
console.log("==========================================================");
