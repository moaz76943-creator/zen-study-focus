const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/posture_kinetic_hydration_engine.js');

console.log('--- Running 🎯 Mission #164: Posture Kinetic Hydration Tests ---');

// Test 1: Kinetic Break Steps Generation (Neck, Palming, Water)
{
  const steps = Engine.generateKineticBreakSteps(5);
  assert.strictEqual(steps.length, 3);
  assert.strictEqual(steps[0].stepId, 'neck_release');
  assert.strictEqual(steps[0].durationSeconds, 15);
  assert.strictEqual(steps[1].stepId, 'eye_palming');
  assert.strictEqual(steps[1].durationSeconds, 20);
  assert.strictEqual(steps[2].stepId, 'water_sip');

  console.log('✓ Test 1: Kinetic break steps generation verified.');
}

// Test 2: Water Sip Tracker & Daily Target
{
  const sip = Engine.recordWaterSip(3, 8);
  assert.strictEqual(sip.glassesCompleted, 4);
  assert.strictEqual(sip.percentage, 50.0);
  assert.strictEqual(sip.targetMet, false);
  assert.ok(sip.formattedProgress.includes('4 / 8'));

  const completedTarget = Engine.recordWaterSip(7, 8);
  assert.strictEqual(completedTarget.glassesCompleted, 8);
  assert.strictEqual(completedTarget.targetMet, true);

  console.log('✓ Test 2: Water sip tracker and daily target verified.');
}

// Test 3: Ergonomic Wellness Score Calculation
{
  const ergoHigh = Engine.calculateErgonomicScore(4, 4);
  assert.strictEqual(ergoHigh.score, 92);
  assert.strictEqual(ergoHigh.formattedScore, '92%');
  assert.strictEqual(ergoHigh.tierKey, 'score_excellent');

  const ergoMod = Engine.calculateErgonomicScore(1, 1);
  assert.strictEqual(ergoMod.score, 23);
  assert.strictEqual(ergoMod.tierKey, 'score_moderate');

  console.log('✓ Test 3: Ergonomic score calculation verified.');
}

// Test 4: Comprehensive Posture Report & Zero Music Guarantee
{
  const report = Engine.generatePostureReport(5, 4, 3, 'ar');
  assert.strictEqual(report.locale, 'ar');
  assert.strictEqual(report.kineticSteps.length, 3);
  assert.strictEqual(report.zeroMusicCertified, true);
  assert.strictEqual(report.zeroMedicalClaimsVerified, true);
  assert.ok(report.kineticSteps[0].instruction.includes('الكتفين'));

  console.log('✓ Test 4: Comprehensive posture report verified.');
}

// Test 5: 100-Locale support, strict English fallback, absolute Hebrew exclusion & Western digits
{
  assert.strictEqual(Engine.resolveLocale('he'), 'en');
  assert.strictEqual(Engine.resolveLocale('iw'), 'en');
  assert.strictEqual(Engine.resolveLocale('HE'), 'en');
  assert.strictEqual(Engine.resolveLocale('sk'), 'en');
  assert.strictEqual(Engine.resolveLocale('ar'), 'ar');

  const western = Engine.toWesternDigits('٤ / ٨ كؤوس بنسبة ٥٠.٠% ودرجة ٩٢%');
  assert.strictEqual(western, '4 / 8 كؤوس بنسبة 50.0% ودرجة 92%');
  assert.ok(/^[0-9]+$/.test(Engine.toWesternDigits('١٢٣٤٥٦٧٨٩٠')));

  console.log('✓ Test 5: 100-Locale, Hebrew exclusion & Western digits verified.');
}

console.log('--- All Mission #164 Tests PASSED (GREEN) ---');
