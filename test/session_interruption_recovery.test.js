const assert = require('assert');
const {
    snapshotActiveSession,
    checkInterruptedSession,
    resolveInterruptedSession
} = require('../android/app/src/main/assets/web/js/session_interruption_recovery.js');

console.log("--- Running 🎯 Mission #032: Session Interruption Tests ---");

const memoryStore = {};
const mockStorage = {
    getItem: (k) => memoryStore[k] || null,
    setItem: (k, v) => { memoryStore[k] = v; },
    removeItem: (k) => { delete memoryStore[k]; }
};

let creditedMinutesInAnalytics = 0;
const mockAnalytics = {
    addFocusMinutes: (mins) => { creditedMinutesInAnalytics += mins; }
};

// Test 1: Snapshot active session interrupted at 18 minutes (1080 seconds elapsed, 420s remaining)
const runningSession = {
    sessionId: "sess_call_interrupted_101",
    activityType: "deep_study",
    durationMinutes: 25,
    elapsedSeconds: 1080, // 18 minutes worked
    remainingSeconds: 420,  // 7 minutes left
    status: "RUNNING"
};

const snapRes = snapshotActiveSession(runningSession, mockStorage);
assert.strictEqual(snapRes, true);

const detected = checkInterruptedSession(mockStorage);
assert.ok(detected !== null);
assert.strictEqual(detected.sessionId, "sess_call_interrupted_101");
assert.strictEqual(detected.elapsedSeconds, 1080);
console.log("✔ Test 1: Interrupted session snapshot captured faithfully at 18 minutes.");

// Test 2: Resolve via RESUME (Must continue with exact 420 seconds in PAUSED state)
const resResume = resolveInterruptedSession(detected, "RESUME", mockStorage, mockAnalytics);
assert.strictEqual(resResume.resolved, true);
assert.strictEqual(resResume.session.remainingSeconds, 420);
assert.strictEqual(resResume.session.status, "PAUSED");
console.log("✔ Test 2: RESUME action restores exact remaining seconds (420s / 7 mins).");

// Test 3: Resolve via SAVE_PARTIAL (Must credit exactly 18 earned minutes, NEVER full 25)
const resPartial = resolveInterruptedSession(detected, "SAVE_PARTIAL", mockStorage, mockAnalytics);
assert.strictEqual(resPartial.resolved, true);
assert.strictEqual(resPartial.creditedMinutes, 18, "Must strictly credit 18 earned minutes!");
assert.notStrictEqual(resPartial.creditedMinutes, 25, "Must NEVER credit unworked 25 minutes!");
assert.strictEqual(creditedMinutesInAnalytics, 18);
console.log("✔ Test 3: SAVE_PARTIAL credited exactly 18 earned minutes without phantom time.");

// Test 4: Verify snapshot cleared after resolution
assert.strictEqual(checkInterruptedSession(mockStorage), null);
console.log("✔ Test 4: Storage snapshot cleared cleanly after resolution.");

console.log("--- All Mission #032 Recovery Tests PASSED (GREEN) ---");
