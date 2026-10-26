'use strict';

const test = require('node:test');
const assert = require('node:assert');

const engine = require('../../android/app/src/main/assets/web/js/exam_readiness_simulator_engine.js');

test('C13: zero sprint pace uses the minimum bound instead of a neutral pace', () => {
  const zeroPace = engine.calculateExamReadiness(100, 100, 0);
  const minimumPace = engine.calculateExamReadiness(100, 100, 0.1);
  const neutralPace = engine.calculateExamReadiness(100, 100, 1);

  assert.strictEqual(zeroPace.readinessScore, minimumPace.readinessScore);
  assert.notStrictEqual(zeroPace.readinessScore, neutralPace.readinessScore);
  assert.ok(zeroPace.readinessScore < 100);
  assert.strictEqual(zeroPace.tierKey, minimumPace.tierKey);

  assert.strictEqual(
    engine.calculateExamReadiness(100, 100, undefined).readinessScore,
    neutralPace.readinessScore
  );
});
