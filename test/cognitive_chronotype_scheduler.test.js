const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/cognitive_chronotype_scheduler_engine.js');

console.log('--- Running 🎯 Mission #153: Cognitive Chronotype Scheduler Tests ---');

// Test 1: Energy Band Mapping Across Chronotypes (Lark, Bear, Owl)
{
  const larkMorning = Engine.resolveEnergyBand(7, 'lark');
  assert.strictEqual(larkMorning.band, 'peak');
  assert.strictEqual(larkMorning.recommendedTaskType, 'analytical');

  const bearMidday = Engine.resolveEnergyBand(10, 'bear');
  assert.strictEqual(bearMidday.band, 'peak');

  const owlEvening = Engine.resolveEnergyBand(20, 'owl');
  assert.strictEqual(owlEvening.band, 'peak');
  assert.strictEqual(owlEvening.recommendedTaskType, 'analytical');

  const larkNight = Engine.resolveEnergyBand(23, 'lark');
  assert.strictEqual(larkNight.band, 'rest');

  console.log('✓ Test 1: Energy band mapping across chronotypes verified.');
}

// Test 2: Circadian Alignment Efficiency Scoring
{
  const sessions = [
    { startHour: 6, taskType: 'analytical' },
    { startHour: 8, taskType: 'analytical' },
    { startHour: 16, taskType: 'recall' }
  ];

  const scoreLark = Engine.calculateCircadianAlignment(sessions, 'lark');
  assert.strictEqual(scoreLark.scorePercentage, 100.0);
  assert.strictEqual(scoreLark.formattedScore, '100.0%');
  assert.strictEqual(scoreLark.totalEvaluated, 3);

  console.log('✓ Test 2: Circadian alignment efficiency scoring verified.');
}

// Test 3: Comprehensive Schedule Report Generation
{
  const report = Engine.generateChronotypeScheduleReport(
    9,
    'bear',
    [{ startHour: 10, taskType: 'analytical' }],
    'ar'
  );

  assert.strictEqual(report.locale, 'ar');
  assert.strictEqual(report.chronotype.type, 'bear');
  assert.strictEqual(report.currentWindow.bandName, 'peak');
  assert.strictEqual(report.zeroMusicCertified, true);
  assert.strictEqual(report.zeroMedicalClaimsVerified, true);
  assert.ok(report.chronotype.label.includes('المتوازن'));

  console.log('✓ Test 3: Comprehensive schedule report generation verified.');
}

// Test 4: Default Values & Fallbacks
{
  const def = Engine.resolveEnergyBand(null, null);
  assert.strictEqual(def.band, 'rest');

  const emptyAlign = Engine.calculateCircadianAlignment([], 'bear');
  assert.strictEqual(emptyAlign.scorePercentage, 100.0);
  assert.strictEqual(emptyAlign.totalEvaluated, 0);

  console.log('✓ Test 4: Default values & fallbacks verified.');
}

// Test 5: 100-Locale support, strict English fallback, absolute Hebrew exclusion & Western digits
{
  assert.strictEqual(Engine.resolveLocale('he'), 'en');
  assert.strictEqual(Engine.resolveLocale('iw'), 'en');
  assert.strictEqual(Engine.resolveLocale('HE'), 'en');
  assert.strictEqual(Engine.resolveLocale('ro'), 'en');
  assert.strictEqual(Engine.resolveLocale('ar'), 'ar');

  const western = Engine.toWesternDigits('الساعة ٠٩:٠٠ بمحاذاة ١٠٠.٠%');
  assert.strictEqual(western, 'الساعة 09:00 بمحاذاة 100.0%');
  assert.ok(/^[0-9]+$/.test(Engine.toWesternDigits('١٢٣٤٥٦٧٨٩٠')));

  console.log('✓ Test 5: 100-Locale, Hebrew exclusion & Western digits verified.');
}

console.log('--- All Mission #153 Tests PASSED (GREEN) ---');
