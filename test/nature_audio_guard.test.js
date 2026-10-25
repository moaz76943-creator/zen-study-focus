const assert = require('assert');
const {
    validateSoundMetadata,
    playSoundChannel,
    stopAllSoundChannels,
    activeChannels
} = require('../android/app/src/main/assets/web/js/nature_audio_guard.js');

console.log("--- Running 🎯 Mission #008: Nature Audio Guard Tests ---");

// Test 1: Reject sound with missing license
const badSound = {
    id: "random_rain",
    title: "Rain Sound",
    localPath: "audio/rain.ogg"
    // Missing license & sourceUrl
};
const resBad = validateSoundMetadata(badSound);
assert.strictEqual(resBad.valid, false);
assert.strictEqual(resBad.reason, "UNLICENSED_OR_PROPRIETARY_AUDIO_BLOCKED");
console.log("✔ Test 1: Sound without valid license strictly blocked.");

// Test 2: Reject sound with unknown source origin
const unverifiedSourceSound = {
    id: "forest_birds",
    title: "Forest Birds",
    license: "CC-BY",
    localPath: "audio/birds.ogg"
    // Missing sourceUrl
};
const resSource = validateSoundMetadata(unverifiedSourceSound);
assert.strictEqual(resSource.valid, false);
assert.strictEqual(resSource.reason, "UNKNOWN_PROVENANCE_SOURCE_URL_MISSING");
console.log("✔ Test 2: Sound lacking source URL provenance blocked.");

// Test 3: Accept verified sound with complete legal provenance
const verifiedSound = {
    id: "gentle_rain_cc0",
    title: "Gentle Rain",
    license: "CC0",
    sourceUrl: "https://freesound.org/people/sample/sounds/12345/",
    localPath: "audio/gentle_rain.ogg"
};
const resOk = validateSoundMetadata(verifiedSound);
assert.strictEqual(resOk.valid, true);
console.log("✔ Test 3: Verified CC0 sound certified.");

// Test 4: Audio Exception Isolation (Timer must NOT crash when audio fails)
const failingFactory = () => {
    throw new Error("Android AudioFlinger resource busy");
};
const mockTimer = { isRunning: () => true };

const resIsolated = playSoundChannel(verifiedSound, failingFactory, mockTimer);
assert.strictEqual(resIsolated.status, "AUDIO_FAILED_SAFELY_ISOLATED");
assert.strictEqual(resIsolated.timerAffected, false);
assert.strictEqual(resIsolated.timerRunning, true);
console.log("✔ Test 4: Audio exception cleanly isolated from Timer Engine.");

// Test 5: Player Leak Prevention on Rapid Switch
let stoppedCount = 0;
const mockPlayerFactory = () => ({
    loop: false,
    play: () => {},
    stop: () => { stoppedCount++; }
});

playSoundChannel(verifiedSound, mockPlayerFactory, mockTimer);
assert.strictEqual(activeChannels.size, 1);

// Play same channel again (Simulate rapid restart)
playSoundChannel(verifiedSound, mockPlayerFactory, mockTimer);
assert.strictEqual(stoppedCount, 1, "Previous player must be stopped before starting new");
assert.strictEqual(activeChannels.size, 1, "Channel map must maintain exactly 1 active instance");
console.log("✔ Test 5: Player leak prevented on rapid switching.");

stopAllSoundChannels();
assert.strictEqual(activeChannels.size, 0);
console.log("✔ Test 6: Stop all channels cleaned active resources completely.");

console.log("--- All Mission #008 Nature Audio Tests PASSED (GREEN) ---");
