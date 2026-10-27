'use strict';

const assert = require('node:assert');
const test = require('node:test');
const Engine = require('../../android/app/src/main/assets/web/js/spaced_repetition_engine.js');

test('evaluateRecallFeedback tolerates an invalid Date review timestamp', () => {
  const invalidDate = new Date('not-a-real-date');
  assert.ok(Number.isNaN(invalidDate.getTime()), 'fixture must be an invalid Date');

  const item = {
    id: 'sr_invalid_date',
    title: 'مراجعة',
    category: 'دراسة',
    box: 1,
    reviewCount: 0,
    isMastered: false,
    nextReviewDate: '2026-10-22'
  };

  let result;
  assert.doesNotThrow(() => {
    result = Engine.evaluateRecallFeedback(item, 'easy', invalidDate);
  }, 'invalid review timestamps must not throw');

  assert.strictEqual(result.box, 2);
  assert.strictEqual(result.reviewCount, 1);
  assert.match(result.nextReviewDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.strictEqual(
    result.nextReviewDate,
    Engine.addDaysCivil(new Date(), Engine.INTERVAL_DAYS[2])
  );
  assert.doesNotThrow(() => new Date(result.lastReviewedAt).toISOString());
  assert.strictEqual(item.reviewCount, 0, 'original item must not be mutated');
});
