/**
 * DEEP FOCUS — Test Suite: Week-over-Week Study Comparison Engine (M102)
 * File: test/week_over_week_comparison.test.js
 */

const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/week_over_week_comparison_engine.js');

console.log('--- Running 🎯 Mission #102: Week-over-Week Study Comparison Tests ---');

// Test 1: Comparative Week Bounds Calculation (Timezone-Safe)
try {
  const bounds = Engine.getComparativeWeekBounds('2026-10-22');
  assert.strictEqual(bounds.currentWeek.startDate, '2026-10-19');
  assert.strictEqual(bounds.currentWeek.endDate, '2026-10-25');
  assert.strictEqual(bounds.previousWeek.startDate, '2026-10-12');
  assert.strictEqual(bounds.previousWeek.endDate, '2026-10-18');

  console.log('✓ Test 1: Timezone-safe comparative week bounds calculation verified.');
} catch (err) {
  console.error('✗ Test 1 Failed:', err.message);
  process.exit(1);
}

// Test 2: Multi-Week Session Aggregation & Subject Shifts
try {
  const mockSessions = [
    { date: '2026-10-13', duration_minutes: 60, tag: 'Calculus', interrupted: false },
    { date: '2026-10-15', duration_minutes: 60, tag: 'Physics', interrupted: false },
    { date: '2026-10-19', duration_minutes: 60, tag: 'Calculus', interrupted: false },
    { date: '2026-10-20', duration_minutes: 60, tag: 'Calculus', interrupted: false },
    { date: '2026-10-21', duration_minutes: 60, tag: 'Physics', interrupted: true }
  ];

  const res = Engine.compareWeeks(mockSessions, { referenceDate: '2026-10-22' });
  assert.strictEqual(res.currentWeek.totalMinutes, 180);
  assert.strictEqual(res.previousWeek.totalMinutes, 120);
  assert.strictEqual(res.deltaMinutes, 60);
  assert.strictEqual(res.deltaHours, 1.0);
  assert.strictEqual(res.currentWeek.sessionCount, 3);
  assert.strictEqual(res.previousWeek.sessionCount, 2);

  assert.strictEqual(res.subjectShifts.Calculus.deltaMinutes, 60);
  assert.strictEqual(res.subjectShifts.Physics.deltaMinutes, 0);

  console.log('✓ Test 2: Session aggregation, delta hours & subject shifts verified.');
} catch (err) {
  console.error('✗ Test 2 Failed:', err.message);
  process.exit(1);
}

// Test 3: Growth Percentage & Trend Classification
try {
  const mockSessionsGrowth = [
    { date: '2026-10-13', duration_minutes: 100 },
    { date: '2026-10-20', duration_minutes: 150 }
  ];
  const resGrowth = Engine.compareWeeks(mockSessionsGrowth, { referenceDate: '2026-10-22' });
  assert.strictEqual(resGrowth.percentageGrowth, 50);
  assert.strictEqual(resGrowth.trend, 'growth');

  const mockSessionsDip = [
    { date: '2026-10-13', duration_minutes: 100 },
    { date: '2026-10-20', duration_minutes: 80 }
  ];
  const resDip = Engine.compareWeeks(mockSessionsDip, { referenceDate: '2026-10-22' });
  assert.strictEqual(resDip.percentageGrowth, -20);
  assert.strictEqual(resDip.trend, 'dip');

  const mockSessionsFlat = [
    { date: '2026-10-13', duration_minutes: 100 },
    { date: '2026-10-20', duration_minutes: 102 }
  ];
  const resFlat = Engine.compareWeeks(mockSessionsFlat, { referenceDate: '2026-10-22' });
  assert.strictEqual(resFlat.trend, 'consistent');

  console.log('✓ Test 3: Percentage growth & trend categorization (growth, consistent, dip) verified.');
} catch (err) {
  console.error('✗ Test 3 Failed:', err.message);
  process.exit(1);
}

// Test 4: Procedural Pure SVG Comparison Card
try {
  const mockComparison = {
    currentWeek: { totalHours: 12.5, activeDays: 5, dailyAverageMinutes: 150 },
    previousWeek: { totalHours: 10.0, activeDays: 4, dailyAverageMinutes: 150 },
    percentageGrowth: 25,
    trend: 'growth'
  };

  const svg = Engine.renderWoWComparisonSVG(mockComparison, { width: 420, height: 270, locale: 'en' });
  assert(typeof svg === 'string', 'Render must return SVG string');
  assert(svg.startsWith('<svg') && svg.endsWith('</svg>'), 'Valid SVG markup');
  assert(svg.includes('+25%'), 'Must contain percentage growth +25%');
  assert(svg.includes('12.5h'), 'Must display current week hours');
  assert(!svg.includes('data:image/'), 'No raster bitmaps');
  assert(!svg.includes('<image'), 'No external image elements');

  console.log('✓ Test 4: Procedural royalty-free vector SVG comparison card verified.');
} catch (err) {
  console.error('✗ Test 4 Failed:', err.message);
  process.exit(1);
}

// Test 5: Multi-Language, Strict English Fallback & Western Digits
try {
  const mockComparison = {
    currentWeek: { totalHours: 14.0, activeDays: 5, dailyAverageMinutes: 168 },
    previousWeek: { totalHours: 11.0, activeDays: 4, dailyAverageMinutes: 165 },
    percentageGrowth: 27,
    trend: 'growth'
  };

  const svgAr = Engine.renderWoWComparisonSVG(mockComparison, { locale: 'ar' });
  assert(svgAr.includes('مقارنة الأداء الأسبوعي'), 'Must display Arabic title');
  assert(svgAr.includes('هذا الأسبوع'), 'Must display Arabic Current Week label');

  const svgEs = Engine.renderWoWComparisonSVG(mockComparison, { locale: 'es' });
  assert(svgEs.includes('PROGRESO SEMANA TRAS SEMANA'), 'Must display Spanish title');

  const svgFallback = Engine.renderWoWComparisonSVG(mockComparison, { locale: 'unsupported_test_lang' });
  assert(svgFallback.includes('WEEK-OVER-WEEK PROGRESS'), 'Must strictly fallback to English title');

  const easternDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  easternDigits.forEach(d => {
    assert(!svgAr.includes(d), `SVG must not contain Eastern digit ${d}`);
  });

  const svgHe = Engine.renderWoWComparisonSVG(mockComparison, { locale: 'he' });
  assert(svgHe.includes('WEEK-OVER-WEEK PROGRESS'), 'Hebrew must strictly fallback to English');
  assert(!svgHe.includes('עבריت'), 'Must exclude Hebrew');

  console.log('✓ Test 5: Multi-language labels, strict English fallback & Western digits verified.');
  console.log('--- All Mission #102 Tests PASSED (GREEN) ---');
} catch (err) {
  console.error('✗ Test 5 Failed:', err.message);
  process.exit(1);
}
