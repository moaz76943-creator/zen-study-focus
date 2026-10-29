const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { parseAndAuditGitleaksReport } = require('../tools/security/gitleaks_report_guard.cjs');

console.log("--- Running 🎯 Mission #005: Gitleaks Guard Tests ---");

const tempDir = path.join(__dirname, 'temp_sec_fixtures');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

const missingPath = path.join(tempDir, 'missing.json');
const malformedPath = path.join(tempDir, 'malformed.json');
const cleanPath = path.join(tempDir, 'clean.json');
const dirtyPath = path.join(tempDir, 'dirty.json');

fs.writeFileSync(malformedPath, '{ "not_closed": ');
fs.writeFileSync(cleanPath, '[]');
fs.writeFileSync(dirtyPath, JSON.stringify([
    {
        RuleID: "generic-api-key",
        File: "src/config.js",
        StartLine: 12,
        Secret: "RAW_SENSITIVE_KEY_SHOULD_NEVER_BE_IN_LOGS"
    }
]));

// Test 1: Missing Report Handling
const resMissing = parseAndAuditGitleaksReport(missingPath, 0);
assert.strictEqual(resMissing.status, "BLOCKED_MISSING_REPORT");
assert.strictEqual(resMissing.clean, false);
console.log("✔ Test 1: Missing report accurately classified as BLOCKED.");

// Test 2: Malformed Report Handling
const resMalformed = parseAndAuditGitleaksReport(malformedPath, 0);
assert.strictEqual(resMalformed.status, "BLOCKED_MALFORMED_REPORT");
assert.strictEqual(resMalformed.clean, false);
console.log("✔ Test 2: Malformed JSON report classified as BLOCKED.");

// Test 3: Dirty Report with Secret Redaction
const resDirty = parseAndAuditGitleaksReport(dirtyPath, 1);
assert.strictEqual(resDirty.status, "FAIL");
assert.strictEqual(resDirty.clean, false);
assert.strictEqual(resDirty.findingsCount, 1);
assert.strictEqual(resDirty.findings[0].secret, "[REDACTED_SECURITY_POLICY]");
console.log("✔ Test 3: Secret findings detected, classified as FAIL, and values redacted.");

// Test 4: Clean Report Validation
const resClean = parseAndAuditGitleaksReport(cleanPath, 0);
assert.strictEqual(resClean.status, "PASS");
assert.strictEqual(resClean.clean, true);
assert.strictEqual(resClean.findingsCount, 0);
console.log("✔ Test 4: Clean report certified as PASS.");

// Cleanup fixtures
fs.rmSync(tempDir, { recursive: true, force: true });

console.log("--- All Mission #005 Security Tests PASSED (GREEN) ---");
