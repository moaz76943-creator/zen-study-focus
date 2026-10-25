const assert = require('assert');
const { validateEvidence } = require('../tools/daily_maintenance/evidence_integrity_guard.cjs');

console.log("--- Running 🎯 Mission #004: Evidence Integrity Tests ---");

const CURRENT_HEAD = "8e6d0bf123456789abcdef0123456789abcdef01";
const STALE_HEAD   = "a552ec566d9089ff930df224fa80f03a8ef1aa3a";

// Test 1: Reject Stale SHA (Inheritance prevention)
const staleRun = { sha: STALE_HEAD, assertionsCount: 15, failuresCount: 0 };
const resStale = validateEvidence(staleRun, CURRENT_HEAD);
assert.strictEqual(resStale.status, "STALE_SHA_REJECTED");
assert.strictEqual(resStale.valid, false);
console.log("✔ Test 1: Stale SHA from older commit strictly rejected.");

// Test 2: Reject Exit 0 with zero assertions
const emptyRun = { sha: CURRENT_HEAD, assertionsCount: 0, failuresCount: 0 };
const resEmpty = validateEvidence(emptyRun, CURRENT_HEAD);
assert.strictEqual(resEmpty.status, "ZERO_ASSERTIONS_REJECTED");
assert.strictEqual(resEmpty.valid, false);
console.log("✔ Test 2: Empty test report with 0 assertions rejected.");

// Test 3: Reject 100% skipped test
const skippedRun = { sha: CURRENT_HEAD, assertionsCount: 5, skippedCount: 5, failuresCount: 0 };
const resSkipped = validateEvidence(skippedRun, CURRENT_HEAD);
assert.strictEqual(resSkipped.status, "ALL_SKIPPED_REJECTED");
assert.strictEqual(resSkipped.valid, false);
console.log("✔ Test 3: Suite with 100% skipped assertions rejected.");

// Test 4: Accept authentic, matching PASS
const validRun = { sha: CURRENT_HEAD, assertionsCount: 22, failuresCount: 0, skippedCount: 0 };
const resValid = validateEvidence(validRun, CURRENT_HEAD);
assert.strictEqual(resValid.status, "PASS");
assert.strictEqual(resValid.valid, true);
assert.strictEqual(resValid.verifiedAssertions, 22);
console.log("✔ Test 4: Authentic current SHA test run certified as PASS.");

console.log("--- All Mission #004 Integrity Tests PASSED (GREEN) ---");
