const assert = require('assert');
const PersonalBestLeaderboard = require('../android/app/src/main/assets/web/modules/records/personal_best_leaderboard.js');

console.log('🧪 Starting PersonalBestLeaderboard (Axis 8: M8488-M8497) Unit Tests...');

const pb = new PersonalBestLeaderboard();

// Test 1: Daily Best Tracking
const r1 = pb.dfTrackPersonalBestDailyMinutes(180, '2026-11-01');
assert.strictEqual(r1.isNewPersonalRecord, true);
assert.strictEqual(pb.records.bestDailyMinutes.value, 180);
const r2 = pb.dfTrackPersonalBestDailyMinutes(60, '2026-11-01');
assert.strictEqual(pb.records.bestDailyMinutes.value, 240);
console.log('  ✓ dfTrackPersonalBestDailyMinutes verified.');

// Test 2: Weekly Best Tracking
const w1 = pb.dfTrackPersonalBestWeeklyHours(32.5);
assert.strictEqual(w1.isNewPersonalRecord, true);
assert.strictEqual(pb.records.bestWeeklyHours.value, 32.5);
console.log('  ✓ dfTrackPersonalBestWeeklyHours verified.');

// Test 3: Longest Unbroken Session Tracking
const s1 = pb.dfTrackLongestUnbrokenFocusSession(90);
assert.strictEqual(s1.isNewPersonalRecord, true);
assert.strictEqual(pb.records.longestUnbrokenSessionMinutes.value, 90);
console.log('  ✓ dfTrackLongestUnbrokenFocusSession verified.');

// Test 4: Highest Flashcard Streak
const fs1 = pb.dfTrackHighestFlashcardStreak(42);
assert.strictEqual(fs1.isNewPersonalRecord, true);
assert.strictEqual(pb.records.highestFlashcardStreak.value, 42);
console.log('  ✓ dfTrackHighestFlashcardStreak verified.');

// Test 5: Month-over-Month Comparison
const mom = pb.dfCompareCurrentMonthVsLastMonth();
assert.ok(typeof mom.currentMonthMinutes === 'number');
assert.ok(typeof mom.growthPercentage === 'number');
console.log('  ✓ dfCompareCurrentMonthVsLastMonth verified.');

// Test 6: Ghost Pacer Comparison
const pacer = pb.dfCalculateGhostPacerComparison();
assert.ok(['ahead_of_ghost', 'behind_ghost', 'tied'].includes(pacer.pacerStatus));
assert.ok(typeof pacer.encouragement === 'string');
console.log('  ✓ dfCalculateGhostPacerComparison verified.');

// Test 7: Award Badge System
const badge = pb.dfAwardNewPersonalRecordBadge('DAILY_SUMMIT', 300);
assert.strictEqual(badge.tier, 'Gold');
assert.strictEqual(badge.title, 'Daily Summit Breaker');
assert.ok(pb.records.awardedBadges.length >= 1);
console.log('  ✓ dfAwardNewPersonalRecordBadge verified.');

// Test 8: Trophy Cabinet SVG Rendering
const cabinet = pb.dfRenderPersonalRecordsTrophyCabinet();
assert.ok(cabinet.trophySvg.includes('<svg'));
assert.strictEqual(cabinet.summary.bestDailyMinutes, 240);
console.log('  ✓ dfRenderPersonalRecordsTrophyCabinet verified.');

// Test 9: Infographic Export
const infographic = pb.dfExportPersonalBestInfographic();
assert.ok(infographic.hashSignature.startsWith('DFPB:'));
assert.ok(infographic.infographicSvg.includes('<svg'));
console.log('  ✓ dfExportPersonalBestInfographic verified.');

// Test 10: Milestone Seal M8497
const seal = pb.dfGetMilestoneM8497PersonalBestSeal();
assert.strictEqual(seal.milestone, 'M8497');
assert.strictEqual(seal.status, 'VERIFIED_SOVEREIGN');
console.log('  ✓ dfGetMilestoneM8497PersonalBestSeal verified.');

console.log('🎉 All 10 PersonalBestLeaderboard tests passed with 100% assertions!');
