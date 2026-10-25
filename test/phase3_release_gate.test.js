const assert = require('assert');
const path = require('path');
const fs = require('fs');
const Auditor = require('../android/app/src/main/assets/web/js/phase3_release_gate_auditor.cjs');

console.log("--- Running 🎯 Mission #037: Phase 3 Release Gate Security Tests ---");

// Test 1: Reject debuggable=true in manifests
{
  const mockDebugManifest = `<application android:debuggable="true" android:label="Deep Focus" />`;
  const tmpManifest = path.join(__dirname, 'tmp_debug_manifest.xml');
  fs.writeFileSync(tmpManifest, mockDebugManifest, 'utf8');

  const res = Auditor.auditManifest(tmpManifest);
  fs.unlinkSync(tmpManifest);

  assert.strictEqual(res.passed, false, "Must reject debuggable=true manifests");
  assert.ok(res.error.includes("SECURITY_VIOLATION"));
  console.log("✓ Test 1: Release Gate successfully rejects debuggable=true.");
}

// Test 2: Reject cleartext HTTP traffic in manifests
{
  const mockHttpManifest = `<application android:usesCleartextTraffic="true" />`;
  const tmpManifest = path.join(__dirname, 'tmp_http_manifest.xml');
  fs.writeFileSync(tmpManifest, mockHttpManifest, 'utf8');

  const res = Auditor.auditManifest(tmpManifest);
  fs.unlinkSync(tmpManifest);

  assert.strictEqual(res.passed, false, "Must reject cleartext HTTP traffic");
  console.log("✓ Test 2: Release Gate successfully enforces zero cleartext traffic.");
}

// Test 3: Audit actual repository web assets for zero external CDNs
{
  const repoWebDir = path.resolve(__dirname, '../android/app/src/main/assets/web');
  const res = Auditor.auditWebAssets(repoWebDir);

  assert.strictEqual(res.passed, true, "All web assets must pass offline security audit");
  assert.strictEqual(res.violations.length, 0);
  console.log("✓ Test 3: 100% Offline-first asset integrity verified (0 CDN/secret violations).");
}

// Test 4: Verify v21 storage invariant schemas
{
  const v21 = Auditor.verifyV21Invariants();
  assert.strictEqual(v21.passed, true);
  assert.strictEqual(v21.protectedMarkers.length, 4);
  assert.ok(v21.protectedMarkers.includes("ZEN21::"));
  console.log("✓ Test 4: All 4 Fortress v21 storage markers verified intact.");
}

console.log("--- All Mission #037 Release Gate Tests PASSED (GREEN) ---");
