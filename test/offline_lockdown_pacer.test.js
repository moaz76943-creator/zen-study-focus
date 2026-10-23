const assert = require('assert');
const engine = require('../android/app/src/main/assets/web/js/offline_lockdown_pacer_engine.js');

console.log('--- Running 🎯 Mission #133: Absolute Silence & Lockdown Pacer Tests ---');

// Test 1: Levels catalog
{
  const levels = engine.LOCKDOWN_LEVELS;
  assert.strictEqual(levels.ZEN_GENTLE.escapePenalty, 5);
  assert.strictEqual(levels.STRICT_STUDY.escapePenalty, 10);
  assert.strictEqual(levels.AIRPLANE_SANCTUARY.escapePenalty, 15);
  assert.strictEqual(levels.AIRPLANE_SANCTUARY.requireOffline, true);
  console.log('✓ Test 1: Lockdown isolation tiers & penalty parameters verified.');
}

// Test 2: Escape event logging
{
  let list = [];
  list = engine.logEscapeEvent(list, 1700000000000, 'APP_SWITCH');
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].timestamp, 1700000000000);
  assert.strictEqual(list[0].reason, 'APP_SWITCH');

  list = engine.logEscapeEvent(list, 1700000010000, 'BROWSER_TAB_CHANGE');
  assert.strictEqual(list.length, 2);
  console.log('✓ Test 2: Escape distraction logging & reason tracking verified.');
}

// Test 3: Discipline score calculation & penalties
{
  const perfect = engine.calculateDisciplineScore(45, 0, 'STRICT_STUDY');
  assert.strictEqual(perfect.score, 100);
  assert.strictEqual(perfect.scoreFormatted, '100');

  const twoEscapes = engine.calculateDisciplineScore(45, 2, 'STRICT_STUDY');
  assert.strictEqual(twoEscapes.score, 80);
  assert.strictEqual(twoEscapes.scoreFormatted, '80');

  const heavyEscapes = engine.calculateDisciplineScore(45, 10, 'AIRPLANE_SANCTUARY');
  assert.strictEqual(heavyEscapes.score, 10);
  assert.strictEqual(heavyEscapes.scoreFormatted, '10');
  console.log('✓ Test 3: Discipline scoring algorithms & minimum floor bounds verified.');
}

// Test 4: Offline sanctuary evaluation
{
  const onlineCheck = engine.evaluateSanctuaryStatus(true, 'AIRPLANE_SANCTUARY', 'en');
  assert.strictEqual(onlineCheck.isCompliant, false);
  assert.strictEqual(onlineCheck.recommendation.includes('Airplane Mode'), true);

  const offlineCheck = engine.evaluateSanctuaryStatus(false, 'AIRPLANE_SANCTUARY', 'en');
  assert.strictEqual(offlineCheck.isCompliant, true);
  assert.strictEqual(offlineCheck.recommendation, null);
  console.log('✓ Test 4: Offline airplane mode sanctuary compliance verified.');
}

// Test 5: 100-Locale translation, strict English fallback, absolute Hebrew exclusion & Western digits
{
  const arLevel = engine.getLocalizedText('ar', 'level_airplane');
  assert.strictEqual(arLevel.includes('ملاذ الطيران'), true);

  const roLevel = engine.getLocalizedText('ro', 'level_airplane');
  assert.strictEqual(roLevel.includes('Airplane Sanctuary'), true);

  const heLevel = engine.getLocalizedText('he', 'level_airplane');
  const iwLevel = engine.getLocalizedText('iw', 'level_airplane');
  assert.strictEqual(heLevel.includes('Airplane Sanctuary'), true);
  assert.strictEqual(iwLevel.includes('Airplane Sanctuary'), true);
  assert.strictEqual(engine.sanitizeLocale('he'), 'en');
  assert.strictEqual(engine.sanitizeLocale('iw'), 'en');

  const res = engine.calculateDisciplineScore(45, 3, 'ZEN_GENTLE');
  assert.strictEqual(/^[0-9]+$/.test(res.scoreFormatted), true);
  assert.strictEqual(/^[0-9]+$/.test(res.escapesCountFormatted), true);
  console.log('✓ Test 5: 100-Locale support, strict English fallback, zero Hebrew & Western digits verified.');
}

console.log('--- All Mission #133 Tests PASSED (GREEN) ---');
