'use strict';

const test = require('node:test');
const assert = require('node:assert');

const engine = require('../../android/app/src/main/assets/web/js/active_recall_flashcard_engine.js');

test('invalid fractional grade falls back to GOOD instead of truncating to AGAIN', () => {
  const card = {
    id: 'card_fixture',
    deckId: 'default',
    prompt: 'Q',
    answer: 'A',
    repetitions: 4,
    intervalDays: 20,
    easeFactor: 2.5,
    nextReviewDate: '2026-10-26'
  };

  const reviewed = engine.reviewCard(card, 0.9, Date.parse('2026-10-26T10:00:00Z'));

  assert.strictEqual(reviewed.repetitions, 5);
  assert.strictEqual(reviewed.intervalDays, 50);
  assert.strictEqual(reviewed.easeFactor, 2.5);
});
