const assert = require('assert');
const Taxonomy = require('../android/app/src/main/assets/web/js/focus_tags_taxonomy_engine.js');

console.log("--- Running 🎯 Mission #051: Focus Tags Taxonomy Tests ---");
{
  assert.strictEqual(Taxonomy.normalizeTag("#دراسة"), "دراسة");
  assert.strictEqual(Taxonomy.normalizeTag("  #Coding  "), "coding");
  assert.strictEqual(Taxonomy.normalizeTag(null), "");
  console.log("✓ Test 1: Tag normalization verified.");
}
{
  const color = Taxonomy.assignTagColor("any", 1);
  assert.strictEqual(color, "#2B6CB0");
  console.log("✓ Test 2: Tag palette color assignment verified.");
}
{
  const mockSessions = [
    { durationMinutes: 60, tags: ["#برمجة", "دراسة"] },
    { durationMinutes: 30, tags: ["#برمجة"] },
    { durationMinutes: 45, category: "قراءة" }
  ];
  const agg = Taxonomy.aggregateTimeByTag(mockSessions);
  assert.strictEqual(agg.length, 3);
  assert.strictEqual(agg[0].tag, "برمجة");
  assert.strictEqual(agg[0].totalMinutes, 90);
  console.log("✓ Test 3: Time aggregation by tag verified.");
}
{
  const emptyAgg = Taxonomy.aggregateTimeByTag([]);
  assert.strictEqual(emptyAgg.length, 0);
  console.log("✓ Test 4: Empty sessions aggregation safety verified.");
}
console.log("--- All Mission #051 Tests PASSED (GREEN) ---");
