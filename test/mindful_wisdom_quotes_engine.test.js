const assert = require('assert');
const WisdomEngine = require('../android/app/src/main/assets/web/js/mindful_wisdom_quotes_engine.js');

console.log("--- Running 🎯 Mission #080: Mindful Focus Wisdom Engine Tests ---");

// Test 1: Category-specific quote retrieval
{
  const startQuote = WisdomEngine.getMindfulQuote("start_session", { isRtl: true });
  assert.strictEqual(startQuote.category, "start_session");
  assert.ok(startQuote.text.includes("رحلة الإتقان"));

  const breakQuote = WisdomEngine.getMindfulQuote("during_break", { isRtl: true });
  assert.strictEqual(breakQuote.category, "during_break");
  assert.ok(breakQuote.text.includes("الاستراحة"));

  const compQuote = WisdomEngine.getMindfulQuote("completion", { isRtl: true });
  assert.strictEqual(compQuote.category, "completion");
  assert.ok(compQuote.text.includes("الإتقان"));
  console.log("✓ Test 1: Category-specific quote retrieval (Start, Break, Complete) verified.");
}

// Test 2: Bilingual quote contracts (Arabic & English)
{
  const enQuote = WisdomEngine.getMindfulQuote("start_session", { isRtl: false });
  assert.ok(enQuote.text.includes("journey of mastery"));
  assert.strictEqual(enQuote.author, "Lao Tzu");
  console.log("✓ Test 2: Bilingual quote contracts verified.");
}

// Test 3: Zero medical claims audit (Strict clinical safety)
{
  const safety = WisdomEngine.auditQuotesMedicalSafety();
  assert.strictEqual(safety.zeroMedicalClaimsVerified, true, "Must have zero medical/clinical terms");
  assert.strictEqual(safety.violationsCount, 0);
  assert.ok(safety.totalQuotes >= 7);
  console.log("✓ Test 3: Zero medical claims audit strictly verified.");
}

// Test 4: User opt-out toggle (enabled: false returns null safely)
{
  const disabledQuote = WisdomEngine.getMindfulQuote("start_session", { enabled: false });
  assert.strictEqual(disabledQuote, null, "Disabled toggle must return null without error");
  console.log("✓ Test 4: User opt-out toggle (enabled: false) verified.");
}

// Test 5: Fallback safety on undefined category
{
  const fallback = WisdomEngine.getMindfulQuote("unknown_category");
  assert.ok(fallback);
  assert.ok(fallback.text.length > 0);
  console.log("✓ Test 5: Safe fallback on unknown category verified.");
}

console.log("--- All Mission #080 Tests PASSED (GREEN) ---");
