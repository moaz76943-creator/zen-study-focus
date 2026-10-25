const assert = require('assert');
const {
    aggregateSessionsSinglePass,
    exportToCsvSecure,
    sanitizeForCsv
} = require('../android/app/src/main/assets/web/js/analytics_performance_guard.js');

console.log("--- Running 🎯 Mission #013: Analytics Scale & CSV Tests ---");

// Test 1: Performance Benchmark with 10,000 Real Sessions
console.log("[*] Generating 10,000 synthetic test sessions...");
const testSessions = [];
for (let i = 0; i < 10000; i++) {
    testSessions.push({
        sessionId: `sess_${i}`,
        dateStr: (i % 2 === 0) ? "2026-10-22" : "2026-10-21",
        durationMinutes: 25,
        activityType: (i % 3 === 0) ? "deep_study" : "coding",
        completed: true
    });
}

const startTime = Date.now();
const result = aggregateSessionsSinglePass(testSessions, "2026-10-22");
const durationMs = Date.now() - startTime;

console.log(`[*] Processed 10,000 sessions in: ${durationMs}ms`);
assert.ok(durationMs < 50, `10,000 sessions aggregation must complete under 50ms (Actual: ${durationMs}ms)`);
assert.strictEqual(result.sessionCount, 10000);
assert.strictEqual(result.totalMinutes, 250000);
assert.strictEqual(result.todayMinutes, 125000); // 5000 sessions * 25
console.log("✔ Test 1: 10,000 sessions aggregated at ultra-high speed (O(N) single-pass).");

// Test 2: Handling legacy duration-only records without inventing start times
const legacySessions = [
    { sessionId: "legacy_01", durationMinutes: 30, activityType: "reading" }, // No startTime!
    { sessionId: "legacy_02", durationMinutes: 15 }
];
const legacyResult = aggregateSessionsSinglePass(legacySessions, "2026-10-22");
assert.strictEqual(legacyResult.totalMinutes, 45);
console.log("✔ Test 2: Legacy duration-only sessions aggregated accurately without phantom fields.");

// Test 3: CSV Formula Injection Guard
const dangerousField = "=SUM(A1:A10)";
const sanitizedFormula = sanitizeForCsv(dangerousField);
assert.ok(sanitizedFormula.includes("'=SUM(A1:A10)"), "Formula must be neutralized with leading apostrophe.");
console.log("✔ Test 3: CSV Formula Injection sanitized successfully.");

// Test 4: CSV Export UTF-8 BOM Verification
const exportData = [
    { sessionId: "s1", dateStr: "2026-10-22", durationMinutes: 25, activityType: "قراءة مركزة", completed: true }
];
const csvOutput = exportToCsvSecure(exportData);
assert.ok(csvOutput.startsWith("\uFEFF"), "CSV output must start with UTF-8 BOM marker for mobile Excel.");
assert.ok(csvOutput.includes("قراءة مركزة"), "Arabic text preserved in CSV export.");
console.log("✔ Test 4: Secure UTF-8 BOM CSV export verified.");

console.log("--- All Mission #013 Analytics Tests PASSED (GREEN) ---");
