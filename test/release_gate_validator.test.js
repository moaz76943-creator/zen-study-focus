const assert = require('assert');
const { auditReleaseGate } = require('../tools/release/release_gate_validator.cjs');

console.log("--- Running 🎯 Mission #019: Release Gates Tests ---");

// Test 1: Reject Debug AAB (Never valid for store)
const debugAab = {
    packageId: "com.zenstudy.focus",
    versionCode: 210,
    buildType: "DEBUG_AAB",
    signingState: "DEBUG_KEYSTORE"
};
const resDebug = auditReleaseGate(debugAab, true);
assert.strictEqual(resDebug.approved, false);
assert.strictEqual(resDebug.status, "REJECTED_DEBUG_ARTIFACT");
console.log("✔ Test 1: Debug AAB strictly blocked from production release.");

// Test 2: Reject when RELEASE_APPROVED=NO (Default human approval gate)
const prodAab = {
    packageId: "com.zenstudy.focus",
    versionCode: 210,
    buildType: "RELEASE_AAB",
    signingState: "PROD_SIGNED",
    sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
};
const resNoApproval = auditReleaseGate(prodAab, false); // No human approval
assert.strictEqual(resNoApproval.approved, false);
assert.strictEqual(resNoApproval.status, "BLOCKED_AWAITING_HUMAN_APPROVAL");
console.log("✔ Test 2: Invariant RELEASE_APPROVED=NO honored prior to human consent.");

// Test 3: Approved when signed, verified with valid SHA256 and approved
const resApproved = auditReleaseGate(prodAab, true); // Human approved
assert.strictEqual(resApproved.approved, true);
assert.strictEqual(resApproved.status, "RELEASE_APPROVED_FOR_STAGING");
console.log("✔ Test 3: Fully signed production AAB approved with verified SHA256.");

console.log("--- All Mission #019 Release Gate Tests PASSED (GREEN) ---");
