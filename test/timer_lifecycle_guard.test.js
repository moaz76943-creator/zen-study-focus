const assert = require('assert');
const { recordCompletion } = require('../android/app/src/main/assets/web/js/timer_idempotency.js');

console.log("--- Running Mission 002: Timer Lifecycle Guard Test ---");

// Mocking storage & analytics tracker
const memoryStorage = {};
const mockStorage = {
    getItem: (key) => memoryStorage[key] || null,
    setItem: (key, val) => { memoryStorage[key] = val; }
};

let totalCreditedMinutes = 0;
const mockAnalytics = {
    addFocusMinutes: (mins) => { totalCreditedMinutes += mins; }
};

const session = {
    sessionId: "sess_20261022_9876",
    durationMinutes: 25,
    activityType: "deep_work"
};

// Execution 1: Normal session completion
const firstRun = recordCompletion(session, mockStorage, mockAnalytics);
assert.strictEqual(firstRun.status, "CREDITED_SUCCESSFULLY");
assert.strictEqual(firstRun.credited, true);
assert.strictEqual(totalCreditedMinutes, 25);
console.log("✔ Step 1: Session credited 25 minutes on initial completion.");

// Execution 2: Simulated Process Death & Reopen triggering completion again
const secondRun = recordCompletion(session, mockStorage, mockAnalytics);
assert.strictEqual(secondRun.status, "ALREADY_CREDITED");
assert.strictEqual(secondRun.credited, false);
// Verify minutes DID NOT double
assert.strictEqual(totalCreditedMinutes, 25);
console.log("✔ Step 2: Idempotency Guard stopped duplicate crediting (Total remains 25 mins).");

// Execution 3: New separate session
const newSession = {
    sessionId: "sess_20261022_9877",
    durationMinutes: 15,
    activityType: "reading"
};
const thirdRun = recordCompletion(newSession, mockStorage, mockAnalytics);
assert.strictEqual(thirdRun.status, "CREDITED_SUCCESSFULLY");
assert.strictEqual(totalCreditedMinutes, 40);
console.log("✔ Step 3: Legitimate new session credited accurately (Total is now 40 mins).");

console.log("--- All Mission 002 Tests PASSED (GREEN) ---");
