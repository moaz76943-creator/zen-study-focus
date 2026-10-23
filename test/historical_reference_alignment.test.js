const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/historical_reference_alignment_engine.js');

console.log('--- Running 🎯 Mission #135: Historical Reference Alignment Tests ---');

// Test 1: Citation parser for classical and historical formats
{
  const c1 = Engine.parseReferenceCitation('Vol. 2, Ch. 4, pp. 120-135');
  assert.strictEqual(c1.valid, true);
  assert.strictEqual(c1.volumeOrBook, '2');
  assert.strictEqual(c1.chapterOrSection, '4');
  assert.strictEqual(c1.startRef, '120');
  assert.strictEqual(c1.endRef, '135');
  assert.strictEqual(c1.isRange, true);

  const c2 = Engine.parseReferenceCitation('Book III, fol. 45a');
  assert.strictEqual(c2.valid, true);
  assert.strictEqual(c2.volumeOrBook, 'III');
  assert.strictEqual(c2.startRef, '45a');
  assert.strictEqual(c2.isRange, false);

  const empty = Engine.parseReferenceCitation('');
  assert.strictEqual(empty.valid, false);

  console.log('✓ Test 1: Citation parser verified.');
}

// Test 2: Study progress alignment and status calculation
{
  const align = Engine.alignStudyProgress(50, 25, 60, 120);
  assert.strictEqual(align.completionPercentage, 50.0);
  assert.strictEqual(align.formattedPercentage, '50.0%');
  assert.strictEqual(align.unitsPerHour, 25.0);
  assert.strictEqual(align.formattedVelocity, '25.0 units/hr');
  assert.strictEqual(align.alignmentStatus, 'status_in_sync');

  const ahead = Engine.alignStudyProgress(50, 40, 60, 120);
  assert.strictEqual(ahead.alignmentStatus, 'status_ahead');

  const slow = Engine.alignStudyProgress(50, 10, 60, 120);
  assert.strictEqual(slow.alignmentStatus, 'status_review');

  console.log('✓ Test 2: Study progress alignment verified.');
}

// Test 3: Passage density per focus cycle
{
  const density = Engine.calculateDensityMetrics(35, 3);
  assert.strictEqual(density.passagesPerCycle, 11.7);
  assert.strictEqual(density.formattedDensity, '11.7');

  const zeroCycles = Engine.calculateDensityMetrics(10, 0);
  assert.strictEqual(zeroCycles.totalFocusCycles, 1);

  console.log('✓ Test 3: Passage density per focus cycle verified.');
}

// Test 4: Comprehensive alignment summary & zero medical claims
{
  const summary = Engine.generateAlignmentSummary({
    citation: 'Vol. 1, Sec. 3, pp. 40-60',
    targetUnits: 20,
    completedUnits: 15,
    elapsedMinutes: 45,
    plannedDurationMinutes: 60,
    focusCycles: 2
  }, 'ar');

  assert.strictEqual(summary.locale, 'ar');
  assert.strictEqual(summary.zeroMedicalClaimsVerified, true);
  assert.strictEqual(summary.citation.isRange, true);
  assert.ok(summary.alignment.percentage.includes('%'));
  assert.ok(summary.alignment.velocity.includes('units/hr'));

  console.log('✓ Test 4: Comprehensive alignment summary verified.');
}

// Test 5: 100-Locale support, strict English fallback, absolute Hebrew exclusion & Western digits
{
  assert.strictEqual(Engine.resolveLocale('he'), 'en');
  assert.strictEqual(Engine.resolveLocale('iw'), 'en');
  assert.strictEqual(Engine.resolveLocale('HE'), 'en');
  assert.strictEqual(Engine.resolveLocale('de'), 'en');
  assert.strictEqual(Engine.resolveLocale('ar'), 'ar');

  const western = Engine.toWesternDigits('المجلد ٢، الصفحات ٤٥-٨٠');
  assert.strictEqual(western, 'المجلد 2، الصفحات 45-80');
  assert.ok(/^[0-9]+$/.test(Engine.toWesternDigits('١٢٣٤٥٦٧٨٩٠')));

  console.log('✓ Test 5: 100-Locale, Hebrew exclusion & Western digits verified.');
}

console.log('--- All Mission #135 Tests PASSED (GREEN) ---');
