const assert = require('assert');
const {
    validateSoundMetadata,
    playSoundChannel,
    stopAllSoundChannels,
    activeChannels,
    stopSoundChannel,
    setSoundChannelVolume
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
    localPath: "audio/gentle_rain.ogg",
    approved_for_runtime: true,
    sha256: "a".repeat(64),
    licenseEvidenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/"
};
const resOk = validateSoundMetadata(verifiedSound);
assert.strictEqual(resOk.valid, true);
console.log("✔ Test 3: Explicitly approved metadata accepted (not proof of media licence).");

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


const unapproved = validateSoundMetadata({...verifiedSound, id: "quarantine", approved_for_runtime: false});
assert.strictEqual(unapproved.valid, false, "Quarantined recordings must never play");
const unspecifiedApproval = validateSoundMetadata({...verifiedSound, id: "unspecified", approved_for_runtime: undefined});
assert.strictEqual(unspecifiedApproval.valid, false, "Unreviewed metadata must fail closed");
const invalidDigest = validateSoundMetadata({...verifiedSound, sha256: "not-a-sha"});
assert.strictEqual(invalidDigest.valid, false, "A pinned 64-character SHA256 is required");
const invalidRights = validateSoundMetadata({...verifiedSound, licenseEvidenceUrl: undefined});
assert.strictEqual(invalidRights.valid, false, "A licence evidence URL is required");

let pauseCalls = 0;
const htmlAudio = {currentTime: 12, pause(){pauseCalls++}, play(){}};
playSoundChannel({...verifiedSound,id:"native-html-audio"},()=>htmlAudio, mockTimer);
assert.strictEqual(stopSoundChannel("native-html-audio").status, "STOPPED");
assert.strictEqual(pauseCalls, 1, "HTMLAudioElement must be paused, not only stopped");
assert.strictEqual(htmlAudio.currentTime, 0, "HTMLAudioElement playback position must reset");
assert.strictEqual(activeChannels.size, 0);

const badPlayerResult = playSoundChannel(
  {...verifiedSound,id:"broken-player"}, () => undefined, mockTimer);
assert.strictEqual(badPlayerResult.status, "AUDIO_FAILED_SAFELY_ISOLATED");
assert.strictEqual(activeChannels.has("broken-player"), false,
  "Factory returning undefined must not leave a ghost entry");

const volumeAudio = {play(){},pause(){},volume:1};
playSoundChannel({...verifiedSound,id:"volume-audio"},()=>volumeAudio,mockTimer);
assert.strictEqual(setSoundChannelVolume("volume-audio",0.3).status,"VOLUME_UPDATED");
assert.strictEqual(volumeAudio.volume,0.3);
assert.strictEqual(setSoundChannelVolume("volume-audio",5).status,"INVALID_VOLUME");
assert.strictEqual(volumeAudio.volume,0.3);
stopAllSoundChannels();

(async () => {
  const rejectedAudio = { play(){return Promise.reject(new Error("Autoplay denied"));}, pause(){}, currentTime:0 };
  playSoundChannel({...verifiedSound,id:"rejected-audio"},()=>rejectedAudio,mockTimer);
  await Promise.resolve();
  await Promise.resolve();
  assert.strictEqual(activeChannels.has("rejected-audio"),false,
    "Async rejected playback must not leave a ghost channel");
  console.log("--- All Mission #008 Nature Audio Tests PASSED (GREEN) ---");
})().catch(error=>{console.error(error);process.exitCode=1});

