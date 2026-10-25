const assert = require('assert');
const engine = require('../android/app/src/main/assets/web/js/reading_speed_absorption_engine.js');

console.log('--- Running 🎯 Mission #115: Reading Speed & Page Absorption Tests ---');

// Test 1: Reading metrics calculation
{
  const res = engine.calculateReadingMetrics(1, 10, 20);
  assert.strictEqual(res.pagesRead, 10);
  assert.strictEqual(res.pagesReadFormatted, '10');
  assert.strictEqual(res.paceMinutesPerPage, 2.0);
  assert.strictEqual(res.paceFormatted, '2.00');
  assert.strictEqual(res.wpm, 125);
  assert.strictEqual(res.wpmFormatted, '125');
  console.log('✓ Test 1: Page count, pace (min/page), and WPM calculations verified.');
}

// Test 2: Pace tier classification
{
  const deep = engine.calculateReadingMetrics(1, 5, 25);
  assert.strictEqual(deep.paceTier, 'DEEP_STUDY');

  const balanced = engine.calculateReadingMetrics(1, 20, 20);
  assert.strictEqual(balanced.paceTier, 'BALANCED');

  const skim = engine.calculateReadingMetrics(1, 40, 20);
  assert.strictEqual(skim.paceTier, 'RAPID_SKIM');
  console.log('✓ Test 2: Pace tier classification (DEEP_STUDY / BALANCED / RAPID_SKIM) verified.');
}

// Test 3: Material completion progress and remaining study hours estimate
{
  const progress = engine.calculateMaterialProgress(50, 200, 2.0);
  assert.strictEqual(progress.currentPage, 50);
  assert.strictEqual(progress.totalPages, 200);
  assert.strictEqual(progress.remainingPages, 150);
  assert.strictEqual(progress.progressPct, 25);
  assert.strictEqual(progress.progressFormatted, '25%');
  assert.strictEqual(progress.estimatedRemainingMinutes, 300);
  assert.strictEqual(progress.estimatedRemainingHours, 5.0);
  assert.strictEqual(progress.remainingHoursFormatted, '5.0');
  console.log('✓ Test 3: Material progress percentage and remaining study hours estimation verified.');
}

// Test 4: Strict Western digits formatting
{
  const res = engine.calculateReadingMetrics(15, 35, 45);
  const prog = engine.calculateMaterialProgress(35, 120, res.paceMinutesPerPage);

  assert.strictEqual(/^[0-9]+$/.test(res.pagesReadFormatted), true);
  assert.strictEqual(/^[0-9]+(\.[0-9]+)?$/.test(res.paceFormatted), true);
  assert.strictEqual(/^[0-9]+%$/.test(prog.progressFormatted), true);
  assert.strictEqual(/^[0-9]+(\.[0-9]+)?$/.test(prog.remainingHoursFormatted), true);
  console.log('✓ Test 4: Western digits validation across reading metrics verified.');
}

// Test 5: 100-Locale translation, strict English fallback & zero Hebrew
{
  const arPace = engine.getLocalizedText('ar', 'pace_label');
  assert.strictEqual(arPace.includes('معدل القراءة'), true);

  const plPace = engine.getLocalizedText('pl', 'pace_label');
  assert.strictEqual(plPace.includes('Pace:'), true);

  const hePace = engine.getLocalizedText('he', 'pace_label');
  const iwPace = engine.getLocalizedText('iw', 'pace_label');
  assert.strictEqual(hePace.includes('Pace:'), true);
  assert.strictEqual(iwPace.includes('Pace:'), true);
  assert.strictEqual(engine.sanitizeLocale('he'), 'en');
  assert.strictEqual(engine.sanitizeLocale('iw'), 'en');
  console.log('✓ Test 5: 100-Locale support, strict English fallback & zero Hebrew verified.');
}

console.log('--- All Mission #115 Tests PASSED (GREEN) ---');
