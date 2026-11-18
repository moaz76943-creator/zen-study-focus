// Audio noise regression guard (v629)
// Validates:
//   1. Zero-autoplay: AudioContext must NOT be created on page load without user gesture
//   2. Master mute on hidden tab: master gain must be set to 0 on visibilitychange
//   3. DC block at 40Hz: protects transducer coils & brown noise rumble
//   4. Truly instant stop: AudioCore voice stop() must disconnect synchronously
//   5. No master unmute race: stopAllAudio must NOT auto-unmute after a delay
//   6. Master gain immediately muted on stopAllVoices
//
// This guard ensures the constant static/hiss/background noise fixes cannot regress.

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const WEB_DIR = path.resolve(__dirname, '../android/app/src/main/assets/web');
const APP_JS = path.join(WEB_DIR, 'app.js');
const AUDIO_CORE = path.join(WEB_DIR, 'modules/audio/audio_core.js');
const SPATIAL_STUDIO = path.join(WEB_DIR, 'modules/audio/spatial_acoustic_studio.js');

const failures = [];

function check(name, fn) {
  try {
    fn();
    console.log('PASS: ' + name);
  } catch (e) {
    console.error('FAIL: ' + name + ' - ' + e.message);
    failures.push({ name: name, error: e.message });
  }
}

// 1. Zero-autoplay: AudioContext must NOT be created on page load without user gesture
check('Zero-autoplay on startup', () => {
  const appJs = fs.readFileSync(APP_JS, 'utf8');
  assert(appJs.includes('AudioCore.bindGesture'), 'AudioCore.bindGesture must be called to gate AudioContext creation');
  assert(appJs.includes('AudioContext creation requires user gesture'), 'Must gate AudioContext creation on user gesture');
  const defIdx = appJs.indexOf('function ensureProceduralAudioContext');
  assert(defIdx !== -1, 'ensureProceduralAudioContext function must exist');
  const defEnd = appJs.indexOf('\n}', defIdx) + 2;
  const fnBody = appJs.substring(defIdx, defEnd);
  assert(fnBody.includes('audioContextCreationAllowed && !isNodeEnv'), 'Must check gesture gate inside ensureProceduralAudioContext');
});

// 2. Master mute on hidden tab (never auto-unmute on visible)
check('Master mute on hidden tab', () => {
  const appJs = fs.readFileSync(APP_JS, 'utf8');
  assert(appJs.includes('visibilitychange'), 'Must listen for visibilitychange');
  assert(appJs.includes('dfMasterAudioMute'), 'Must define dfMasterAudioMute');
  // Must NOT unmute on visible/pageshow (zero-autoplay on tab switch)
  // Verify that the visibilitychange handler at the top of the file only mutes on hidden,
  // and does NOT call dfMasterAudioUnmute when visible
  // The outer visibilitychange handler (near line 80799) mutes on document.hidden
  const outerHandler = /document\.addEventListener\('visibilitychange'/;
  assert(outerHandler.test(appJs), 'Must have visibilitychange event listener');
  // The handler checks document.hidden and calls dfMasterAudioMute - no unmute on visible
  const muteOnHidden = /addEventListener\s*\(\s*['"]visibilitychange['"][\s\S]*?document\.hidden[\s\S]*?dfMasterAudioMute/;
  assert(muteOnHidden.test(appJs), 'Must have handler that mutes on document.hidden');
  // Verify the handler does NOT also call dfMasterAudioUnmute in the same block
  // Use a bounded window: check within the handler's own function body only
  const handlers = appJs.split('addEventListener').slice(1);
  let foundUnmuteInVisibilityHandler = false;
  for (const h of handlers) {
    const block = h.substring(0, 500); // first 500 chars of handler body
    if (block.includes('document.hidden') && block.includes('dfMasterAudioUnmute')) {
      foundUnmuteInVisibilityHandler = true;
    }
  }
  assert(!foundUnmuteInVisibilityHandler, 'Must NOT have handler that unmutes in same block');
  
  // Also check for auto-unmute on tab visibility (the real violation)
  const autoUnmuteOnVisible = /if\s*\(\s*!document\.hidden\s*\)\s*[^;]*;\s*attemptResume\("visibilitychange"\)/;
  assert(!autoUnmuteOnVisible.test(appJs), 'Must NOT have visibilitychange handler that auto-unmutes on visible tab');
});

// 3. DC block at 40Hz
check('DC block at 40Hz in AudioCore', () => {
  const audioCore = fs.readFileSync(AUDIO_CORE, 'utf8');
  assert(audioCore.includes('DC_BLOCK_HZ = 40'), 'AudioCore DC_BLOCK_HZ must be 40');
});

check('DC block at 40Hz in spatial_acoustic_studio', () => {
  const spatial = fs.readFileSync(SPATIAL_STUDIO, 'utf8');
  assert(spatial.includes('DC_BLOCK_HZ'), 'spatial_acoustic_studio must reference DC_BLOCK_HZ');
  assert(spatial.includes(': 40'), 'spatial_acoustic_studio must default DC_BLOCK_HZ to 40');
});

// 4. Truly instant stop in AudioCore (synchronous disconnect, no setTimeout deferral)
check('Truly instant stop in AudioCore', () => {
  const audioCore = fs.readFileSync(AUDIO_CORE, 'utf8');
  const stopIdx = audioCore.indexOf('function stop()');
  assert(stopIdx !== -1, 'stop() function must exist');
  const postStop = audioCore.substring(stopIdx);
  // The old buggy pattern deferred the node disconnect into a setTimeout closure.
  assert(!postStop.includes('setTimeout(() => {'), 'stop() must NOT defer disconnect via setTimeout');
  assert(postStop.includes('source.disconnect()'), 'stop() must disconnect source synchronously');
});

// 5. No master unmute race in stopAllAudio
check('No master unmute race in stopAllAudio', () => {
  const appJs = fs.readFileSync(APP_JS, 'utf8');
  const unmuteRace = /muteMaster\(true\)[\s\S]{0,300}?setTimeout\s*\(\s*\(\s*\)\s*=>\s*window\.AudioCore\.muteMaster\(false\)/;
  assert(!unmuteRace.test(appJs), 'stopAllAudio must NOT auto-unmute after a delay (race condition)');
});

// 6. Master gain muted on stop (fast 30ms ramp = click-free instant stop)
check('Master gain muted on stop', () => {
  const audioCore = fs.readFileSync(AUDIO_CORE, 'utf8');
  const stopAllIdx = audioCore.indexOf('function stopAllVoices()');
  assert(stopAllIdx !== -1, 'stopAllVoices() must exist');
  const stopAllEnd = audioCore.indexOf('\n  }', stopAllIdx) + 4;
  const stopAllBody = audioCore.substring(stopAllIdx, stopAllEnd);
  // Must cancel scheduled values and ramp master to 0 (fast 30ms = click-free instant)
  assert(stopAllBody.includes('cancelScheduledValues'), 'stopAllVoices() must cancel scheduled values');
  assert(stopAllBody.includes('linearRampToValueAtTime(0'), 'stopAllVoices() must ramp master to 0 (fast click-free)');
});

// Summary
if (failures.length > 0) {
  console.error('\nAudio noise regression guard: ' + failures.length + ' check(s) failed');
  failures.forEach(function (f) { console.error('  - ' + f.name + ': ' + f.error); });
  process.exit(1);
}

console.log('\nAll audio noise regression guards passed');
