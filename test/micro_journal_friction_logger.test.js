const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/micro_journal_friction_logger_engine.js');

console.log('--- Running 🎯 Mission #149: Micro-Journal & Friction Logger Tests ---');

// Test 1: Journal Entry Creation & Categorization
{
  const entry = Engine.createJournalEntry(
    'Derive General Relativity Metric',
    [
      { category: 'conceptual', text: 'Christoffel symbols index confusion' },
      { category: 'fatigue', text: 'Late night eye tiredness' }
    ],
    'smooth'
  );

  assert.strictEqual(entry.status, 'recorded');
  assert.strictEqual(entry.preIntention, 'Derive General Relativity Metric');
  assert.strictEqual(entry.clarityRating, 'smooth');
  assert.strictEqual(entry.frictionNotes.length, 2);
  assert.strictEqual(entry.frictionNotes[0].category, 'conceptual');
  assert.strictEqual(entry.zeroMusicCertified, true);
  assert.ok(entry.entryId.startsWith('jrn_'));

  console.log('✓ Test 1: Journal entry creation and categorization verified.');
}

// Test 2: Friction Distribution Calculation
{
  const entries = [
    {
      frictionNotes: [
        { category: 'conceptual' },
        { category: 'conceptual' },
        { category: 'noise' }
      ]
    },
    {
      frictionNotes: [
        { category: 'conceptual' },
        { category: 'fatigue' }
      ]
    }
  ];

  const analysis = Engine.analyzeFrictionDistribution(entries);
  assert.strictEqual(analysis.totalFrictionOccurrences, 5);
  assert.strictEqual(analysis.dominantFrictionCategory, 'conceptual');
  assert.strictEqual(analysis.distribution.conceptual.count, 3);
  assert.strictEqual(analysis.distribution.conceptual.percentage, 60.0);
  assert.strictEqual(analysis.distribution.conceptual.formattedPercentage, '60.0%');
  assert.strictEqual(analysis.distribution.noise.count, 1);
  assert.strictEqual(analysis.distribution.noise.percentage, 20.0);

  console.log('✓ Test 2: Friction distribution calculation verified.');
}

// Test 3: Comprehensive Audit Report Generation
{
  const singleEntry = Engine.createJournalEntry(
    'Review Linear Algebra',
    [{ category: 'noise', text: 'Construction sounds outside' }],
    'moderate'
  );

  const report = Engine.generateJournalAuditReport(singleEntry, null, 'ar');
  assert.strictEqual(report.locale, 'ar');
  assert.strictEqual(report.clarityState.rating, 'moderate');
  assert.strictEqual(report.frictionAudit.dominantCategory, 'noise');
  assert.ok(report.frictionAudit.dominantLabel.includes('ضوضاء'));
  assert.strictEqual(report.zeroMusicCertified, true);
  assert.strictEqual(report.zeroMedicalClaimsVerified, true);

  console.log('✓ Test 3: Comprehensive audit report generation verified.');
}

// Test 4: Default Values & Fallback on Empty Inputs
{
  const empty = Engine.createJournalEntry('', null, 'unknown_rating');
  assert.strictEqual(empty.preIntention, 'Complete focused study session');
  assert.strictEqual(empty.clarityRating, 'moderate');
  assert.strictEqual(empty.frictionNotes.length, 0);

  const emptyDist = Engine.analyzeFrictionDistribution([]);
  assert.strictEqual(emptyDist.totalFrictionOccurrences, 0);
  assert.strictEqual(emptyDist.dominantFrictionCategory, 'none');

  console.log('✓ Test 4: Default values & fallback on empty inputs verified.');
}

// Test 5: 100-Locale support, strict English fallback, absolute Hebrew exclusion & Western digits
{
  assert.strictEqual(Engine.resolveLocale('he'), 'en');
  assert.strictEqual(Engine.resolveLocale('iw'), 'en');
  assert.strictEqual(Engine.resolveLocale('HE'), 'en');
  assert.strictEqual(Engine.resolveLocale('bg'), 'en');
  assert.strictEqual(Engine.resolveLocale('ar'), 'ar');

  const western = Engine.toWesternDigits('نسبة الاحتكاك المفاهيمي ٦٠.٠% بعدد ٣ ملاحظات');
  assert.strictEqual(western, 'نسبة الاحتكاك المفاهيمي 60.0% بعدد 3 ملاحظات');
  assert.ok(/^[0-9]+$/.test(Engine.toWesternDigits('١٢٣٤٥٦٧٨٩٠')));

  console.log('✓ Test 5: 100-Locale, Hebrew exclusion & Western digits verified.');
}

console.log('--- All Mission #149 Tests PASSED (GREEN) ---');
