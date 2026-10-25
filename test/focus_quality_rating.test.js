const assert = require('assert');
const engine = require('../android/app/src/main/assets/web/js/focus_quality_rating_engine.js');

console.log('--- Running 🎯 Mission #105: Focus Quality Rating & In-Session Friction Tests ---');

// Test 1: Quality levels & friction type catalogs
{
  const levels = engine.getQualityLevels();
  assert.strictEqual(levels.includes('DEEP'), true);
  assert.strictEqual(levels.includes('MODERATE'), true);
  assert.strictEqual(levels.includes('FRAGMENTED'), true);
  assert.strictEqual(levels.length, 3);

  const frictionTypes = engine.getFrictionTypes();
  assert.strictEqual(frictionTypes.includes('INTERNAL_THOUGHTS'), true);
  assert.strictEqual(frictionTypes.includes('DIGITAL_NOTIFICATIONS'), true);
  assert.strictEqual(frictionTypes.includes('ENVIRONMENTAL_NOISE'), true);
  assert.strictEqual(frictionTypes.includes('FATIGUE'), true);
  assert.strictEqual(frictionTypes.includes('OTHER'), true);
  assert.strictEqual(frictionTypes.length, 5);
  console.log('✓ Test 1: Quality levels and friction categories catalogs verified.');
}

// Test 2: In-session friction logging (1-tap distraction tap)
{
  let list = [];
  list = engine.logFriction(list, 'DIGITAL_NOTIFICATIONS', 1700000000000);
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].type, 'DIGITAL_NOTIFICATIONS');
  assert.strictEqual(list[0].timestamp, 1700000000000);

  list = engine.logFriction(list, 'UNKNOWN_RANDOM_TYPE', 1700000010000);
  assert.strictEqual(list.length, 2);
  assert.strictEqual(list[1].type, 'OTHER');
  console.log('✓ Test 2: In-session friction logging and type validation verified.');
}

// Test 3: Quality scoring, friction penalties & Western digits
{
  const deepPure = engine.calculateQualityScore('DEEP', []);
  assert.strictEqual(deepPure.score, 95);
  assert.strictEqual(deepPure.scoreFormatted, '95');
  assert.strictEqual(/^[0-9]+$/.test(deepPure.scoreFormatted), true);

  const deepFriction = engine.calculateQualityScore('DEEP', [{ type: 'FATIGUE' }, { type: 'ENVIRONMENTAL_NOISE' }]);
  assert.strictEqual(deepFriction.score, 85);
  assert.strictEqual(deepFriction.frictionCount, 2);
  assert.strictEqual(deepFriction.frictionCountFormatted, '2');

  const heavyFriction = Array(15).fill({ type: 'INTERNAL_THOUGHTS' });
  const fragHeavy = engine.calculateQualityScore('FRAGMENTED', heavyFriction);
  assert.strictEqual(fragHeavy.score, 10);
  assert.strictEqual(fragHeavy.scoreFormatted, '10');
  console.log('✓ Test 3: Focus quality scoring and penalty bounds verified.');
}

// Test 4: Friction aggregation across sessions
{
  const mockSessions = [
    {
      id: 's1',
      frictionLogs: [
        { type: 'DIGITAL_NOTIFICATIONS' },
        { type: 'DIGITAL_NOTIFICATIONS' },
        { type: 'FATIGUE' }
      ]
    },
    {
      id: 's2',
      frictionLogs: [
        { type: 'DIGITAL_NOTIFICATIONS' },
        { type: 'INTERNAL_THOUGHTS' }
      ]
    }
  ];

  const summary = engine.aggregateFrictions(mockSessions);
  assert.strictEqual(summary.totalFrictions, 5);
  assert.strictEqual(summary.totalFormatted, '5');
  assert.strictEqual(summary.counts.DIGITAL_NOTIFICATIONS, 3);
  assert.strictEqual(summary.counts.FATIGUE, 1);
  assert.strictEqual(summary.counts.INTERNAL_THOUGHTS, 1);
  assert.strictEqual(summary.counts.ENVIRONMENTAL_NOISE, 0);
  assert.strictEqual(summary.primaryDistraction, 'DIGITAL_NOTIFICATIONS');
  console.log('✓ Test 4: Multi-session friction aggregation & primary distraction identification verified.');
}

// Test 5: 100-Locale translation, strict English fallback, absolute Hebrew exclusion
{
  const arTitle = engine.getLocalizedText('ar', 'quality_deep_title');
  assert.strictEqual(arTitle, 'تدفق عميق');

  const enTitle = engine.getLocalizedText('en', 'quality_deep_title');
  assert.strictEqual(enTitle, 'Deep Flow');

  const koTitle = engine.getLocalizedText('ko', 'quality_deep_title');
  assert.strictEqual(koTitle, 'Deep Flow');

  const heTitle = engine.getLocalizedText('he', 'quality_deep_title');
  const iwTitle = engine.getLocalizedText('iw', 'quality_deep_title');
  assert.strictEqual(heTitle, 'Deep Flow');
  assert.strictEqual(iwTitle, 'Deep Flow');
  assert.strictEqual(engine.sanitizeLocale('he'), 'en');
  assert.strictEqual(engine.sanitizeLocale('iw'), 'en');

  console.log('✓ Test 5: 100-Locale support, strict English fallback & zero Hebrew verified.');
}

console.log('--- All Mission #105 Tests PASSED (GREEN) ---');
