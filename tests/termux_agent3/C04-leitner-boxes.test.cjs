'use strict';

const test = require('node:test');
const assert = require('node:assert');

const engine = require('../../android/app/src/main/assets/web/js/leitner_box_flashcard_engine.js');

test('corrupt box indices fall back to box 1 instead of being counted as mastered', () => {
  const deck = [
    { id: 'fractional', box: 4.9, daysSinceReview: 0 },
    { id: 'suffixed', box: '5abc', daysSinceReview: 0 },
    { id: 'overflow', box: 9, daysSinceReview: 0 },
    { id: 'valid', box: 4, daysSinceReview: 0 }
  ];
  const snapshot = JSON.stringify(deck);

  const filtered = engine.filterDueCards(deck);

  assert.strictEqual(filtered.boxCounts[1], 3);
  assert.strictEqual(filtered.boxCounts[4], 1);
  assert.strictEqual(filtered.boxCounts[5], 0);
  assert.strictEqual(filtered.masteryPercentage, 25);
  assert.strictEqual(filtered.dueCount, 0);
  assert.strictEqual(JSON.stringify(deck), snapshot);

  const fractional = engine.processCardReviewResult(4.9, true);
  assert.strictEqual(fractional.previousBox, 1);
  assert.strictEqual(fractional.newBox, 2);

  const overflow = engine.processCardReviewResult(9, true);
  assert.strictEqual(overflow.previousBox, 1);
  assert.strictEqual(overflow.newBox, 2);
  assert.strictEqual(overflow.promoted, true);

  const validBoundary = engine.processCardReviewResult(4, true);
  assert.strictEqual(validBoundary.previousBox, 4);
  assert.strictEqual(validBoundary.newBox, 5);
  assert.strictEqual(validBoundary.promoted, true);

  const maxBoundary = engine.processCardReviewResult(5, true);
  assert.strictEqual(maxBoundary.newBox, 5);
  assert.strictEqual(maxBoundary.promoted, false);
  assert.strictEqual(maxBoundary.nextIntervalDays, 30);
});
