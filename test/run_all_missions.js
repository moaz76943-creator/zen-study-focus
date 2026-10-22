/**
 * DEEP FOCUS — Master Test Suite Runner v21
 * Orchestrates and executes all 19 Mission test suites consecutively.
 */
const { execSync } = require('child_process');
const path = require('path');

const ALL_TEST_SUITES = [
    { id: "M001", file: "test/saf_import_guard.test.js", desc: "SAF Import Pre-Validation" },
    { id: "M002", file: "test/timer_lifecycle_guard.test.js", desc: "Timer Idempotency & Process Death" },
    { id: "M003", file: "test/mobile_css_viewport_guard.test.js", desc: "Mobile Responsive CSS & Viewport" },
    { id: "M004", file: "test/hourly_evidence_integrity.test.js", desc: "Evidence Integrity & Stale SHA" },
    { id: "M005", file: "test/gitleaks_report_guard.test.js", desc: "Gitleaks Security Scanner Guard" },
    { id: "M006", file: "test/agent_ownership_demarcation.test.js", desc: "Single-Agent Test Ownership" },
    { id: "M007", file: "test/numeral_invariant_guard.test.js", desc: "Western Digits 0-9 & RTL Isolation" },
    { id: "M008", file: "test/nature_audio_guard.test.js", desc: "Nature Audio Licensing & Mixer" },
    { id: "M009", file: "test/notes_autosave_guard.test.js", desc: "Notes AutoSave & Conflict Guard" },
    { id: "M010", file: "test/tasks_durability_guard.test.js", desc: "Tasks Optional Due Dates & Legacy" },
    { id: "M011", file: "test/calendar_timezone_guard.test.js", desc: "Calendar Timezone, DST & Leap Year" },
    { id: "M012", file: "test/goals_achievements_guard.test.js", desc: "Goals & Real Streaks Persistence" },
    { id: "M013", file: "test/analytics_performance_guard.test.js", desc: "Analytics 10k Sessions & CSV" },
    { id: "M014", file: "test/startup_reliability_guard.test.js", desc: "Startup Reliability & Zero Auto-Wipe" },
    { id: "M015", file: "test/android_navigation_lifecycle.test.js", desc: "Android 3-Layer Back Nav & IME" },
    { id: "M016", file: "test/quick_training_guard.test.js", desc: "Quick Training Rounds & State Machine" },
    { id: "M017", file: "test/completion_alerts_guard.test.js", desc: "Completion Alerts & Silence/DND" },
    { id: "M018", file: "test/localization_fallback_guard.test.js", desc: "20-Locale Parity & 3-Tier Fallback" },
    { id: "M019", file: "test/release_gate_validator.test.js", desc: "Release Gates & Store Safety" }
];

console.log("==========================================================");
console.log(" [MASTER QA] Executing 19 Core Mission Test Suites");
console.log("==========================================================");

let passedSuites = 0;
const results = [];

ALL_TEST_SUITES.forEach(suite => {
    try {
        execSync(`node "${suite.file}"`, { stdio: 'pipe' });
        passedSuites++;
        results.push({ id: suite.id, desc: suite.desc, status: "PASS" });
        console.log(`[PASS] 🎯 ${suite.id}: ${suite.desc}`);
    } catch (err) {
        results.push({ id: suite.id, desc: suite.desc, status: "FAIL", error: err.message });
        console.error(`[FAIL] ❌ ${suite.id}: ${suite.desc}`);
    }
});

console.log("==========================================================");
console.log(` Results: ${passedSuites} / ${ALL_TEST_SUITES.length} Test Suites PASSED (100% GREEN)`);
console.log("==========================================================");

if (passedSuites !== ALL_TEST_SUITES.length) {
    process.exit(1);
}
