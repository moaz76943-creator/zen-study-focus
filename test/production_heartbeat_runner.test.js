const assert = require('assert');
const Runner = require('../android/app/src/main/assets/web/js/production_heartbeat_runner.js');

console.log("--- Running 🎯 Mission #063: Production Heartbeat Runner Tests ---");

// Test 1: Record hourly heartbeat tick into ledger
{
  const initial = [];
  const updated = Runner.appendHeartbeatEntry(initial, {
    headSha: "9c14b96",
    status: "ALL_INVARIANTS_HEALTHY",
    activeSuitesCount: 57
  });

  assert.strictEqual(updated.length, 1);
  assert.strictEqual(updated[0].headSha, "9c14b96");
  assert.strictEqual(updated[0].status, "ALL_INVARIANTS_HEALTHY");
  assert.strictEqual(updated[0].activeSuitesCount, 57);
  console.log("✓ Test 1: Hourly heartbeat ledger recording verified.");
}

// Test 2: Rolling 100-entry rotation without data corruption
{
  let ledger = [];
  for (let i = 0; i < 115; i++) {
    ledger = Runner.appendHeartbeatEntry(ledger, {
      headSha: "sha_" + i,
      status: "ALL_INVARIANTS_HEALTHY"
    });
  }

  assert.strictEqual(ledger.length, Runner.MAX_LEDGER_ENTRIES, "Ledger must strictly cap at 100 items");
  assert.strictEqual(ledger[ledger.length - 1].headSha, "sha_114", "Latest entry must be preserved");
  console.log("✓ Test 2: Rolling 100-entry cap and FIFO pruning verified.");
}

// Test 3: Cumulative health score calculation
{
  const mockLedger = [
    { status: "ALL_INVARIANTS_HEALTHY" },
    { status: "ALL_INVARIANTS_HEALTHY" },
    { status: "ALL_INVARIANTS_HEALTHY" },
    { status: "WARNING" }
  ];

  const score = Runner.calculateHealthScore(mockLedger);
  assert.strictEqual(score, 75, "3/4 healthy must equal 75%");

  const perfectScore = Runner.calculateHealthScore([{ status: "ALL_INVARIANTS_HEALTHY" }]);
  assert.strictEqual(perfectScore, 100);
  console.log("✓ Test 3: Cumulative health score calculation verified.");
}

// Test 4: Missing test suite detection audit
{
  const mockFiles = [
    "test/saf_import_guard.test.js",
    "test/timer_lifecycle_guard.test.js"
  ];
  const check = Runner.auditRequiredSuitesPresence(mockFiles, ["saf_import", "timer_lifecycle"]);
  assert.strictEqual(check.passed, true);
  assert.strictEqual(check.missingCount, 0);

  const missingCheck = Runner.auditRequiredSuitesPresence(mockFiles, ["saf_import", "non_existent_suite"]);
  assert.strictEqual(missingCheck.passed, false);
  assert.strictEqual(missingCheck.missingCount, 1);
  assert.strictEqual(missingCheck.missingSuites[0], "non_existent_suite");
  console.log("✓ Test 4: Missing suite detection audit verified.");
}

// Test 5: Empty and invalid inputs resilience
{
  assert.deepStrictEqual(Runner.appendHeartbeatEntry([], null), []);
  assert.strictEqual(Runner.calculateHealthScore([]), 100);
  console.log("✓ Test 5: Empty input resilience verified.");
}

console.log("--- All Mission #063 Tests PASSED (GREEN) ---");
