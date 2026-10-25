const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/academic_journal_pdf_exporter_engine.js');

console.log('--- Running 🎯 Mission #169: Academic Journal PDF Exporter Tests ---');

// Test 1: Duration Formatting in Western Digits
{
  assert.strictEqual(Engine.formatDurationMinutes(125), '2h 5m');
  assert.strictEqual(Engine.formatDurationMinutes(45), '45m');
  assert.strictEqual(Engine.formatDurationMinutes(0), '0m');

  console.log('✓ Test 1: Duration formatting in Western digits verified.');
}

// Test 2: Markdown Study Journal Aggregation
{
  const logs = [
    { date: '2026-10-23', durationMinutes: 50, subject: 'Quantum Mechanics', topicAnchor: 'Schrodinger Eq', fluency: 'Fluid' },
    { date: '2026-10-23', durationMinutes: 25, subject: 'Organic Chemistry', topicAnchor: 'Carbonyl Group', fluency: 'Partial' }
  ];

  const res = Engine.generateMarkdownJournal(logs, 'Alice Turing', 'ar');
  assert.strictEqual(res.totalSessions, 2);
  assert.strictEqual(res.totalMinutes, 75);
  assert.strictEqual(res.formattedTotalDuration, '1h 15m');
  assert.strictEqual(res.zeroMusicCertified, true);
  assert.ok(res.markdownContent.includes('Quantum Mechanics'));
  assert.ok(res.markdownContent.includes('1h 15m'));

  console.log('✓ Test 2: Markdown journal aggregation verified.');
}

// Test 3: Printable HTML Generation with RTL/LTR Support
{
  const mdRes = Engine.generateMarkdownJournal([], 'Bob', 'ar');
  const htmlAr = Engine.generatePrintableHtml(mdRes, 'ar');
  assert.strictEqual(htmlAr.isRtl, true);
  assert.ok(htmlAr.htmlContent.includes('dir="rtl"'));
  assert.ok(htmlAr.htmlContent.includes('@media print'));

  const htmlEn = Engine.generatePrintableHtml(mdRes, 'en');
  assert.strictEqual(htmlEn.isRtl, false);
  assert.ok(htmlEn.htmlContent.includes('dir="ltr"'));

  console.log('✓ Test 3: Printable HTML with RTL/LTR print media CSS verified.');
}

// Test 4: Default Values & Fallbacks
{
  const emptyRes = Engine.generateMarkdownJournal([], null, 'en');
  assert.strictEqual(emptyRes.totalSessions, 0);
  assert.strictEqual(emptyRes.totalMinutes, 0);
  assert.strictEqual(emptyRes.formattedTotalDuration, '0m');

  console.log('✓ Test 4: Default values & fallbacks verified.');
}

// Test 5: 100-Locale support, strict English fallback, absolute Hebrew exclusion & Western digits
{
  assert.strictEqual(Engine.resolveLocale('he'), 'en');
  assert.strictEqual(Engine.resolveLocale('iw'), 'en');
  assert.strictEqual(Engine.resolveLocale('HE'), 'en');
  assert.strictEqual(Engine.resolveLocale('ro'), 'en');
  assert.strictEqual(Engine.resolveLocale('ar'), 'ar');

  const western = Engine.toWesternDigits('إجمالي الساعات ١h ١٥m لعدد ٢ جلسة');
  assert.strictEqual(western, 'إجمالي الساعات 1h 15m لعدد 2 جلسة');
  assert.ok(/^[0-9]+$/.test(Engine.toWesternDigits('١٢٣٤٥٦٧٨٩٠')));

  console.log('✓ Test 5: 100-Locale, Hebrew exclusion & Western digits verified.');
}

console.log('--- All Mission #169 Tests PASSED (GREEN) ---');
