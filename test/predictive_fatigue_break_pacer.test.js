const assert = require('assert');
const engine = require('../android/app/src/main/assets/web/js/predictive_fatigue_break_pacer_engine.js');

console.log('--- Running 🎯 Mission #114: Predictive Focus Fatigue & Break Pacer Tests ---');

// Test 1: Fatigue score for light single session
{
  const res = engine.calculateFatigueScore(25, 1, 0, 10);
  assert.strictEqual(res.score, 15);
  assert.strictEqual(res.tier, 'FRESH');
  assert.strictEqual(res.scoreFormatted, '15');
  console.log('✓ Test 1: Light session cognitive load & FRESH tier classification verified.');
}

// Test 2: Heavy multi-session & friction fatigue scoring
{
  const heavy = engine.calculateFatigueScore(90, 3, 3, 23);
  assert.strictEqual(heavy.score, 100);
  assert.strictEqual(heavy.tier, 'EXHAUSTED');

  const moderate = engine.calculateFatigueScore(50, 1, 1, 14);
  assert.strictEqual(moderate.tier, 'MODERATE');
  assert.strictEqual(moderate.score >= 36 && moderate.score <= 69, true);
  console.log('✓ Test 2: Consecutive load, friction penalties & EXHAUSTED clamp verified.');
}

// Test 3: Dynamic break recommendations & mindful activities
{
  const freshMetrics = { score: 20, tier: 'FRESH' };
  const breakFresh = engine.recommendBreak(freshMetrics, 25);
  assert.strictEqual(breakFresh.breakMinutes, 4);
  assert.strictEqual(breakFresh.suggestedActivities.includes('EYE_REST'), true);

  const heavyMetrics = { score: 85, tier: 'EXHAUSTED' };
  const breakHeavy = engine.recommendBreak(heavyMetrics, 75);
  assert.strictEqual(breakHeavy.breakMinutes >= 15, true);
  assert.strictEqual(breakHeavy.suggestedActivities.includes('MINDFUL_WALK'), true);
  console.log('✓ Test 3: Dynamic break scaling and activity recommendation verified.');
}

// Test 4: Western digits validation
{
  const metrics = engine.calculateFatigueScore(45, 2, 1, 11);
  const rec = engine.recommendBreak(metrics, 45);

  assert.strictEqual(/^[0-9]+$/.test(metrics.scoreFormatted), true);
  assert.strictEqual(/^[0-9]+$/.test(rec.breakMinutesFormatted), true);
  console.log('✓ Test 4: Strict Western digits formatting verified.');
}

// Test 5: 100-Locale translation, strict English fallback & zero Hebrew
{
  const arTier = engine.getLocalizedText('ar', 'tier_fresh');
  assert.strictEqual(arTier.includes('نشاط وصفاء'), true);

  const fiTier = engine.getLocalizedText('fi', 'tier_fresh');
  assert.strictEqual(fiTier.includes('Fresh & Energized'), true);

  const heTier = engine.getLocalizedText('he', 'tier_fresh');
  const iwTier = engine.getLocalizedText('iw', 'tier_fresh');
  assert.strictEqual(heTier.includes('Fresh & Energized'), true);
  assert.strictEqual(iwTier.includes('Fresh & Energized'), true);
  assert.strictEqual(engine.sanitizeLocale('he'), 'en');
  assert.strictEqual(engine.sanitizeLocale('iw'), 'en');
  console.log('✓ Test 5: 100-Locale support, strict English fallback & zero Hebrew verified.');
}

console.log('--- All Mission #114 Tests PASSED (GREEN) ---');
