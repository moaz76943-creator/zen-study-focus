const assert = require('assert');
const AuditEngine = require('../android/app/src/main/assets/web/js/scheduled_maintenance_audit.js');

console.log("--- Running 🎯 Mission #067: Scheduled Maintenance Audit Tests ---");

// Test 1: Full health audit returns ALL_INVARIANTS_HEALTHY on clean environment
{
  const res = AuditEngine.executeProductionAudit({
    activeSuitesCount: 62,
    isHebrewBlocked: true,
    isDebuggable: false,
    hasV21Tokens: true
  });
  assert.strictEqual(res.status, "ALL_INVARIANTS_HEALTHY");
  assert.strictEqual(res.passed, true);
  assert.strictEqual(res.checks.testSuitesIntegrity, true);
  assert.strictEqual(res.checks.hebrewExclusionActive, true);
  console.log("✓ Test 1: Production health audit returns ALL_INVARIANTS_HEALTHY verified.");
}

// Test 2: Regression alarm triggers on missing suites (< 62)
{
  const failRes = AuditEngine.executeProductionAudit({ activeSuitesCount: 40 });
  assert.strictEqual(failRes.status, "REGRESSION_DETECTED");
  assert.strictEqual(failRes.passed, false);
  assert.strictEqual(failRes.checks.testSuitesIntegrity, false);
  console.log("✓ Test 2: Missing test suite regression alarm verified.");
}

// Test 3: Regression alarm triggers on debuggable=true
{
  const debugRes = AuditEngine.executeProductionAudit({ isDebuggable: true });
  assert.strictEqual(debugRes.status, "REGRESSION_DETECTED");
  assert.strictEqual(debugRes.checks.manifestSecuritySafe, false);
  console.log("✓ Test 3: Manifest debuggable violation alarm verified.");
}

// Test 4: Regression alarm triggers on unblocked Hebrew
{
  const hebrewRes = AuditEngine.executeProductionAudit({ isHebrewBlocked: false });
  assert.strictEqual(hebrewRes.status, "REGRESSION_DETECTED");
  assert.strictEqual(hebrewRes.checks.hebrewExclusionActive, false);
  console.log("✓ Test 4: Hebrew exclusion failure alarm verified.");
}

// Test 5: Cumulative ledger update and rolling rotation
{
  const auditRes = AuditEngine.executeProductionAudit({ activeSuitesCount: 62 });
  const updatedLedger = AuditEngine.updateCumulativeLedger([], auditRes, "CYCLE-067", "a4ce34c");
  assert.strictEqual(updatedLedger.length, 1);
  assert.strictEqual(updatedLedger[0].cycle, "CYCLE-067");
  assert.strictEqual(updatedLedger[0].headSha, "a4ce34c");
  assert.strictEqual(updatedLedger[0].healthScore, 100);
  console.log("✓ Test 5: Cumulative ledger entry contract & health score verified.");
}

console.log("--- All Mission #067 Tests PASSED (GREEN) ---");
