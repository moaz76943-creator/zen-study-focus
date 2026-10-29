const assert = require('assert');
const engine = require('../android/app/src/main/assets/web/js/cognitive_habit_optimizer_engine.js');

console.log('--- Running 🎯 Mission #126: Cognitive Habit & Schedule Optimizer Tests ---');

// Test 1: Time window mapping
{
  assert.strictEqual(engine.resolveTimeWindow(6).id, 'EARLY_MORNING');
  assert.strictEqual(engine.resolveTimeWindow(11).id, 'MID_MORNING');
  assert.strictEqual(engine.resolveTimeWindow(15).id, 'AFTERNOON');
  assert.strictEqual(engine.resolveTimeWindow(19).id, 'EVENING');
  assert.strictEqual(engine.resolveTimeWindow(23).id, 'LATE_NIGHT');
  console.log('✓ Test 1: Hourly time-window segmentation verified.');
}

// Test 2: Peak window discovery
{
  const sessions = [
    { startTime: Date.parse('2026-10-23T06:00:00'), durationSeconds: 3600, qualityScore: 95 },
    { startTime: Date.parse('2026-10-23T07:30:00'), durationSeconds: 3600, qualityScore: 98 },
    { startTime: Date.parse('2026-10-23T20:00:00'), durationSeconds: 1200, qualityScore: 60 }
  ];

  const analysis = engine.analyzeHabitPatterns(sessions);
  assert.strictEqual(analysis.hasData, true);
  assert.strictEqual(analysis.peakWindow, 'EARLY_MORNING');
  console.log('✓ Test 2: Peak cognitive focus window algorithmic discovery verified.');
}

// Test 3: Habit regularity scoring
{
  const sessionsConsistent = [
    { startTime: Date.parse('2026-10-23T09:00:00'), durationSeconds: 2700 },
    { startTime: Date.parse('2026-10-24T09:30:00'), durationSeconds: 2700 },
    { startTime: Date.parse('2026-10-25T10:00:00'), durationSeconds: 2700 }
  ];

  const res = engine.analyzeHabitPatterns(sessionsConsistent);
  assert.strictEqual(res.regularityScore, 100);
  assert.strictEqual(res.regularityFormatted, '100%');
  console.log('✓ Test 3: Habit regularity index calculation verified.');
}

// Test 4: Duration recommendation clamping (25 to 60 minutes)
{
  const shortSessions = [{ durationSeconds: 600 }, { durationSeconds: 900 }];
  const resShort = engine.analyzeHabitPatterns(shortSessions);
  assert.strictEqual(resShort.recommendedDurationMinutes, 25);

  const longSessions = [{ durationSeconds: 7200 }, { durationSeconds: 7200 }];
  const resLong = engine.analyzeHabitPatterns(longSessions);
  assert.strictEqual(resLong.recommendedDurationMinutes, 60);
  console.log('✓ Test 4: Recommended session duration bounds (25-60 min) verified.');
}

// Test 5: 100-Locale translation, strict English fallback, absolute Hebrew exclusion & Western digits
{
  const arTitle = engine.getLocalizedText('ar', 'peak_window_title');
  assert.strictEqual(arTitle.includes('ذروة الاستيعاب الذهني'), true);

  const trTitle = engine.getLocalizedText('tr', 'peak_window_title');
  assert.strictEqual(trTitle.includes('Peak Focus Window'), true);

  const heTitle = engine.getLocalizedText('he', 'peak_window_title');
  const iwTitle = engine.getLocalizedText('iw', 'peak_window_title');
  assert.strictEqual(heTitle.includes('Peak Focus Window'), true);
  assert.strictEqual(iwTitle.includes('Peak Focus Window'), true);
  assert.strictEqual(engine.sanitizeLocale('he'), 'en');
  assert.strictEqual(engine.sanitizeLocale('iw'), 'en');

  assert.strictEqual(/^[0-9]+%$/.test(engine.analyzeHabitPatterns([]).regularityFormatted), true);
  assert.strictEqual(/^[0-9]+$/.test(engine.toWesternDigits(45)), true);
  console.log('✓ Test 5: 100-Locale support, strict English fallback, zero Hebrew & Western digits verified.');
}

console.log('--- All Mission #126 Tests PASSED (GREEN) ---');
