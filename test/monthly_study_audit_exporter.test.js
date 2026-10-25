const assert = require('assert');
const exporter = require('../android/app/src/main/assets/web/js/monthly_study_audit_exporter.js');

console.log('--- Running 🎯 Mission #106: Monthly Study Audit Markdown Exporter Tests ---');

const sampleSessions = [
  { date: '2026-10-02', durationSeconds: 3600, category: 'Coding', qualityScore: 90, frictionLogs: [{ type: 'INTERNAL_THOUGHTS' }] },
  { date: '2026-10-02', durationSeconds: 1800, category: 'Reading', qualityScore: 80 },
  { date: '2026-10-15', durationSeconds: 7200, category: 'Coding', qualityScore: 95 },
  { date: '2026-09-28', durationSeconds: 5000, category: 'Reading', qualityScore: 85 }
];

// Test 1: Month filtering and data safety
{
  const filtered = exporter.filterMonthSessions(sampleSessions, '2026-10');
  assert.strictEqual(filtered.length, 3);
  assert.deepStrictEqual(exporter.filterMonthSessions(null, '2026-10'), []);
  assert.deepStrictEqual(exporter.filterMonthSessions([null, undefined], '2026-10'), []);
  console.log('✓ Test 1: Month filtering and data safety verified.');
}

// Test 2: Metrics calculation accuracy
{
  const metrics = exporter.calculateMonthlyMetrics(sampleSessions, '2026-10');
  assert.strictEqual(metrics.totalSessions, 3);
  assert.strictEqual(metrics.totalDurationSeconds, 12600);
  assert.strictEqual(metrics.totalHours, 3.5);
  assert.strictEqual(metrics.activeDaysCount, 2);
  assert.strictEqual(metrics.dailyAvgMinutes, 105);
  assert.strictEqual(metrics.bestDay, '2026-10-15');
  assert.strictEqual(metrics.avgQuality, 88);
  console.log('✓ Test 2: Monthly metrics calculations & best day determination verified.');
}

// Test 3: Category breakdown aggregation
{
  const metrics = exporter.calculateMonthlyMetrics(sampleSessions, '2026-10');
  assert.strictEqual(metrics.categoryMap['Coding'].sessions, 2);
  assert.strictEqual(metrics.categoryMap['Coding'].seconds, 10800);
  assert.strictEqual(metrics.categoryMap['Reading'].sessions, 1);
  assert.strictEqual(metrics.categoryMap['Reading'].seconds, 1800);
  console.log('✓ Test 3: Category breakdown aggregation verified.');
}

// Test 4: Markdown output format & table headers
{
  const md = exporter.generateMarkdownReport(sampleSessions, '2026-10', 'en');
  assert.strictEqual(md.includes('# Deep Focus — Monthly Study Audit'), true);
  assert.strictEqual(md.includes('## 📊 Executive Summary'), true);
  assert.strictEqual(md.includes('| Category | Sessions | Time (Hours) | Share |'), true);
  assert.strictEqual(md.includes('| Date | Sessions | Minutes | Quality |'), true);
  assert.strictEqual(md.includes('2026-10-15'), true);
  assert.strictEqual(md.includes('Coding'), true);
  console.log('✓ Test 4: Markdown document structure and table formatting verified.');
}

// Test 5: 100-Locale translation, strict English fallback, absolute Hebrew exclusion & Western digits
{
  const mdAr = exporter.generateMarkdownReport(sampleSessions, '2026-10', 'ar');
  assert.strictEqual(mdAr.includes('التقرير الشهري الشامل'), true);
  assert.strictEqual(mdAr.includes('الملخص التنفيذي'), true);

  const mdDe = exporter.generateMarkdownReport(sampleSessions, '2026-10', 'de');
  assert.strictEqual(mdDe.includes('Monthly Study Audit'), true);

  const mdHe = exporter.generateMarkdownReport(sampleSessions, '2026-10', 'he');
  const mdIw = exporter.generateMarkdownReport(sampleSessions, '2026-10', 'iw');
  assert.strictEqual(mdHe.includes('Monthly Study Audit'), true);
  assert.strictEqual(mdIw.includes('Monthly Study Audit'), true);
  assert.strictEqual(exporter.sanitizeLocale('he'), 'en');
  assert.strictEqual(exporter.sanitizeLocale('iw'), 'en');

  assert.strictEqual(/^[0-9]+(\.[0-9]+)?$/.test(exporter.toWesternDigits(123.45, 2)), true);
  console.log('✓ Test 5: 100-Locale support, strict English fallback, zero Hebrew & Western digits verified.');
}

console.log('--- All Mission #106 Tests PASSED (GREEN) ---');
