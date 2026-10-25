const assert = require('assert');
const { generateWeeklyInsights } = require('../android/app/src/main/assets/web/js/weekly_insights_engine.js');
const { containsOnlyWesternDigits } = require('../android/app/src/main/assets/web/js/numeral_invariant_guard.js');

console.log("--- Running 🎯 Mission #033: Weekly Insights Tests ---");

// Test 1: Trend Upward Comparison (+50% increase)
const currentWeek = [
    { dateStr: "2026-10-19", durationMinutes: 60, activityType: "study" },
    { dateStr: "2026-10-20", durationMinutes: 90, activityType: "study" }, // Peak Day!
    { dateStr: "2026-10-22", durationMinutes: 30, activityType: "reading" }
]; // Total: 180 mins

const previousWeek = [
    { dateStr: "2026-10-12", durationMinutes: 60, activityType: "study" },
    { dateStr: "2026-10-13", durationMinutes: 60, activityType: "reading" }
]; // Total: 120 mins

const insights = generateWeeklyInsights(currentWeek, previousWeek, "ar");

assert.strictEqual(insights.currentWeekTotalMinutes, 180);
assert.strictEqual(insights.previousWeekTotalMinutes, 120);
assert.strictEqual(insights.trend, "UP");
assert.strictEqual(insights.deltaPercentage, 50, "180 vs 120 must equal exactly +50% increase!");
assert.strictEqual(insights.peakDay, "2026-10-20");
assert.strictEqual(insights.peakDayMinutes, 90);
assert.strictEqual(insights.topActivity, "study");
assert.ok(insights.summaryText.includes("180 دقيقة"));
assert.ok(containsOnlyWesternDigits(insights.summaryText));
console.log(`✔ Test 1: Upward trend (+50%) & peak day verified: "${insights.summaryText}"`);

// Test 2: Safe Division by Zero Guard (Previous week has 0 minutes)
const emptyPrevious = [];
const insightsZero = generateWeeklyInsights(currentWeek, emptyPrevious, "ar");
assert.strictEqual(insightsZero.previousWeekTotalMinutes, 0);
assert.strictEqual(insightsZero.trend, "UP");
assert.strictEqual(insightsZero.deltaPercentage, 100);
assert.ok(!isNaN(insightsZero.deltaPercentage), "Delta must NEVER be NaN!");
console.log("✔ Test 2: Safe zero division guard verified (no NaN or crash).");

// Test 3: English Summary Verification
const insightsEn = generateWeeklyInsights(currentWeek, previousWeek, "en");
assert.ok(insightsEn.summaryText.includes("180 mins this week, up +50%"));
console.log(`✔ Test 3: English weekly summary verified: "${insightsEn.summaryText}"`);

console.log("--- All Mission #033 Weekly Insights Tests PASSED (GREEN) ---");
