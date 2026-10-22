const assert = require('assert');
const Monitor = require('../android/app/src/main/assets/web/js/maintenance_heartbeat_monitor.js');

console.log("--- Running 🎯 Mission #062: Maintenance Heartbeat Monitor Tests ---");

// Test 1: Clean repository metrics return ALL_INVARIANTS_HEALTHY
{
  const cleanMetrics = {
    manifestContent: '<application android:debuggable="false" />',
    fortressTokens: Monitor.REQUIRED_FORTRESS_TOKENS,
    sampleOutput: "\u200E15:00"
  };

  const report = Monitor.generateHeartbeatReport(cleanMetrics);
  assert.strictEqual(report.status, "ALL_INVARIANTS_HEALTHY");
  assert.strictEqual(report.healthy, true);
  console.log("✓ Test 1: Full invariant health audit returns ALL_INVARIANTS_HEALTHY verified.");
}

// Test 2: Detects missing v21 fortress tokens
{
  const corruptTokens = ["zen_fortress_cfg_v21"]; // Missing notes, tasks, and marker
  const res = Monitor.auditFortressTokens(corruptTokens);
  assert.strictEqual(res.passed, false);
  assert.strictEqual(res.missingTokens.length, 3);
  assert.ok(res.missingTokens.includes("ZEN21::"));
  console.log("✓ Test 2: Missing v21 fortress tokens detection verified.");
}

// Test 3: Detects debuggable=true violation in manifest string
{
  const debugManifest = '<application android:debuggable="true" />';
  const res = Monitor.auditManifestContent(debugManifest);
  assert.strictEqual(res.passed, false);
  assert.strictEqual(res.violation, "DEBUGGABLE_FLAG_ENABLED");
  console.log("✓ Test 3: Manifest debuggable flag violation alarm verified.");
}

// Test 4: Enforces Western digits and catches non-Western numerals
{
  const westernText = "الوقت المتبقي: \u200E25:00 دقيقة";
  assert.strictEqual(Monitor.auditNumericalInvariant(westernText).passed, true);

  const easternText = "الوقت: ٢٥:٠٠";
  const failRes = Monitor.auditNumericalInvariant(easternText);
  assert.strictEqual(failRes.passed, false);
  assert.strictEqual(failRes.violatingChar, "٢");
  console.log("✓ Test 4: Western digits invariant enforcement verified.");
}

// Test 5: Heartbeat state ledger format & schema contract
{
  const report = Monitor.generateHeartbeatReport();
  assert.ok(report.timestamp);
  assert.strictEqual(report.status, "ALL_INVARIANTS_HEALTHY");
  assert.ok(report.checks.manifestSecurity.passed);
  console.log("✓ Test 5: Heartbeat report ledger contract verified.");
}

console.log("--- All Mission #062 Tests PASSED (GREEN) ---");
