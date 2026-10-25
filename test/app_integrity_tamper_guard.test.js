const assert = require('assert');
const TamperGuard = require('../android/app/src/main/assets/web/js/app_integrity_tamper_guard.js');

console.log("--- Running 🎯 Mission #076: App Integrity & Anti-Tamper Guard Tests ---");

// Test 1: Developer environment bypass allows seamless testing in Termux/AI agents
{
  const devRes = TamperGuard.evaluateAppIntegrity({ isDevEnv: true });
  assert.strictEqual(devRes.isTampered, false);
  assert.strictEqual(devRes.status, "PASSED_DEV_ENVIRONMENT");
  console.log("✓ Test 1: Developer freedom & seamless agent environment bypass verified.");
}

// Test 2: Official package name and official signature pass production integrity gate
{
  const prodContext = {
    isDevEnv: false,
    packageName: "com.deepfocus.zen",
    signatureHash: TamperGuard.OFFICIAL_SIGNATURE_HASH
  };
  // Emulate browser/app environment
  global.window = {};
  const res = TamperGuard.evaluateAppIntegrity(prodContext);
  assert.strictEqual(res.isTampered, false);
  assert.strictEqual(res.status, "INTEGRITY_VERIFIED_SECURE");
  console.log("✓ Test 2: Official production package & signature validation verified.");
}

// Test 3: Detects repackaged mod APK (tampered package name)
{
  const modContext = {
    isDevEnv: false,
    packageName: "com.cracked.mod.deepfocus"
  };
  const res = TamperGuard.evaluateAppIntegrity(modContext);
  assert.strictEqual(res.isTampered, true);
  assert.strictEqual(res.status, "TAMPER_DETECTED");
  assert.ok(res.violation.includes("UNOFFICIAL_PACKAGE_NAME"));
  console.log("✓ Test 3: Repackaged mod package detection verified.");
}

// Test 4: Detects re-signed cracked APK
{
  const crackedContext = {
    isDevEnv: false,
    packageName: "com.deepfocus.zen",
    signatureHash: "FAKE_CRACKED_KEY_SIGNATURE"
  };
  const res = TamperGuard.evaluateAppIntegrity(crackedContext);
  assert.strictEqual(res.isTampered, true);
  assert.strictEqual(res.violation, "INVALID_SIGNATURE_HASH");
  console.log("✓ Test 4: Re-signed cracked APK signature alarm verified.");
}

// Test 5: Storage checksum verifies data and detects hex-editing
{
  const payload = '{"streakDays":14,"totalMinutes":900}';
  const validChecksum = TamperGuard.generateDataChecksum(payload);

  const cleanCheck = TamperGuard.evaluateAppIntegrity({
    isDevEnv: false,
    packageName: "com.deepfocus.zen",
    signatureHash: TamperGuard.OFFICIAL_SIGNATURE_HASH,
    dataPayload: payload,
    providedChecksum: validChecksum
  });
  assert.strictEqual(cleanCheck.isTampered, false);

  const tamperedCheck = TamperGuard.evaluateAppIntegrity({
    isDevEnv: false,
    packageName: "com.deepfocus.zen",
    signatureHash: TamperGuard.OFFICIAL_SIGNATURE_HASH,
    dataPayload: '{"streakDays":9999,"totalMinutes":900}', // Edited
    providedChecksum: validChecksum
  });
  assert.strictEqual(tamperedCheck.isTampered, true);
  assert.strictEqual(tamperedCheck.violation, "STORAGE_CHECKSUM_MISMATCH");
  console.log("✓ Test 5: Storage data checksum & anti-hex-editing guard verified.");
}

// Cleanup global mock
delete global.window;

console.log("--- All Mission #076 Tests PASSED (GREEN) ---");
