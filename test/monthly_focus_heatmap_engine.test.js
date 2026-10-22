const assert = require('assert');
const HeatmapEngine = require('../android/app/src/main/assets/web/js/monthly_focus_heatmap_engine.js');

console.log("--- Running 🎯 Mission #057: Monthly Focus Heatmap Tests ---");

// Test 1: Accurate days in month calculation & leap-year handling
{
  assert.strictEqual(HeatmapEngine.getDaysInMonth(2024, 2), 29, "Leap year Feb 2024 must have 29 days");
  assert.strictEqual(HeatmapEngine.getDaysInMonth(2026, 2), 28, "Standard Feb 2026 must have 28 days");
  assert.strictEqual(HeatmapEngine.getDaysInMonth(2026, 10), 31, "October must have 31 days");
  console.log("✓ Test 1: Days in month & leap-year boundary handling verified.");
}

// Test 2: 5-tier intensity levels categorization
{
  assert.strictEqual(HeatmapEngine.getIntensityLevel(0), 0);
  assert.strictEqual(HeatmapEngine.getIntensityLevel(15), 1);
  assert.strictEqual(HeatmapEngine.getIntensityLevel(45), 2);
  assert.strictEqual(HeatmapEngine.getIntensityLevel(90), 3);
  assert.strictEqual(HeatmapEngine.getIntensityLevel(150), 4);
  console.log("✓ Test 2: 5-tier intensity level categorization verified.");
}

// Test 3: Consistency metrics & consecutive streak tracking
{
  const mockSessions = [
    { date: "2026-10-01", durationMinutes: 45 },
    { date: "2026-10-02", durationMinutes: 60 },
    { date: "2026-10-03", durationMinutes: 30 },
    // 2026-10-04 missed
    { date: "2026-10-05", durationMinutes: 90 }
  ];

  const res = HeatmapEngine.generateMonthlyHeatmap(2026, 10, mockSessions);
  assert.strictEqual(res.totalDays, 31);
  assert.strictEqual(res.activeDaysCount, 4);
  assert.strictEqual(res.totalMinutes, 225);
  assert.strictEqual(res.longestConsecutiveDays, 3, "Streak broke on Oct 4, max streak must be 3");
  assert.strictEqual(res.consistencyPercentage, 13);
  console.log("✓ Test 3: Consistency metrics & longest streak calculation verified.");
}

// Test 4: Pure SVG Heatmap rendering
{
  const heatmapData = HeatmapEngine.generateMonthlyHeatmap(2026, 10, []);
  const svg = HeatmapEngine.renderSvgHeatmap(heatmapData);
  assert.ok(svg.startsWith('<svg'), "Must generate valid SVG");
  assert.ok(svg.includes('viewBox="0 0 320 160"'));
  assert.ok(svg.includes('\u200E2026-10'));
  assert.ok(!svg.includes("NaN"), "Must not contain NaN coordinates");
  console.log("✓ Test 4: Pure SVG Heatmap grid markup verified.");
}

// Test 5: Empty sessions resilience
{
  const empty = HeatmapEngine.generateMonthlyHeatmap(2026, 10, null);
  assert.strictEqual(empty.activeDaysCount, 0);
  assert.strictEqual(empty.totalMinutes, 0);
  assert.strictEqual(empty.longestConsecutiveDays, 0);
  console.log("✓ Test 5: Empty sessions resilience verified.");
}

console.log("--- All Mission #057 Tests PASSED (GREEN) ---");
