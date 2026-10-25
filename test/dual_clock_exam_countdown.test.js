const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/dual_clock_exam_countdown_engine.js');

console.log('--- Running 🎯 Mission #166: Dual-Clock Exam Countdown Tests ---');

// Test 1: Time Formatter Verification (MM:SS in Western Digits)
{
  assert.strictEqual(Engine.formatTimeMinutesSeconds(3600), '60:00');
  assert.strictEqual(Engine.formatTimeMinutesSeconds(125), '02:05');
  assert.strictEqual(Engine.formatTimeMinutesSeconds(0), '00:00');

  console.log('✓ Test 1: Time formatter in Western digits verified.');
}

// Test 2: Dual Clock Pacing Calculation (Within Budget)
{
  // Total exam 5400s (90m), question budget 120s (2m), 45s elapsed
  const pacing = Engine.calculateDualClockPacing(5400, 120, 45);
  assert.strictEqual(pacing.formattedSessionClock, '90:00');
  assert.strictEqual(pacing.formattedUnitClock, '01:15'); // 120 - 45 = 75s = 01:15
  assert.strictEqual(pacing.isOvertime, false);
  assert.strictEqual(pacing.statusKey, 'status_on_time');
  assert.deepStrictEqual(pacing.hapticCue, []);

  console.log('✓ Test 2: Within-budget pacing calculation verified.');
}

// Test 3: Overtime Detection & Tactile Warning Cue
{
  // Question budget 120s, 130s elapsed -> overtime
  const over = Engine.calculateDualClockPacing(3600, 120, 130);
  assert.strictEqual(over.isOvertime, true);
  assert.strictEqual(over.formattedUnitClock, '00:00');
  assert.strictEqual(over.statusKey, 'status_overtime');
  assert.deepStrictEqual(over.hapticCue, [40, 40]);

  console.log('✓ Test 3: Overtime detection and tactile warning verified.');
}

// Test 4: Comprehensive HUD Report Generation & Zero Music Guarantee
{
  const report = Engine.generateDualClockHUDReport(2700, 180, 60, 'ar');
  assert.strictEqual(report.locale, 'ar');
  assert.strictEqual(report.clocks.totalExamClock, '45:00');
  assert.strictEqual(report.clocks.currentQuestionClock, '02:00');
  assert.strictEqual(report.zeroMusicCertified, true);
  assert.strictEqual(report.zeroMedicalClaimsVerified, true);
  assert.ok(report.clocks.totalExamLabel.includes('الكلي'));

  console.log('✓ Test 4: Comprehensive HUD report verified.');
}

// Test 5: 100-Locale support, strict English fallback, absolute Hebrew exclusion & Western digits
{
  assert.strictEqual(Engine.resolveLocale('he'), 'en');
  assert.strictEqual(Engine.resolveLocale('iw'), 'en');
  assert.strictEqual(Engine.resolveLocale('HE'), 'en');
  assert.strictEqual(Engine.resolveLocale('ja'), 'en');
  assert.strictEqual(Engine.resolveLocale('ar'), 'ar');

  const western = Engine.toWesternDigits('الوقت ٤٥:٠٠ والمسألة ٠٢:٠٠');
  assert.strictEqual(western, 'الوقت 45:00 والمسألة 02:00');
  assert.ok(/^[0-9]+$/.test(Engine.toWesternDigits('١٢٣٤٥٦٧٨٩٠')));

  console.log('✓ Test 5: 100-Locale, Hebrew exclusion & Western digits verified.');
}

console.log('--- All Mission #166 Tests PASSED (GREEN) ---');
