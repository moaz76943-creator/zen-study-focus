const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/leitner_box_flashcard_engine.js');

console.log('--- Running 🎯 Mission #163: Leitner Box Flashcard Tests ---');

// Test 1: Leitner Progression (Promotion on Correct)
{
  const r1 = Engine.processCardReviewResult(1, true);
  assert.strictEqual(r1.newBox, 2);
  assert.strictEqual(r1.nextIntervalDays, 3);
  assert.strictEqual(r1.promoted, true);
  assert.strictEqual(r1.demoted, false);

  const r4 = Engine.processCardReviewResult(4, true);
  assert.strictEqual(r4.newBox, 5);
  assert.strictEqual(r4.nextIntervalDays, 30);

  const r5 = Engine.processCardReviewResult(5, true);
  assert.strictEqual(r5.newBox, 5);

  console.log('✓ Test 1: Leitner promotion progression verified.');
}

// Test 2: Leitner Demotion on Incorrect (Drop to Box 1)
{
  const failed = Engine.processCardReviewResult(4, false);
  assert.strictEqual(failed.newBox, 1);
  assert.strictEqual(failed.nextIntervalDays, 1);
  assert.strictEqual(failed.demoted, true);
  assert.strictEqual(failed.promoted, false);

  console.log('✓ Test 2: Immediate demotion on incorrect answer verified.');
}

// Test 3: Due Cards Filtering & Mastery Scoring
{
  const sampleDeck = [
    { id: 'c1', question: 'Speed of Light', box: 1, daysSinceReview: 2 },
    { id: 'c2', question: 'Planck Constant', box: 2, daysSinceReview: 1 },
    { id: 'c3', question: 'Gravitational Constant', box: 4, daysSinceReview: 15 },
    { id: 'c4', question: 'Electron Volt', box: 5, daysSinceReview: 5 }
  ];

  const filtered = Engine.filterDueCards(sampleDeck);
  assert.strictEqual(filtered.totalCards, 4);
  assert.strictEqual(filtered.dueCount, 2);
  assert.strictEqual(filtered.dueQueue[0].id, 'c1');
  assert.strictEqual(filtered.dueQueue[1].id, 'c3');
  assert.strictEqual(filtered.masteryPercentage, 50.0);
  assert.strictEqual(filtered.formattedMastery, '50.0%');

  console.log('✓ Test 3: Due cards filtering and deck mastery scoring verified.');
}

// Test 4: Comprehensive Deck Report & Zero Music Guarantee
{
  const deck = [
    { box: 4, daysSinceReview: 20 },
    { box: 5, daysSinceReview: 40 }
  ];

  const report = Engine.generateLeitnerDeckReport(deck, 'ar');
  assert.strictEqual(report.locale, 'ar');
  assert.strictEqual(report.overview.masteryScore, '100.0%');
  assert.strictEqual(report.zeroMusicCertified, true);
  assert.strictEqual(report.zeroMedicalClaimsVerified, true);
  assert.ok(report.statusLabel.includes('استيعاب'));

  console.log('✓ Test 4: Comprehensive deck report verified.');
}

// Test 5: 100-Locale support, strict English fallback, absolute Hebrew exclusion & Western digits
{
  assert.strictEqual(Engine.resolveLocale('he'), 'en');
  assert.strictEqual(Engine.resolveLocale('iw'), 'en');
  assert.strictEqual(Engine.resolveLocale('HE'), 'en');
  assert.strictEqual(Engine.resolveLocale('hu'), 'en');
  assert.strictEqual(Engine.resolveLocale('ar'), 'ar');

  const western = Engine.toWesternDigits('إتقان ٥٠.٠% وبطاقات مستحقة ٢');
  assert.strictEqual(western, 'إتقان 50.0% وبطاقات مستحقة 2');
  assert.ok(/^[0-9]+$/.test(Engine.toWesternDigits('١٢٣٤٥٦٧٨٩٠')));

  console.log('✓ Test 5: 100-Locale, Hebrew exclusion & Western digits verified.');
}

console.log('--- All Mission #163 Tests PASSED (GREEN) ---');
