const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/micro_sprint_momentum_engine.js');

console.log('--- Running 🎯 Mission #156: Anti-Procrastination Micro-Sprint Tests ---');

// Test 1: Micro-Sprint Initialization (5-Minute Protocol)
{
  const sprint = Engine.initializeMicroSprint('Derive Wave Equation');
  assert.strictEqual(sprint.task, 'Derive Wave Equation');
  assert.strictEqual(sprint.durationSeconds, 300);
  assert.strictEqual(sprint.formattedDuration, '5m');
  assert.strictEqual(sprint.autoExtendOfferAtSeconds, 300);
  assert.strictEqual(sprint.zeroMusicCertified, true);
  assert.deepStrictEqual(sprint.hapticStartPattern, [60, 40, 60]);

  console.log('✓ Test 1: Micro-Sprint initialization verified.');
}

// Test 2: Sprint Progress & 5-Minute Flow Threshold Trigger
{
  const midway = Engine.evaluateSprintProgress(150);
  assert.strictEqual(midway.thresholdReached, false);
  assert.strictEqual(midway.remainingSeconds, 150);
  assert.strictEqual(midway.formattedProgress, '50.0%');

  const threshold = Engine.evaluateSprintProgress(300);
  assert.strictEqual(threshold.thresholdReached, true);
  assert.strictEqual(threshold.statusKey, 'sprint_threshold_reached');
  assert.strictEqual(threshold.suggestedExtensionMinutes, 20);
  assert.deepStrictEqual(threshold.hapticPattern, [100, 50, 100]);

  console.log('✓ Test 2: Sprint progress and 5-minute threshold trigger verified.');
}

// Test 3: Momentum Conversion Rate Calculation
{
  const rate = Engine.calculateMomentumConversionRate(10, 8);
  assert.strictEqual(rate.conversionPercentage, 80.0);
  assert.strictEqual(rate.formattedConversion, '80.0%');
  assert.strictEqual(rate.totalSprints, 10);
  assert.strictEqual(rate.convertedSessions, 8);

  const zero = Engine.calculateMomentumConversionRate(0, 0);
  assert.strictEqual(zero.conversionPercentage, 100.0);

  console.log('✓ Test 3: Momentum conversion rate calculation verified.');
}

// Test 4: Comprehensive Sprint Report & Zero Music Guarantee
{
  const sprint = Engine.initializeMicroSprint('Linear Algebra Homework');
  const report = Engine.generateMicroSprintReport(sprint, 300, true, 'ar');

  assert.strictEqual(report.locale, 'ar');
  assert.strictEqual(report.progress.thresholdReached, true);
  assert.strictEqual(report.progress.isConvertedToDeepFlow, true);
  assert.strictEqual(report.zeroMusicCertified, true);
  assert.strictEqual(report.zeroMedicalClaimsVerified, true);
  assert.ok(report.statusLabel.includes('تدفق'));

  console.log('✓ Test 4: Comprehensive sprint report verified.');
}

// Test 5: 100-Locale support, strict English fallback, absolute Hebrew exclusion & Western digits
{
  assert.strictEqual(Engine.resolveLocale('he'), 'en');
  assert.strictEqual(Engine.resolveLocale('iw'), 'en');
  assert.strictEqual(Engine.resolveLocale('HE'), 'en');
  assert.strictEqual(Engine.resolveLocale('fi'), 'en');
  assert.strictEqual(Engine.resolveLocale('ar'), 'ar');

  const western = Engine.toWesternDigits('المدة ٥m بنسبة تحويل ٨٠.٠% و ٣٠٠s');
  assert.strictEqual(western, 'المدة 5m بنسبة تحويل 80.0% و 300s');
  assert.ok(/^[0-9]+$/.test(Engine.toWesternDigits('١٢٣٤٥٦٧٨٩٠')));

  console.log('✓ Test 5: 100-Locale, Hebrew exclusion & Western digits verified.');
}

console.log('--- All Mission #156 Tests PASSED (GREEN) ---');
