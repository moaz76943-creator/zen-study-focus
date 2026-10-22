const assert = require('assert');
const Monitor = require('../android/app/src/main/assets/web/js/v21_data_health_monitor.js');

console.log("--- Running 🎯 Mission #052: v21 Data Health Monitor Tests ---");
{
  const cleanData = {
    tasks: [{ id: "t1", title: "مهمة" }],
    notes: [{ id: "n1", title: "ملاحظة" }],
    sessions: [{ id: "s1", durationMinutes: 25 }]
  };
  const health = Monitor.evaluateFortressHealth(cleanData);
  assert.strictEqual(health.status, "HEALTHY");
  assert.strictEqual(health.totalIssuesFound, 0);
  console.log("✓ Test 1: Clean datasets return HEALTHY verified.");
}
{
  const corruptData = {
    tasks: [{ id: "t1" }, null, undefined, { title: "بدون معرف" }]
  };
  const health = Monitor.evaluateFortressHealth(corruptData);
  assert.strictEqual(health.status, "AUTO_REPAIRED");
  assert.strictEqual(health.healedDatasets.tasks.length, 2, "Corrupt null entries purged, valid item retained");
  assert.ok(health.healedDatasets.tasks[1].id, "Missing ID automatically generated");
  console.log("✓ Test 2: Auto-healing & corrupt entry purging verified.");
}
{
  const res = Monitor.auditAndHealList("not_an_array", "pfx_");
  assert.deepStrictEqual(res.list, []);
  console.log("✓ Test 3: Non-array input fallback verified.");
}
{
  const res = Monitor.auditAndHealList([{ id: 123 }], "pfx_");
  assert.ok(typeof res.list[0].id === 'string', "Non-string IDs normalized to strings");
  console.log("✓ Test 4: ID type normalization verified.");
}
console.log("--- All Mission #052 Tests PASSED (GREEN) ---");
