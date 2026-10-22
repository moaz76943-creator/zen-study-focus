const assert = require('assert');
const {
    getTemplatesList,
    applyTemplateToTimer,
    BUILTIN_TEMPLATES
} = require('../android/app/src/main/assets/web/js/focus_templates_engine.js');

console.log("--- Running 🎯 Mission #029: Focus Templates Tests ---");

// Test 1: Verify 4 Builtin Templates Integrity
const list = getTemplatesList();
assert.strictEqual(list.length, 4);
assert.strictEqual(list[0].id, "template_deep_work");
assert.strictEqual(list[0].workMinutes, 50);
assert.strictEqual(list[1].workMinutes, 25);
assert.strictEqual(list[2].workMinutes, 15);
assert.strictEqual(list[3].workMinutes, 90);
console.log("✔ Test 1: All 4 built-in focus templates verified with exact timings.");

// Test 2: Apply Deep Work Template to idle timer
const idleTimer = { status: "READY" };
const resApply = applyTemplateToTimer("template_deep_work", idleTimer);
assert.strictEqual(resApply.success, true);
assert.strictEqual(resApply.config.durationMinutes, 50);
assert.strictEqual(resApply.config.remainingSeconds, 3000); // 50 * 60
assert.strictEqual(resApply.config.activityType, "deep_work");
console.log("✔ Test 2: Deep Work template (50m/10m) successfully applied to timer.");

// Test 3: Running Timer Protection (Reject silent overwrite)
const runningTimer = { status: "RUNNING", remainingSeconds: 1200 };
const resRunning = applyTemplateToTimer("template_quick_sprint", runningTimer, false);
assert.strictEqual(resRunning.success, false);
assert.strictEqual(resRunning.reason, "ACTIVE_SESSION_PROTECTED");
console.log("✔ Test 3: Active timer protected against accidental template override.");

// Test 4: Running Timer Override with explicit confirmation
const resConfirmed = applyTemplateToTimer("template_quick_sprint", runningTimer, true);
assert.strictEqual(resConfirmed.success, true);
assert.strictEqual(resConfirmed.config.durationMinutes, 15);
console.log("✔ Test 4: Template override allowed when user explicitly confirms.");

console.log("--- All Mission #029 Templates Tests PASSED (GREEN) ---");
