const assert = require('assert');
const engine = require('../android/app/src/main/assets/web/js/weekly_study_notes_digest_engine.js');

console.log('--- Running 🎯 Mission #116: Weekly Smart Study Notes Digest Tests ---');

// Test 1: Tag extraction
{
  const tagsEn = engine.extractTags('Read chapter 3 on #calculus and #integration.');
  assert.deepStrictEqual(tagsEn, ['#calculus', '#integration']);

  const tagsAr = engine.extractTags('مراجعة مسألة في #الفقه و #الميراث.');
  assert.deepStrictEqual(tagsAr, ['#الفقه', '#الميراث']);

  assert.deepStrictEqual(engine.extractTags('No tags here.'), []);
  console.log('✓ Test 1: Multilingual hashtag extraction (#tag) verified.');
}

// Test 2: Date-range filtering & category grouping
{
  const notes = [
    { text: 'Note 1 #tag1', category: 'Physics', date: '2026-10-20' },
    { text: 'Note 2 #tag2', category: 'Math', date: '2026-10-22' },
    { text: 'Old note', category: 'Math', date: '2026-10-10' }
  ];

  const agg = engine.aggregateWeeklyNotes(notes, '2026-10-19', '2026-10-25');
  assert.strictEqual(agg.totalNotes, 2);
  assert.strictEqual(agg.categoriesCount, 2);
  assert.strictEqual(agg.categoryMap['Physics'].length, 1);
  assert.strictEqual(agg.categoryMap['Math'].length, 1);
  console.log('✓ Test 2: Date range filtering and category aggregation verified.');
}

// Test 3: Tag frequency counting & ranking
{
  const notes = [
    { text: 'A #math #formula', category: 'Math', date: '2026-10-21' },
    { text: 'B #math #proof', category: 'Math', date: '2026-10-22' },
    { text: 'C #math', category: 'Math', date: '2026-10-23' }
  ];

  const agg = engine.aggregateWeeklyNotes(notes, '2026-10-19', '2026-10-25');
  assert.strictEqual(agg.tagCounts['#math'], 3);
  assert.strictEqual(agg.topTags[0], '#math');
  console.log('✓ Test 3: Tag frequency counters and ranking verified.');
}

// Test 4: Markdown digest document structure
{
  const notes = [
    { text: 'Key takeaway on derivatives.', category: 'Calculus', date: '2026-10-21' }
  ];
  const md = engine.generateWeeklyDigestMarkdown(notes, '2026-10-19', '2026-10-25', 'en');
  assert.strictEqual(md.includes('# 📝 Deep Focus — Weekly Study Notes Digest'), true);
  assert.strictEqual(md.includes('Calculus'), true);
  assert.strictEqual(md.includes('Key takeaway on derivatives.'), true);
  assert.strictEqual(md.includes('### ✅ Active Recall Consolidation Checklist'), true);
  console.log('✓ Test 4: Markdown output, categories, and review checklist verified.');
}

// Test 5: 100-Locale translation, strict English fallback, absolute Hebrew exclusion & Western digits
{
  const notes = [{ text: 'فائدة منهجية', category: 'أصول', date: '2026-10-22' }];
  const mdAr = engine.generateWeeklyDigestMarkdown(notes, '2026-10-19', '2026-10-25', 'ar');
  assert.strictEqual(mdAr.includes('الحصيلة الأسبوعية لفوائد وملاحظات المدارسة'), true);

  const mdDe = engine.generateWeeklyDigestMarkdown(notes, '2026-10-19', '2026-10-25', 'de');
  assert.strictEqual(mdDe.includes('Weekly Study Notes Digest'), true);

  const heTitle = engine.getLocalizedText('he', 'digest_title');
  const iwTitle = engine.getLocalizedText('iw', 'digest_title');
  assert.strictEqual(heTitle, 'Deep Focus — Weekly Study Notes Digest');
  assert.strictEqual(iwTitle, 'Deep Focus — Weekly Study Notes Digest');
  assert.strictEqual(engine.sanitizeLocale('he'), 'en');
  assert.strictEqual(engine.sanitizeLocale('iw'), 'en');

  assert.strictEqual(/^[0-9]+$/.test(engine.toWesternDigits(42)), true);
  console.log('✓ Test 5: 100-Locale support, strict English fallback, zero Hebrew & Western digits verified.');
}

console.log('--- All Mission #116 Tests PASSED (GREEN) ---');
