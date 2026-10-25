const assert = require('assert');
const Reader = require('../android/app/src/main/assets/web/js/zen_reader_mode_engine.js');

console.log("--- Running 🎯 Mission #085: Zen Reader Mode Engine Tests ---");

// Test 1: Typography configuration generation
{
  const cfg = Reader.createReaderConfig({ fontScale: 1.2, themeKey: "warm_sepia" });
  assert.strictEqual(cfg.active, true);
  assert.strictEqual(cfg.fontScale, 1.2);
  assert.strictEqual(cfg.baseFontSizePx, 22);
  assert.strictEqual(cfg.lineHeight, 1.7);
  assert.strictEqual(cfg.maxColumnWidthPx, 680);
  assert.strictEqual(cfg.themeKey, "warm_sepia");
  assert.strictEqual(cfg.themeTokens.bg, "#FAF4E8");
  console.log("✓ Test 1: Reader typography configuration & Sepia tokens verified.");
}

// Test 2: Reading time and word count estimation (Arabic)
{
  const wordsArray = new Array(360).fill("كلمة");
  const sampleArabic = wordsArray.join(" ");

  const metrics = Reader.estimateReadingMetrics(sampleArabic, true);
  assert.strictEqual(metrics.wordCount, 360);
  assert.strictEqual(metrics.estimatedMinutes, 2);
  assert.strictEqual(metrics.formattedEstimateAr, "\u200E2 دقيقة قراءة");
  console.log("✓ Test 2: Arabic word count & reading time estimation verified.");
}

// Test 3: HTML stripping in word counter (Accurate 8-word count)
{
  const htmlNote = "<h2>عنوان الملاحظة</h2><p>هذه فقرة دراسية تحتوي خمس كلمات</p>";
  const metrics = Reader.estimateReadingMetrics(htmlNote, true);
  assert.strictEqual(metrics.wordCount, 8, "Accurate count: 2 in title + 6 in body = 8 words");
  assert.strictEqual(metrics.estimatedMinutes, 1);
  console.log("✓ Test 3: Clean HTML stripping in word counter verified (8 words).");
}

// Test 4: Scroll progress percentage calculation with Western digits
{
  const progress = Reader.calculateScrollProgress(500, 2000, 1000);
  assert.strictEqual(progress.percent, 50);
  assert.strictEqual(progress.formattedPercent, "\u200E50%");
  assert.strictEqual(progress.isCompleted, false);

  const doneProgress = Reader.calculateScrollProgress(995, 2000, 1000);
  assert.strictEqual(doneProgress.isCompleted, true);
  console.log("✓ Test 4: Scroll progress percentage calculation verified.");
}

// Test 5: Empty input resilience
{
  const emptyMetrics = Reader.estimateReadingMetrics("", true);
  assert.strictEqual(emptyMetrics.wordCount, 0);
  assert.strictEqual(emptyMetrics.estimatedMinutes, 0);

  const zeroProgress = Reader.calculateScrollProgress(0, 0, 0);
  assert.strictEqual(zeroProgress.percent, 0);
  console.log("✓ Test 5: Empty input resilience verified.");
}

console.log("--- All Mission #085 Tests PASSED (GREEN) ---");
