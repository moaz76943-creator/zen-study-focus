const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/low_power_charting_engine.js');

console.log("--- Running 🎯 Mission #040: Low-Power Charting Tests ---");

// Test 1: Generate valid SVG Bar Chart markup with zero external tags
{
  const mockData = [
    { label: "الأحد", value: 45 },
    { label: "الاثنين", value: 90 },
    { label: "الثلاثاء", value: 60 }
  ];

  const svg = Engine.renderBarChart(mockData, { isRtl: true });
  assert.ok(svg.startsWith('<svg'), "Must generate standard SVG root element");
  assert.ok(svg.includes('viewBox="0 0 320 160"'), "Default responsive viewBox must be set");
  assert.ok(svg.includes('dir="rtl"'), "Must respect RTL direction");
  assert.ok(svg.includes('الأحد'), "Must embed Arabic label safely");
  assert.ok(svg.includes('\u200E90'), "Must enforce Western digits with LTR isolation");
  console.log("✓ Test 1: Valid SVG Bar Chart markup & RTL/Arabic invariant verified.");
}

// Test 2: Safe handling of empty & zero datasets (No NaN or Division by Zero)
{
  const emptySvg = Engine.renderBarChart([], { isRtl: true });
  assert.ok(emptySvg.includes("zen-chart-empty"));
  assert.ok(!emptySvg.includes("NaN"), "Empty SVG must not contain NaN");

  const zeroData = [{ label: "A", value: 0 }, { label: "B", value: 0 }];
  const zeroSvg = Engine.renderBarChart(zeroData);
  assert.ok(!zeroSvg.includes("NaN"), "Zero-valued datasets must not produce NaN coordinates");
  console.log("✓ Test 2: Safe zero-division and empty dataset immunity verified.");
}

// Test 3: Sparkline polyline generation
{
  const sparkline = Engine.renderSparkline([10, 25, 15, 40, 50]);
  assert.ok(sparkline.startsWith('<svg'));
  assert.ok(sparkline.includes('<polyline'));
  assert.ok(sparkline.includes('points="'), "Must generate polyline points");
  assert.ok(!sparkline.includes("NaN"));

  const singlePoint = Engine.renderSparkline([10]);
  assert.ok(singlePoint.includes("zen-sparkline-empty"), "Single point sparkline must handle safely");
  console.log("✓ Test 3: Minimalist sparkline polyline generation verified.");
}

// Test 4: XML escaping defense (XSS Immunity)
{
  const maliciousData = [{ label: '<script>alert(1)</script>', value: 20 }];
  const safeSvg = Engine.renderBarChart(maliciousData);
  assert.ok(!safeSvg.includes('<script>'), "Tags must be escaped");
  assert.ok(safeSvg.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  console.log("✓ Test 4: XML escaping & SVG XSS immunity verified.");
}

console.log("--- All Mission #040 Low-Power Charting Tests PASSED (GREEN) ---");
