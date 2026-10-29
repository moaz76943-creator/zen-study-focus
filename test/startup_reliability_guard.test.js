const assert = require('assert');
const {
    bootstrapApplication,
    safeReadStorageKey
} = require('../android/app/src/main/assets/web/js/startup_reliability_guard.js');

console.log("--- Running 🎯 Mission #014: Startup Reliability Tests ---");

// Test 1: Healthy Fast Boot (Critical path succeeds, splash dismissed)
let splashClosed = false;
const healthyCritical = async () => { /* Core timer & storage ready */ };
const hooks = { onDismissSplash: () => { splashClosed = true; } };

(async () => {
    const report1 = await bootstrapApplication(healthyCritical, [], hooks);
    assert.strictEqual(report1.status, "READY");
    assert.strictEqual(report1.criticalSuccess, true);
    assert.strictEqual(splashClosed, true, "Splash screen must be dismissed.");
    console.log("✔ Test 1: Healthy boot completes and dismisses splash screen immediately.");

    // Test 2: Startup with failing optional service (Audio offline failure)
    splashClosed = false;
    const failingOptional = [
        async () => { throw new Error("Offline audio asset decoding failed"); }
    ];
    const report2 = await bootstrapApplication(healthyCritical, failingOptional, hooks);
    assert.strictEqual(report2.status, "READY");
    assert.strictEqual(splashClosed, true, "Optional service failure must NEVER block splash screen!");
    console.log("✔ Test 2: Optional service failure cleanly isolated; core app boots without block.");

    // Test 3: Zero Auto-Wipe on Corrupted Storage Data
    const corruptedStorage = {
        data: { "zen_fortress_tasks_v21": "{ malformed_json_corrupted_payload: " },
        getItem(k) { return this.data[k]; },
        clear() { throw new Error("CATASTROPHIC_AUTO_WIPE_DETECTED!"); }
    };

    const parsed = safeReadStorageKey(corruptedStorage, "zen_fortress_tasks_v21", []);
    assert.strictEqual(parsed.__isCorruptedRaw, true);
    assert.strictEqual(parsed.__rawContentPreserved, true);
    assert.ok(corruptedStorage.data["zen_fortress_tasks_v21"].length > 0, "Corrupted raw content must be preserved!");
    console.log("✔ Test 3: Corrupted data read without auto-wiping storage; raw data preserved.");

    // Test 4: Critical service failure activates Safe Mode without trapping user in spinner
    splashClosed = false;
    let safeModeCalled = false;
    const failingCritical = async () => { throw new Error("Critical storage init error"); };
    const safeModeHooks = {
        onDismissSplash: () => { splashClosed = true; },
        onActivateSafeMode: () => { safeModeCalled = true; }
    };

    const report4 = await bootstrapApplication(failingCritical, [], safeModeHooks);
    assert.strictEqual(report4.status, "SAFE_MODE_DATA_PRESERVED");
    assert.strictEqual(splashClosed, true, "Splash must be dismissed even on error to show safe mode!");
    assert.strictEqual(safeModeCalled, true);
    console.log("✔ Test 4: Critical failure activates Safe Mode with splash dismissed.");

    console.log("--- All Mission #014 Startup Tests PASSED (GREEN) ---");
})();
