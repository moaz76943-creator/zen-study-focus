const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/exam_hall_simulator_engine.js');

console.log('--- Running 🎯 Mission #142: Strict Exam Hall Simulator Tests ---');

// Test 1: Exam Session Configuration & Unit Allocation
{
  const exam = Engine.configureExamSession(60, 30);
  assert.strictEqual(exam.totalDurationMinutes, 60);
  assert.strictEqual(exam.formattedDuration, '60m');
  assert.strictEqual(exam.totalSeconds, 3600);
  assert.strictEqual(exam.minutesPerUnit, 2.0);
  assert.strictEqual(exam.formattedAllocation, '2.0 min/unit');
  assert.strictEqual(exam.lockdownMode, true);
  assert.strictEqual(exam.nonPausableEnforced, true);

  console.log('✓ Test 1: Exam session configuration and pacing allocation verified.');
}

// Test 2: Stealth Haptic Milestones Trigger (50%, 75%, 10m left, 5m left)
{
  const totalSec = 3600;

  const h50 = Engine.getStealthHapticTrigger(1800, totalSec);
  assert.strictEqual(h50.triggered, true);
  assert.strictEqual(h50.key, 'haptic_halfway');
  assert.deepStrictEqual(h50.pattern, [400]);

  const h75 = Engine.getStealthHapticTrigger(2700, totalSec);
  assert.strictEqual(h75.triggered, true);
  assert.strictEqual(h75.key, 'haptic_three_quarters');

  const h10m = Engine.getStealthHapticTrigger(3000, totalSec);
  assert.strictEqual(h10m.triggered, true);
  assert.strictEqual(h10m.key, 'haptic_ten_left');

  const h5m = Engine.getStealthHapticTrigger(3300, totalSec);
  assert.strictEqual(h5m.triggered, true);
  assert.strictEqual(h5m.key, 'haptic_five_left');

  const hNormal = Engine.getStealthHapticTrigger(1000, totalSec);
  assert.strictEqual(hNormal.triggered, false);

  console.log('✓ Test 2: Stealth haptic trigger milestones verified.');
}

// Test 3: Comprehensive Exam Report & Zero Music Guarantee
{
  const report = Engine.generateExamReport({
    durationMinutes: 90,
    units: 45,
    elapsedSeconds: 2700,
    completedUnits: 25
  }, 'ar');

  assert.strictEqual(report.locale, 'ar');
  assert.strictEqual(report.zeroMedicalClaimsVerified, true);
  assert.strictEqual(report.acousticAtmosphere.zeroMusicGuaranteed, true);
  assert.ok(report.examSummary.plannedPace.includes('min/unit'));
  assert.ok(report.examSummary.remainingMinutes.includes('m'));

  console.log('✓ Test 3: Comprehensive Exam Report & Zero Music Guarantee verified.');
}

// Test 4: Boundary durations clamping (10m to 300m)
{
  const lowClamp = Engine.configureExamSession(2, 5);
  assert.strictEqual(lowClamp.totalDurationMinutes, 10);

  const highClamp = Engine.configureExamSession(500, 50);
  assert.strictEqual(highClamp.totalDurationMinutes, 300);

  console.log('✓ Test 4: Boundary durations clamping verified.');
}

// Test 5: 100-Locale support, strict English fallback, absolute Hebrew exclusion & Western digits
{
  assert.strictEqual(Engine.resolveLocale('he'), 'en');
  assert.strictEqual(Engine.resolveLocale('iw'), 'en');
  assert.strictEqual(Engine.resolveLocale('HE'), 'en');
  assert.strictEqual(Engine.resolveLocale('ru'), 'en');
  assert.strictEqual(Engine.resolveLocale('ar'), 'ar');

  const western = Engine.toWesternDigits('المدة ٦٠m بمعدل ٢.٠ min/unit، المتبقي ٣٠m');
  assert.strictEqual(western, 'المدة 60m بمعدل 2.0 min/unit، المتبقي 30m');
  assert.ok(/^[0-9]+$/.test(Engine.toWesternDigits('١٢٣٤٥٦٧٨٩٠')));

  console.log('✓ Test 5: 100-Locale, Hebrew exclusion & Western digits verified.');
}

console.log('--- All Mission #142 Tests PASSED (GREEN) ---');
