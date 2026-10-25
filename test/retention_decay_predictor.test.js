const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/retention_decay_predictor_engine.js');

console.log('--- Running 🎯 Mission #155: Retention Decay Predictor Tests ---');

// Test 1: Immediate Retention Calculation (Day 0)
{
  const fresh = Engine.predictMemoryDecay(0, 1);
  assert.strictEqual(fresh.retentionPercentage, 100.0);
  assert.strictEqual(fresh.formattedRetention, '100.0%');
  assert.strictEqual(fresh.tierKey, 'tier_fresh');

  console.log('✓ Test 1: Immediate retention calculation verified.');
}

// Test 2: Ebbinghaus Decay & Desirable Difficulty Window (Decaying Tier)
{
  const decaying = Engine.predictMemoryDecay(3, 2);
  assert.ok(decaying.retentionPercentage >= 50.0 && decaying.retentionPercentage <= 85.0);
  assert.strictEqual(decaying.tierKey, 'tier_decaying');
  assert.ok(decaying.nextIntervalDays >= 1);

  console.log('✓ Test 2: Optimal retrieval window detection verified.');
}

// Test 3: Critical Decay Tier (Long Gap)
{
  const critical = Engine.predictMemoryDecay(30, 1);
  assert.ok(critical.retentionPercentage < 60.0);
  assert.strictEqual(critical.tierKey, 'tier_critical');

  console.log('✓ Test 3: Critical decay tier verified.');
}

// Test 4: Comprehensive Retention Card & Zero Music Guarantee
{
  const card = Engine.generateRetentionCard('Biophysics Thermodynamics', 2, 3, 'ar');
  assert.strictEqual(card.locale, 'ar');
  assert.strictEqual(card.topic, 'Biophysics Thermodynamics');
  assert.strictEqual(card.zeroMusicCertified, true);
  assert.strictEqual(card.zeroMedicalClaimsVerified, true);
  assert.ok(card.metrics.retentionScore.includes('%'));
  assert.ok(card.metrics.nextInterval.includes('days'));

  console.log('✓ Test 4: Comprehensive retention card verified.');
}

// Test 5: 100-Locale support, strict English fallback, absolute Hebrew exclusion & Western digits
{
  assert.strictEqual(Engine.resolveLocale('he'), 'en');
  assert.strictEqual(Engine.resolveLocale('iw'), 'en');
  assert.strictEqual(Engine.resolveLocale('HE'), 'en');
  assert.strictEqual(Engine.resolveLocale('cs'), 'en');
  assert.strictEqual(Engine.resolveLocale('ar'), 'ar');

  const western = Engine.toWesternDigits('احتمالية التذكر ٨٥.٥% والمراجعة خلال ٥ days');
  assert.strictEqual(western, 'احتمالية التذكر 85.5% والمراجعة خلال 5 days');
  assert.ok(/^[0-9]+$/.test(Engine.toWesternDigits('١٢٣٤٥٦٧٨٩٠')));

  console.log('✓ Test 5: 100-Locale, Hebrew exclusion & Western digits verified.');
}

console.log('--- All Mission #155 Tests PASSED (GREEN) ---');
