const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/ergonomic_blink_relaxation_engine.js');

console.log('--- Running 🎯 Mission #148: Ergonomic Eye Relaxation Pacer Tests ---');

// Test 1: 20-Minute Interval Trigger Logic
{
  const notYet = Engine.shouldTriggerBlinkBreak(1140, 0);
  assert.strictEqual(notYet.triggered, false);

  const trigger = Engine.shouldTriggerBlinkBreak(1200, 0);
  assert.strictEqual(trigger.triggered, true);
  assert.strictEqual(trigger.restDurationSeconds, 20);
  assert.deepStrictEqual(trigger.hapticPattern, [80, 100, 80]);

  const alreadyTriggered = Engine.shouldTriggerBlinkBreak(1500, 1200);
  assert.strictEqual(alreadyTriggered.triggered, false);

  const secondTrigger = Engine.shouldTriggerBlinkBreak(2400, 1200);
  assert.strictEqual(secondTrigger.triggered, true);

  console.log('✓ Test 1: 20-minute interval trigger logic verified.');
}

// Test 2: Ergonomic Visual Rest Compliance Calculation
{
  const optimal = Engine.calculateErgonomicCompliance(4, 4);
  assert.strictEqual(optimal.compliancePercentage, 100.0);
  assert.strictEqual(optimal.formattedCompliance, '100.0%');
  assert.strictEqual(optimal.tierKey, 'score_optimal');

  const moderate = Engine.calculateErgonomicCompliance(3, 2);
  assert.strictEqual(moderate.compliancePercentage, 66.7);
  assert.strictEqual(moderate.tierKey, 'score_moderate');

  const strained = Engine.calculateErgonomicCompliance(4, 1);
  assert.strictEqual(strained.compliancePercentage, 25.0);
  assert.strictEqual(strained.tierKey, 'score_strained');

  const zero = Engine.calculateErgonomicCompliance(0, 0);
  assert.strictEqual(zero.compliancePercentage, 100.0);

  console.log('✓ Test 2: Ergonomic visual compliance calculation verified.');
}

// Test 3: Comprehensive Eye Comfort Report & Zero Music Guarantee
{
  const report = Engine.generateEyeComfortReport(3600, 3, 3, 'ar');
  assert.strictEqual(report.locale, 'ar');
  assert.strictEqual(report.metrics.complianceScore, '100.0%');
  assert.strictEqual(report.zeroMusicCertified, true);
  assert.strictEqual(report.zeroMedicalClaimsVerified, true);
  assert.strictEqual(report.visualAnimationPacer.color, '#81C784');
  assert.ok(report.instruction.includes('6 أمتار'));

  console.log('✓ Test 3: Comprehensive eye comfort report verified.');
}

// Test 4: Default Values & Fallbacks
{
  const emptyReport = Engine.generateEyeComfortReport(0, 0, 0, 'en');
  assert.strictEqual(emptyReport.metrics.elapsedStudyMinutes, '0m');
  assert.strictEqual(emptyReport.metrics.complianceScore, '100.0%');

  console.log('✓ Test 4: Default values & fallbacks verified.');
}

// Test 5: 100-Locale support, strict English fallback, absolute Hebrew exclusion & Western digits
{
  assert.strictEqual(Engine.resolveLocale('he'), 'en');
  assert.strictEqual(Engine.resolveLocale('iw'), 'en');
  assert.strictEqual(Engine.resolveLocale('HE'), 'en');
  assert.strictEqual(Engine.resolveLocale('no'), 'en');
  assert.strictEqual(Engine.resolveLocale('ar'), 'ar');

  const western = Engine.toWesternDigits('المدة ٦٠m بنسبة ١٠٠.٠% وعدد الاستراحات ٣');
  assert.strictEqual(western, 'المدة 60m بنسبة 100.0% وعدد الاستراحات 3');
  assert.ok(/^[0-9]+$/.test(Engine.toWesternDigits('١٢٣٤٥٦٧٨٩٠')));

  console.log('✓ Test 5: 100-Locale, Hebrew exclusion & Western digits verified.');
}

console.log('--- All Mission #148 Tests PASSED (GREEN) ---');
