'use strict';

const test = require('node:test');
const assert = require('node:assert');

const Engine = require('../../android/app/src/main/assets/web/js/cognitive_chronotype_scheduler_engine.js');

test('startHour 0 (midnight) is a valid sample, not a missing hour', () => {
  const result = Engine.calculateCircadianAlignment(
    [{ startHour: 0, taskType: 'sleep' }],
    'lark'
  );

  assert.strictEqual(result.totalEvaluated, 1);
  assert.strictEqual(result.scorePercentage, 100.0);
  assert.strictEqual(result.formattedScore, '100.0%');
});
