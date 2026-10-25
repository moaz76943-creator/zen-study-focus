const assert = require('assert');
const RhythmEngine = require('../android/app/src/main/assets/web/js/daily_focus_rhythm_engine.js');

console.log("--- Running 🎯 Mission #054: Daily Focus Rhythm Engine Tests ---");

// Test 1: Diurnal period categorization across 24 hours
{
  assert.strictEqual(RhythmEngine.getPeriodForHour(6).id, "morning");
  assert.strictEqual(RhythmEngine.getPeriodForHour(13).id, "afternoon");
  assert.strictEqual(RhythmEngine.getPeriodForHour(19).id, "evening");
  assert.strictEqual(RhythmEngine.getPeriodForHour(23).id, "night");
  assert.strictEqual(RhythmEngine.getPeriodForHour(2).id, "night");
  console.log("✓ Test 1: 4 Diurnal periods categorization verified.");
}

// Test 2: Western hour formatting with LTR mark
{
  assert.strictEqual(RhythmEngine.formatHourWestern(9), "\u200E09:00");
  assert.strictEqual(RhythmEngine.formatHourWestern(15), "\u200E15:00");
  assert.strictEqual(RhythmEngine.formatHourWestern(0), "\u200E00:00");
  console.log("✓ Test 2: Western hour formatting & LTR mark verified.");
}

// Test 3: Accurate peak hour & peak period discovery
{
  const mockSessions = [
    { timestamp: new Date("2026-10-22T08:00:00").getTime(), durationMinutes: 45 },
    { timestamp: new Date("2026-10-22T08:30:00").getTime(), durationMinutes: 45 }, // Total 8am = 90m
    { timestamp: new Date("2026-10-22T14:00:00").getTime(), durationMinutes: 30 }
  ];

  const analysis = RhythmEngine.analyzeFocusRhythm(mockSessions);
  assert.strictEqual(analysis.totalAnalyzedMinutes, 120);
  assert.strictEqual(analysis.peakHour, 8);
  assert.strictEqual(analysis.peakHourMinutes, 90);
  assert.strictEqual(analysis.peakHourFormatted, "\u200E08:00");
  assert.strictEqual(analysis.peakPeriod.id, "morning");
  assert.strictEqual(analysis.hasEnoughData, true);
  console.log("✓ Test 3: Peak hour (8:00 AM) and Morning period discovery verified.");
}

// Test 4: Empty and insufficient data resilience
{
  const emptyAnalysis = RhythmEngine.analyzeFocusRhythm([]);
  assert.strictEqual(emptyAnalysis.totalAnalyzedMinutes, 0);
  assert.strictEqual(emptyAnalysis.peakHourMinutes, 0);
  assert.strictEqual(emptyAnalysis.hasEnoughData, false);
  assert.strictEqual(emptyAnalysis.hourlyBuckets.length, 24);
  console.log("✓ Test 4: Empty sessions baseline resilience verified.");
}

// Test 5: Corrupted date and zero duration immunity
{
  const corruptSessions = [
    null,
    { durationMinutes: 0 },
    { timestamp: "invalid_date", durationMinutes: 60 }
  ];
  const analysis = RhythmEngine.analyzeFocusRhythm(corruptSessions);
  assert.strictEqual(analysis.totalAnalyzedMinutes, 0);
  console.log("✓ Test 5: Malformed records immunity verified.");
}

console.log("--- All Mission #054 Tests PASSED (GREEN) ---");
