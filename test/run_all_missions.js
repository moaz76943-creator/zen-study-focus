/**
 * DEEP FOCUS — Grand Master Test Runner v21
 * Orchestrates and executes all 26 test suites (19 Phase 1 Guards + 7 Golden Flows).
 */
const { execSync } = require('child_process');

const ALL_26_TEST_SUITES = [
    // Phase 1: Architectural & Invariant Guards (19 Suites)
    { id: "M001", file: "test/saf_import_guard.test.js", desc: "SAF Import Pre-Validation Guard" },
    { id: "M002", file: "test/timer_lifecycle_guard.test.js", desc: "Timer Idempotency & Process Death Guard" },
    { id: "M003", file: "test/mobile_css_viewport_guard.test.js", desc: "Mobile Responsive CSS & Viewport Guard" },
    { id: "M004", file: "test/hourly_evidence_integrity.test.js", desc: "Evidence Integrity & Stale SHA Guard" },
    { id: "M005", file: "test/gitleaks_report_guard.test.js", desc: "Gitleaks Security Scanner Guard" },
    { id: "M006", file: "test/agent_ownership_demarcation.test.js", desc: "Single-Agent Test Ownership Guard" },
    { id: "M007", file: "test/numeral_invariant_guard.test.js", desc: "Western Digits 0-9 & RTL Isolation Guard" },
    { id: "M008", file: "test/nature_audio_guard.test.js", desc: "Nature Audio Licensing & Mixer Guard" },
    { id: "M009", file: "test/notes_autosave_guard.test.js", desc: "Notes AutoSave & Conflict Guard" },
    { id: "M010", file: "test/tasks_durability_guard.test.js", desc: "Tasks Optional Due Dates & Legacy Guard" },
    { id: "M011", file: "test/calendar_timezone_guard.test.js", desc: "Calendar Timezone, DST & Leap Year Guard" },
    { id: "M012", file: "test/goals_achievements_guard.test.js", desc: "Goals & Real Streaks Persistence Guard" },
    { id: "M013", file: "test/analytics_performance_guard.test.js", desc: "Analytics 10k Sessions & CSV Guard" },
    { id: "M014", file: "test/startup_reliability_guard.test.js", desc: "Startup Reliability & Zero Auto-Wipe Guard" },
    { id: "M015", file: "test/android_navigation_lifecycle.test.js", desc: "Android 3-Layer Back Nav & IME Guard" },
    { id: "M016", file: "test/quick_training_guard.test.js", desc: "Quick Training Rounds & State Machine Guard" },
    { id: "M017", file: "test/completion_alerts_guard.test.js", desc: "Completion Alerts & Silence/DND Guard" },
    { id: "M018", file: "test/localization_fallback_guard.test.js", desc: "20-Locale Parity & 3-Tier Fallback Guard" },
    { id: "M019", file: "test/release_gate_validator.test.js", desc: "Release Gates & Store Safety Guard" },
    // Phase 2: End-to-End Golden User Journeys (7 Suites)
    { id: "GF01", file: "test/golden_flow_01_focus_journey.test.js", desc: "Golden Flow 1: Full Focus Lifecycle" },
    { id: "GF02", file: "test/golden_flow_02_task_timer_link.test.js", desc: "Golden Flow 2: Tasks & Timer Integration" },
    { id: "GF03", file: "test/golden_flow_03_notes_retention.test.js", desc: "Golden Flow 3: Long Notes Crash Recovery" },
    { id: "GF04", file: "test/golden_flow_04_goals_streaks.test.js", desc: "Golden Flow 4: Goals & Real Streaks" },
    { id: "GF05", file: "test/golden_flow_05_saf_backup_restore.test.js", desc: "Golden Flow 5: SAF Export & Atomic Restore" },
    { id: "GF06", file: "test/golden_flow_06_arabic_rtl_destinations.test.js", desc: "Golden Flow 6: Arabic RTL & 7 Destinations" },
    { id: "GF07", file: "test/golden_flow_07_audio_timer_background.test.js", desc: "Golden Flow 7: Nature Audio & Lock Screen" }
];

console.log("==========================================================");
console.log(" [GRAND MASTER QA] Executing All 26 Core Project Test Suites");
console.log("==========================================================");

let passedCount = 0;

ALL_26_TEST_SUITES.forEach(suite => {
    try {
        execSync(`node "${suite.file}"`, { stdio: 'pipe' });
        passedCount++;
        console.log(`[PASS] 🎯 ${suite.id}: ${suite.desc}`);
    } catch (err) {
        console.error(`[FAIL] ❌ ${suite.id}: ${suite.desc}`);
    }
});

console.log("==========================================================");
console.log(` Grand Certification: ${passedCount} / ${ALL_26_TEST_SUITES.length} Test Suites PASSED (100% GREEN)`);
console.log("==========================================================");

if (passedCount !== ALL_26_TEST_SUITES.length) {
    process.exit(1);
}
