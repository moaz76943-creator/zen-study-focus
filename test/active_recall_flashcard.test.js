const assert = require('assert');
const engine = require('../android/app/src/main/assets/web/js/active_recall_flashcard_engine.js');

console.log('--- Running 🎯 Mission #113: Active Recall Flashcard Engine Tests ---');

// Test 1: Card creation defaults
{
  const card = engine.createCard('deck_cs', 'What is O(1)?', 'Constant time complexity');
  assert.strictEqual(card.deckId, 'deck_cs');
  assert.strictEqual(card.prompt, 'What is O(1)?');
  assert.strictEqual(card.answer, 'Constant time complexity');
  assert.strictEqual(card.repetitions, 0);
  assert.strictEqual(card.intervalDays, 0);
  assert.strictEqual(card.easeFactor, 2.5);
  assert.strictEqual(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(card.nextReviewDate), true);
  console.log('✓ Test 1: Flashcard model creation & SM-2 baseline parameters verified.');
}

// Test 2: Spaced repetition progression (GOOD vs AGAIN)
{
  const baseTime = Date.parse('2026-10-23T10:00:00Z');
  let card = engine.createCard('deck_math', '2 + 2 = ?', '4');

  card = engine.reviewCard(card, engine.RATINGS.GOOD, baseTime);
  assert.strictEqual(card.repetitions, 1);
  assert.strictEqual(card.intervalDays, 1);
  assert.strictEqual(card.nextReviewDate, '2026-10-24');

  card = engine.reviewCard(card, engine.RATINGS.GOOD, Date.parse('2026-10-24T10:00:00Z'));
  assert.strictEqual(card.repetitions, 2);
  assert.strictEqual(card.intervalDays, 4);
  assert.strictEqual(card.nextReviewDate, '2026-10-28');

  card = engine.reviewCard(card, engine.RATINGS.AGAIN, Date.parse('2026-10-28T10:00:00Z'));
  assert.strictEqual(card.repetitions, 0);
  assert.strictEqual(card.intervalDays, 1);
  assert.strictEqual(card.nextReviewDate, '2026-10-29');
  console.log('✓ Test 2: Spaced repetition review progression and reset mechanics verified.');
}

// Test 3: Ease factor adjustment and boundary clamping
{
  let card = engine.createCard('deck_test', 'Q', 'A');
  for (let i = 0; i < 10; i++) {
    card = engine.reviewCard(card, engine.RATINGS.HARD);
  }
  assert.strictEqual(card.easeFactor, 1.3);

  for (let i = 0; i < 15; i++) {
    card = engine.reviewCard(card, engine.RATINGS.EASY);
  }
  assert.strictEqual(card.easeFactor, 2.5);
  console.log('✓ Test 3: Ease factor adjustment bounds (1.3 <= EF <= 2.5) verified.');
}

// Test 4: Due cards query and deck mastery statistics
{
  const cardDueToday = { id: 'c1', nextReviewDate: '2026-10-23', repetitions: 1, intervalDays: 1 };
  const cardDuePast = { id: 'c2', nextReviewDate: '2026-10-20', repetitions: 0, intervalDays: 0 };
  const cardFutureMastered = { id: 'c3', nextReviewDate: '2026-11-15', repetitions: 5, intervalDays: 20 };

  const cards = [cardDueToday, cardDuePast, cardFutureMastered];
  const due = engine.getDueCards(cards, '2026-10-23');
  assert.strictEqual(due.length, 2);

  const stats = engine.getDeckStatistics(cards, '2026-10-23');
  assert.strictEqual(stats.totalCards, 3);
  assert.strictEqual(stats.dueCards, 2);
  assert.strictEqual(stats.masteredCards, 1);
  assert.strictEqual(stats.masteryRate, 33);
  assert.strictEqual(stats.masteryFormatted, '33%');
  console.log('✓ Test 4: Due cards filtering and deck mastery metrics verified.');
}

// Test 5: 100-Locale translation, strict English fallback, absolute Hebrew exclusion & Western digits
{
  const arRating = engine.getLocalizedText('ar', 'rating_good');
  assert.strictEqual(arRating.includes('جيد'), true);

  const svRating = engine.getLocalizedText('sv', 'rating_good');
  assert.strictEqual(svRating.includes('Good (Optimal)'), true);

  const heRating = engine.getLocalizedText('he', 'rating_good');
  const iwRating = engine.getLocalizedText('iw', 'rating_good');
  assert.strictEqual(heRating.includes('Good (Optimal)'), true);
  assert.strictEqual(iwRating.includes('Good (Optimal)'), true);
  assert.strictEqual(engine.sanitizeLocale('he'), 'en');
  assert.strictEqual(engine.sanitizeLocale('iw'), 'en');

  const sampleDeck = [{ id: 'c_test', nextReviewDate: '2026-10-23', repetitions: 3, intervalDays: 10 }];
  assert.strictEqual(/^[0-9]+%$/.test(engine.getDeckStatistics(sampleDeck, '2026-10-23').masteryFormatted), true);
  console.log('✓ Test 5: 100-Locale support, strict English fallback, zero Hebrew & Western digits verified.');
}

console.log('--- All Mission #113 Tests PASSED (GREEN) ---');
