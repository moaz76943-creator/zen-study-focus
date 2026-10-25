const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/distraction_log_engine.js');

console.log("--- Running 🎯 Mission #049: Distraction Log Engine Tests ---");
{
  let buffer = [];
  buffer = Engine.recordDistraction(buffer, "فكرة اتصال مهم", 320);
  assert.strictEqual(buffer.length, 1);
  assert.strictEqual(buffer[0].text, "فكرة اتصال مهم");
  assert.strictEqual(buffer[0].elapsedSeconds, 320);
  console.log("✓ Test 1: Record distraction note with elapsed time verified.");
}
{
  let buffer = [];
  for (let i = 0; i < 25; i++) {
    buffer = Engine.recordDistraction(buffer, "تشتت " + i, i * 10);
  }
  assert.strictEqual(buffer.length, Engine.MAX_BUFFER_ITEMS, "Must cap at 20 items");
  assert.strictEqual(buffer[buffer.length - 1].text, "تشتت 24");
  console.log("✓ Test 2: Maximum buffer ceiling (20 items) enforced.");
}
{
  let buffer = [];
  buffer = Engine.recordDistraction(buffer, "نص خبيث <script>alert(1)</script>", 50);
  assert.strictEqual(buffer[0].text, "نص خبيث scriptalert(1)/script");
  console.log("✓ Test 3: XSS sanitization verified.");
}
{
  const summary = Engine.getDistractionSummary([{ text: "1" }, { text: "2" }]);
  assert.strictEqual(summary.totalCount, 2);
  assert.strictEqual(summary.hasDistractions, true);
  console.log("✓ Test 4: Distraction summary contract verified.");
}
console.log("--- All Mission #049 Tests PASSED (GREEN) ---");
