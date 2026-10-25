const assert = require('assert');
const { auditOwnership } = require('../tools/daily_maintenance/ownership_demarcation_guard.cjs');

console.log("--- Running 🎯 Mission #006: Ownership Demarcation Tests ---");

// Test 1: Catch duplicate owners (RED scenario)
const conflictingRegistry = {
    timer_agent: { testSuites: ["test/timer_lifecycle_guard.test.js"] },
    qa_orchestrator: { testSuites: ["test/timer_lifecycle_guard.test.js"] } // Conflict!
};
const resDup = auditOwnership(conflictingRegistry, ["test/timer_lifecycle_guard.test.js"]);
assert.strictEqual(resDup.status, "FAIL_DUPLICATE_OWNERS");
assert.strictEqual(resDup.valid, false);
console.log("✔ Test 1: Duplicate test ownership detected and rejected.");

// Test 2: Catch orphan test suite without owner (RED scenario)
const missingRegistry = {
    timer_agent: { testSuites: ["test/timer_lifecycle_guard.test.js"] }
};
const resOrphan = auditOwnership(missingRegistry, [
    "test/timer_lifecycle_guard.test.js",
    "test/unowned_feature.test.js" // Orphan!
]);
assert.strictEqual(resOrphan.status, "FAIL_ORPHAN_TESTS");
assert.strictEqual(resOrphan.valid, false);
console.log("✔ Test 2: Orphan test suite detected and rejected.");

// Test 3: Authentic Clean Registry covering all Cycle tests (GREEN scenario)
const cleanRegistry = {
    data_integrity_agent: { testSuites: ["test/saf_import_guard.test.js"] },
    timer_agent:          { testSuites: ["test/timer_lifecycle_guard.test.js"] },
    product_consistency:  { testSuites: ["test/mobile_css_viewport_guard.test.js"] },
    hourly_cohort_agent:  { testSuites: ["test/hourly_evidence_integrity.test.js"] },
    security_agent:       { testSuites: ["test/gitleaks_report_guard.test.js"] },
    architecture_agent:   { testSuites: ["test/agent_ownership_demarcation.test.js"] }
};

const allProjectTests = [
    "test/saf_import_guard.test.js",
    "test/timer_lifecycle_guard.test.js",
    "test/mobile_css_viewport_guard.test.js",
    "test/hourly_evidence_integrity.test.js",
    "test/gitleaks_report_guard.test.js",
    "test/agent_ownership_demarcation.test.js"
];

const resClean = auditOwnership(cleanRegistry, allProjectTests);
assert.strictEqual(resClean.status, "PASS");
assert.strictEqual(resClean.valid, true);
assert.strictEqual(resClean.totalTrackedSuites, 6);
console.log("✔ Test 3: Clean 1-to-1 ownership demarcation verified as PASS.");

console.log("--- All Mission #006 Ownership Tests PASSED (GREEN) ---");
