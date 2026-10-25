const assert = require('assert');
const {
    triggerCompletionAlert,
    resetAlertCache
} = require('../android/app/src/main/assets/web/js/completion_alerts_guard.js');

console.log("--- Running 🎯 Mission #017: Completion Alerts Tests ---");

resetAlertCache();

let playCount = 0;
let lastPlayedSound = null;
const mockAudioDriver = {
    playAlert: (sound, vol) => {
        playCount++;
        lastPlayedSound = sound;
    }
};

const session = { sessionId: "sess_focus_9988" };

// Test 1: Normal Calm Alert (Bell)
const res1 = triggerCompletionAlert(session, { soundName: "bell", volume: 0.8 }, mockAudioDriver);
assert.strictEqual(res1.played, true);
assert.strictEqual(res1.status, "ALERT_PLAYED");
assert.strictEqual(lastPlayedSound, "bell");
assert.strictEqual(playCount, 1);
console.log("✔ Test 1: Initial calm alert played successfully.");

// Test 2: Duplicate Alert Suppression (Must NEVER chime twice for same session)
const resDuplicate = triggerCompletionAlert(session, { soundName: "bell", volume: 0.8 }, mockAudioDriver);
assert.strictEqual(resDuplicate.played, false);
assert.strictEqual(resDuplicate.status, "DUPLICATE_ALERT_SUPPRESSED");
assert.strictEqual(playCount, 1, "Play count must NOT increment for duplicate alert call!");
console.log("✔ Test 2: Duplicate completion alert strictly suppressed for same session ID.");

// Test 3: Respect Silent Mode
const silentSession = { sessionId: "sess_focus_9989" };
const resSilent = triggerCompletionAlert(silentSession, { soundName: "silent" }, mockAudioDriver);
assert.strictEqual(resSilent.played, false);
assert.strictEqual(resSilent.status, "SILENT_HONORED");
assert.strictEqual(playCount, 1);
console.log("✔ Test 3: Silent mode setting strictly honored.");

// Test 4: Respect Do Not Disturb (DND)
const dndSession = { sessionId: "sess_focus_9990" };
const resDnd = triggerCompletionAlert(dndSession, { soundName: "wood_chime", dndActive: true }, mockAudioDriver);
assert.strictEqual(resDnd.played, false);
assert.strictEqual(resDnd.status, "DND_HONORED");
assert.strictEqual(playCount, 1);
console.log("✔ Test 4: Do Not Disturb (DND) strictly honored.");

// Test 5: Audio Exception Isolation
const errorSession = { sessionId: "sess_focus_9991" };
const failingDriver = {
    playAlert: () => { throw new Error("Audio buffer resource unavailable"); }
};
const resError = triggerCompletionAlert(errorSession, { soundName: "water_drop" }, failingDriver);
assert.strictEqual(resError.played, false);
assert.strictEqual(resError.status, "AUDIO_FAILED_SAFELY_FALLBACK_VISUAL");
console.log("✔ Test 5: Audio failure safely caught without breaking session flow.");

console.log("--- All Mission #017 Completion Alerts Tests PASSED (GREEN) ---");
