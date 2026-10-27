'use strict';

const test = require('node:test');
const assert = require('node:assert');

const engine = require('../../android/app/src/main/assets/web/js/active_recall_capsule_engine.js');

test('zero-second recall response clamps to the 1s floor instead of the 60s fallback', () => {
  const result = engine.evaluateFluency(['Single insight'], 0);

  assert.strictEqual(result.durationSeconds, 1);
  assert.strictEqual(result.formattedDuration, '1s');
  assert.strictEqual(result.fluencyTier, 'fluency_partial');
  assert.strictEqual(result.flagForReview, false);

  assert.strictEqual(engine.evaluateFluency(['Single insight'], undefined).durationSeconds, 60);
  assert.strictEqual(engine.evaluateFluency(['Single insight'], -5).durationSeconds, 1);
  assert.strictEqual(engine.evaluateFluency(['Single insight'], 150).durationSeconds, 60);
});
