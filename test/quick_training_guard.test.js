const assert = require('assert');
const {
    initializeTrainingSession,
    transitionPhase,
    recoverTrainingSession
} = require('../android/app/src/main/assets/web/js/quick_training_guard.js');

console.log("--- Running 🎯 Mission #016: Quick Training Guard Tests ---");

const memoryStorage = {};
const mockStorage = {
    setItem: (k, v) => { memoryStorage[k] = v; },
    getItem: (k) => memoryStorage[k] || null
};

// Test 1: Initialize 3-Round Training Session
const session = initializeTrainingSession({
    sessionId: "train_test_101",
    totalRounds: 3,
    workSeconds: 20,
    restSeconds: 10
});

assert.strictEqual(session.currentRound, 1);
assert.strictEqual(session.phase, "WORK");
console.log("✔ Test 1: Quick Training session initialized at Round 1 WORK.");

// Test 2: Transition from Round 1 WORK -> Round 1 REST
const step1 = transitionPhase(session, mockStorage);
assert.strictEqual(step1.session.currentRound, 1);
assert.strictEqual(step1.session.phase, "REST");
assert.strictEqual(step1.isComplete, false);
console.log("✔ Test 2: Transition to Round 1 REST successful.");

// Test 3: Transition from Round 1 REST -> Round 2 WORK
const step2 = transitionPhase(step1.session, mockStorage);
assert.strictEqual(step2.session.currentRound, 2);
assert.strictEqual(step2.session.phase, "WORK");
console.log("✔ Test 3: Transition to Round 2 WORK successful.");

// Test 4: Simulate Process Death mid-round and Recover
step2.session.status = "ACTIVE";
mockStorage.setItem("zen_fortress_training_state_v21", JSON.stringify(step2.session));

const recovered = recoverTrainingSession(mockStorage);
assert.ok(recovered !== null);
assert.strictEqual(recovered.currentRound, 2);
assert.strictEqual(recovered.phase, "WORK");
assert.strictEqual(recovered.status, "PAUSED", "Must recover in safe PAUSED state to prevent runaway timers.");
console.log("✔ Test 4: Mid-round state recovered faithfully after simulated process restart.");

// Test 5: Advance through to final completion
let current = step2.session;
while (current.phase !== "COMPLETED") {
    const res = transitionPhase(current, mockStorage);
    current = res.session;
}
assert.strictEqual(current.phase, "COMPLETED");
assert.strictEqual(current.status, "COMPLETED");
assert.strictEqual(current.currentRound, 3);
console.log("✔ Test 5: Complete 3-round training cycle terminated cleanly.");

console.log("--- All Mission #016 Quick Training Tests PASSED (GREEN) ---");
