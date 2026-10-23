const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/amoled_power_governor_engine.js');

console.log('--- Running 🎯 Mission #168: AMOLED Power Governor Tests ---');

// Test 1: Critical Battery Governor (< 15%) - Pure Pitch Black
{
  const crit = Engine.resolveBatteryGovernor(10, false);
  assert.strictEqual(crit.tier, 'critical');
  assert.strictEqual(crit.backgroundColor, '#000000');
  assert.strictEqual(crit.disableAnimations, true);
  assert.strictEqual(crit.throttleDrawCalls, true);
  assert.strictEqual(crit.estimatedSavingsPct, 85);

  console.log('✓ Test 1: Critical battery true-black AMOLED governor verified.');
}

// Test 2: Low Battery Governor (15-30%)
{
  const low = Engine.resolveBatteryGovernor(20, false);
  assert.strictEqual(low.tier, 'low');
  assert.strictEqual(low.disableAnimations, true);
  assert.strictEqual(low.estimatedSavingsPct, 45);

  console.log('✓ Test 2: Low battery conservative power mode verified.');
}

// Test 3: Nominal State (> 30% or Charging)
{
  const nom = Engine.resolveBatteryGovernor(75, false);
  assert.strictEqual(nom.tier, 'nominal');
  assert.strictEqual(nom.disableAnimations, false);

  const chargingCrit = Engine.resolveBatteryGovernor(10, true);
  assert.strictEqual(chargingCrit.tier, 'nominal');

  console.log('✓ Test 3: Nominal and charging states verified.');
}

// Test 4: Comprehensive Governor Report & Zero Music Guarantee
{
  const report = Engine.generateGovernorReport(12, false, 'ar');
  assert.strictEqual(report.locale, 'ar');
  assert.strictEqual(report.displayGovernor.pureBlackAmoled, true);
  assert.strictEqual(report.zeroMusicCertified, true);
  assert.strictEqual(report.zeroMedicalClaimsVerified, true);
  assert.strictEqual(report.displayGovernor.estimatedSavings, '85%');
  assert.ok(report.battery.stateLabel.includes('AMOLED'));

  console.log('✓ Test 4: Comprehensive governor report verified.');
}

// Test 5: 100-Locale support, strict English fallback, absolute Hebrew exclusion & Western digits
{
  assert.strictEqual(Engine.resolveLocale('he'), 'en');
  assert.strictEqual(Engine.resolveLocale('iw'), 'en');
  assert.strictEqual(Engine.resolveLocale('HE'), 'en');
  assert.strictEqual(Engine.resolveLocale('ru'), 'en');
  assert.strictEqual(Engine.resolveLocale('ar'), 'ar');

  const western = Engine.toWesternDigits('مستوى البطارية ١٠% وتوفير ٨٥%');
  assert.strictEqual(western, 'مستوى البطارية 10% وتوفير 85%');
  assert.ok(/^[0-9]+$/.test(Engine.toWesternDigits('١٢٣٤٥٦٧٨٩٠')));

  console.log('✓ Test 5: 100-Locale, Hebrew exclusion & Western digits verified.');
}

console.log('--- All Mission #168 Tests PASSED (GREEN) ---');
