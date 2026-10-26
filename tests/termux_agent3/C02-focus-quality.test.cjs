'use strict';

const test = require('node:test');
const assert = require('node:assert');

const engine = require('../../android/app/src/main/assets/web/js/focus_quality_rating_engine.js');

test('toWesternDigits maps non-finite values to Western digits instead of Infinity', () => {
  assert.strictEqual(engine.toWesternDigits(Infinity), '0');
  assert.strictEqual(engine.toWesternDigits(-Infinity), '0');
  assert.strictEqual(engine.toWesternDigits(NaN), '0');

  const scored = engine.calculateQualityScore(engine.QUALITY_LEVELS.DEEP, []);
  assert.strictEqual(scored.scoreFormatted, '95');
  assert.strictEqual(/^[0-9]+$/.test(scored.scoreFormatted), true);
});
