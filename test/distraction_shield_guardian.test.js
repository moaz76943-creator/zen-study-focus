const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/distraction_shield_guardian_engine.js');

console.log('--- Running 🎯 Mission #147: Distraction Shield Guardian Tests ---');

// Test 1: Shield Tiers Resolution (Level 1, Level 2, Level 3)
{
  const t1 = Engine.resolveShieldTier(1);
  assert.strictEqual(t1.tier, 1);
  assert.strictEqual(t1.pauseSeconds, 5);
  assert.strictEqual(t1.requiresTyping, false);
  assert.deepStrictEqual(t1.hapticPattern, [100]);

  const t2 = Engine.resolveShieldTier(2);
  assert.strictEqual(t2.tier, 2);
  assert.strictEqual(t2.requiresTyping, true);

  const t3 = Engine.resolveShieldTier(3);
  assert.strictEqual(t3.tier, 3);
  assert.strictEqual(t3.isSafePark, true);
  assert.strictEqual(t3.maxHoldMinutes, 10);

  console.log('✓ Test 1: Shield tiers resolution verified.');
}

// Test 2: Impulse Resistance Calculation & Tiering
{
  const high = Engine.calculateImpulseResistance(8, 2);
  assert.strictEqual(high.ratioPercentage, 80.0);
  assert.strictEqual(high.formattedRatio, '80.0%');
  assert.strictEqual(high.tierKey, 'resistance_high');

  const balanced = Engine.calculateImpulseResistance(3, 3);
  assert.strictEqual(balanced.ratioPercentage, 50.0);
  assert.strictEqual(balanced.tierKey, 'resistance_balanced');

  const fragile = Engine.calculateImpulseResistance(1, 4);
  assert.strictEqual(fragile.ratioPercentage, 20.0);
  assert.strictEqual(fragile.tierKey, 'resistance_fragile');

  const zero = Engine.calculateImpulseResistance(0, 0);
  assert.strictEqual(zero.ratioPercentage, 100.0);

  console.log('✓ Test 2: Impulse resistance calculation and tiering verified.');
}

// Test 3: Comprehensive Shield Status Report Generation
{
  const report = Engine.generateShieldStatusReport(
    'Deriving Field Equations',
    2,
    4,
    1,
    'ar'
  );

  assert.strictEqual(report.locale, 'ar');
  assert.strictEqual(report.taskAnchor, 'Deriving Field Equations');
  assert.strictEqual(report.currentShield.tier, 2);
  assert.strictEqual(report.currentShield.requiresConfirmationWord, 'تركيز');
  assert.strictEqual(report.impulseMastery.score, '80.0%');
  assert.strictEqual(report.zeroMusicCertified, true);
  assert.strictEqual(report.zeroMedicalClaimsVerified, true);

  console.log('✓ Test 3: Comprehensive shield report verified.');
}

// Test 4: Default Values & Fallbacks
{
  const defTier = Engine.resolveShieldTier(null);
  assert.strictEqual(defTier.tier, 1);

  const defReport = Engine.generateShieldStatusReport(null, 1, 0, 0, 'en');
  assert.strictEqual(defReport.taskAnchor, 'Primary Focus Objective');

  console.log('✓ Test 4: Default values & fallbacks verified.');
}

// Test 5: 100-Locale support, strict English fallback, absolute Hebrew exclusion & Western digits
{
  assert.strictEqual(Engine.resolveLocale('he'), 'en');
  assert.strictEqual(Engine.resolveLocale('iw'), 'en');
  assert.strictEqual(Engine.resolveLocale('HE'), 'en');
  assert.strictEqual(Engine.resolveLocale('nl'), 'en');
  assert.strictEqual(Engine.resolveLocale('ar'), 'ar');

  const western = Engine.toWesternDigits('مقاومة بنسبة ٨٠.٠% وعدد مرات المقاومة ٤');
  assert.strictEqual(western, 'مقاومة بنسبة 80.0% وعدد مرات المقاومة 4');
  assert.ok(/^[0-9]+$/.test(Engine.toWesternDigits('١٢٣٤٥٦٧٨٩٠')));

  console.log('✓ Test 5: 100-Locale, Hebrew exclusion & Western digits verified.');
}

console.log('--- All Mission #147 Tests PASSED (GREEN) ---');
