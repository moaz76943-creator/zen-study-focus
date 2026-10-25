const assert = require('assert');
const CardEngine = require('../android/app/src/main/assets/web/js/zen_shareable_card_engine.js');

console.log("--- Running 🎯 Mission #079: Zen Shareable Card Tests ---");

// Test 1: Generates valid 1080x1080 SVG with required viewBox
{
  const svg = CardEngine.generateAccomplishmentCardSvg({ durationMinutes: 45, taskTitle: "فيزياء" });
  assert.ok(svg.startsWith('<svg'), "Must generate valid SVG");
  assert.ok(svg.includes('viewBox="0 0 1080 1080"'), "Must be 1080x1080 high-res format");
  assert.ok(svg.includes('DEEP FOCUS'));
  assert.ok(svg.includes('\u200E45'), "Must contain Western digits with LTR isolation");
  console.log("✓ Test 1: High-res 1080x1080 SVG markup & branding verified.");
}

// Test 2: Dual theme palettes (oled_dark and warm_sepia)
{
  const darkSvg = CardEngine.generateAccomplishmentCardSvg({}, { themeKey: "oled_dark" });
  assert.ok(darkSvg.includes('#0A0D0C'), "Dark theme must use deep black");

  const sepiaSvg = CardEngine.generateAccomplishmentCardSvg({}, { themeKey: "warm_sepia" });
  assert.ok(sepiaSvg.includes('#F4ECD8'), "Sepia theme must use warm background");
  console.log("✓ Test 2: Dual theme palettes (Dark & Sepia) verified.");
}

// Test 3: XML character escaping defense (XSS & XML validity)
{
  const dirtyTitle = "مراجعة & قراءة <script>alert(1)</script> \"الفصل\"";
  const svg = CardEngine.generateAccomplishmentCardSvg({ taskTitle: dirtyTitle });
  assert.ok(!svg.includes('<script>'), "Must escape script tag");
  assert.ok(svg.includes('&amp;'), "Must escape ampersand");
  assert.ok(svg.includes('&quot;'), "Must escape quotes");
  console.log("✓ Test 3: XML character escaping defense verified.");
}

// Test 4: Streak badge and RTL/LTR directionality
{
  const arSvg = CardEngine.generateAccomplishmentCardSvg({ streakDays: 14 }, { isRtl: true });
  assert.ok(arSvg.includes('dir="rtl"'));
  assert.ok(arSvg.includes('\u200E14 أيام استمرارية'));

  const enSvg = CardEngine.generateAccomplishmentCardSvg({ streakDays: 14 }, { isRtl: false });
  assert.ok(enSvg.includes('dir="ltr"'));
  assert.ok(enSvg.includes('14 Day Streak'));
  console.log("✓ Test 4: Bilingual streak badge & directionality verified.");
}

// Test 5: Fallback safety when metrics are empty
{
  const safeSvg = CardEngine.generateAccomplishmentCardSvg(null, null);
  assert.ok(safeSvg.includes('DEEP FOCUS'));
  assert.ok(safeSvg.includes('\u200E25'), "Default 25 mins fallback");
  console.log("✓ Test 5: Empty metrics fallback safety verified.");
}

console.log("--- All Mission #079 Tests PASSED (GREEN) ---");
