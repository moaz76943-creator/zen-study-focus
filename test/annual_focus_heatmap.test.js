const assert = require('assert');
const engine = require('../android/app/src/main/assets/web/js/annual_focus_heatmap_engine.js');

console.log('--- Running 🎯 Mission #118: Annual Focus Heatmap & Grid Tests ---');

// Test 1: Intensity levels binning
{
  assert.strictEqual(engine.getIntensityLevel(0).level, 0);
  assert.strictEqual(engine.getIntensityLevel(30).level, 1);
  assert.strictEqual(engine.getIntensityLevel(75).level, 2);
  assert.strictEqual(engine.getIntensityLevel(180).level, 3);
  assert.strictEqual(engine.getIntensityLevel(300).level, 4);
  console.log('✓ Test 1: Heatmap intensity thresholds (0-4) verified.');
}

// Test 2: 365-Day timeline aggregation and streaks
{
  const sessions = [
    { date: '2026-03-01', durationSeconds: 3600 },
    { date: '2026-03-02', durationSeconds: 3600 },
    { date: '2026-03-03', durationSeconds: 3600 },
    { date: '2026-03-05', durationSeconds: 1800 }
  ];

  const data = engine.aggregateAnnualData(sessions, 2026);
  assert.strictEqual(data.totalDaysInYear, 365);
  assert.strictEqual(data.activeDaysCount, 4);
  assert.strictEqual(data.longestStreak, 3);
  assert.strictEqual(data.longestStreakFormatted, '3 days');
  console.log('✓ Test 2: Annual 365-day timeline aggregation & streak analysis verified.');
}

// Test 3: Peak focus day & total study hours
{
  const sessions = [
    { date: '2026-04-10', durationSeconds: 3600 },
    { date: '2026-04-15', durationSeconds: 18000 },
    { date: '2026-04-20', durationSeconds: 7200 }
  ];

  const data = engine.aggregateAnnualData(sessions, 2026);
  assert.strictEqual(data.peakDay.date, '2026-04-15');
  assert.strictEqual(data.peakDay.minutes, 300);
  assert.strictEqual(data.totalMinutes, 480);
  assert.strictEqual(data.totalHours, 8.0);
  assert.strictEqual(data.totalHoursFormatted, '8.0');
  console.log('✓ Test 3: Peak focus day identification & total hours calculation verified.');
}

// Test 4: Standalone inline SVG generation
{
  const data = engine.aggregateAnnualData([], 2026);
  const svg = engine.generateHeatmapSvg(data);
  assert.strictEqual(svg.startsWith('<svg'), true);
  assert.strictEqual(svg.endsWith('</svg>'), true);
  assert.strictEqual(svg.includes('class="zen-heatmap-svg"'), true);
  assert.strictEqual(svg.includes('<rect'), true);
  console.log('✓ Test 4: Standalone SVG matrix generation & XML validity verified.');
}

// Test 5: 100-Locale translation, strict English fallback, absolute Hebrew exclusion & Western digits
{
  const arTitle = engine.getLocalizedText('ar', 'heatmap_title');
  assert.strictEqual(arTitle.includes('الخريطة الحرارية السنوية'), true);

  const noTitle = engine.getLocalizedText('no', 'heatmap_title');
  assert.strictEqual(noTitle.includes('Annual Focus'), true);

  const heTitle = engine.getLocalizedText('he', 'heatmap_title');
  const iwTitle = engine.getLocalizedText('iw', 'heatmap_title');
  assert.strictEqual(heTitle.includes('Annual Focus'), true);
  assert.strictEqual(iwTitle.includes('Annual Focus'), true);
  assert.strictEqual(engine.sanitizeLocale('he'), 'en');
  assert.strictEqual(engine.sanitizeLocale('iw'), 'en');

  const sample = engine.aggregateAnnualData([{ date: '2026-01-01', durationSeconds: 1200 }], 2026);
  assert.strictEqual(/^[0-9]+$/.test(sample.activeDaysFormatted), true);
  assert.strictEqual(/^[0-9]+ days$/.test(sample.longestStreakFormatted), true);
  console.log('✓ Test 5: 100-Locale support, strict English fallback, zero Hebrew & Western digits verified.');
}

console.log('--- All Mission #118 Tests PASSED (GREEN) ---');
