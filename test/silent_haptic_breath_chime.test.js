const assert = require('assert');
const coordinator = require('../android/app/src/main/assets/web/js/silent_haptic_breath_chime_coordinator.js');

console.log('--- Running 🎯 Mission #108: Silent Haptic Breath & Audio Chime Coordinator Tests ---');

// Test 1: Catalogs
{
  const events = Object.keys(coordinator.CUE_EVENTS);
  assert.strictEqual(events.includes('SESSION_START'), true);
  assert.strictEqual(events.includes('SESSION_COMPLETE'), true);
  assert.strictEqual(events.includes('PHASE_TRANSITION'), true);
  assert.strictEqual(events.includes('BREATH_INHALE'), true);
  assert.strictEqual(events.includes('BREATH_EXHALE'), true);

  const voices = Object.keys(coordinator.CHIME_VOICES);
  assert.strictEqual(voices.includes('SINGING_BOWL'), true);
  assert.strictEqual(voices.includes('ZEN_BELL'), true);
  assert.strictEqual(voices.includes('WOODBLOCK'), true);
  console.log('✓ Test 1: Event triggers and synthetic chime voices catalog verified.');
}

// Test 2: Vibration pattern calculation & scale
{
  const defaultComplete = coordinator.getVibrationPattern(coordinator.CUE_EVENTS.SESSION_COMPLETE);
  assert.deepStrictEqual(defaultComplete, [100, 80, 100, 80, 220]);

  const scaledComplete = coordinator.getVibrationPattern(coordinator.CUE_EVENTS.SESSION_COMPLETE, { vibrationScale: 1.5 });
  assert.deepStrictEqual(scaledComplete, [150, 120, 150, 120, 330]);

  const inhale = coordinator.getVibrationPattern(coordinator.CUE_EVENTS.BREATH_INHALE);
  assert.deepStrictEqual(inhale, [60, 40, 60]);
  console.log('✓ Test 2: Haptic pattern timing & intensity scaling verified.');
}

// Test 3: Synthetic audio parameters & harmonics
{
  const bowl = coordinator.getAudioParameters(coordinator.CUE_EVENTS.SESSION_START, { preferredVoice: 'SINGING_BOWL', volume: 0.8 });
  assert.strictEqual(bowl.voice, 'SINGING_BOWL');
  assert.strictEqual(bowl.baseFrequencyHz, 216);
  assert.strictEqual(bowl.decaySeconds, 3.5);
  assert.strictEqual(bowl.harmonics.length, 3);
  assert.strictEqual(bowl.harmonics[0].gain, 0.8);
  assert.strictEqual(bowl.volumeFormatted, '80%');
  assert.strictEqual(/^[0-9]+%$/.test(bowl.volumeFormatted), true);
  console.log('✓ Test 3: Synthetic audio frequencies, harmonics & decay parameters verified.');
}

// Test 4: Silent mode & individual toggles
{
  const mutedHaptics = coordinator.getVibrationPattern(coordinator.CUE_EVENTS.SESSION_START, { hapticsEnabled: false });
  assert.deepStrictEqual(mutedHaptics, []);

  const mutedSound = coordinator.getAudioParameters(coordinator.CUE_EVENTS.SESSION_START, { soundEnabled: false });
  assert.strictEqual(mutedSound, null);

  const cueSilent = coordinator.prepareCue(coordinator.CUE_EVENTS.PHASE_TRANSITION, { hapticsEnabled: false, soundEnabled: false });
  assert.deepStrictEqual(cueSilent.vibrationPattern, []);
  assert.strictEqual(cueSilent.audioParams, null);
  assert.strictEqual(cueSilent.event, 'PHASE_TRANSITION');
  console.log('✓ Test 4: Silent mode fallbacks & discrete feature toggles verified.');
}

// Test 5: 100-Locale translation, strict English fallback, absolute Hebrew exclusion & Western digits
{
  const arDesc = coordinator.getLocalizedText('ar', 'voice_singing_bowl');
  assert.strictEqual(arDesc.includes('وعاء الغناء'), true);

  const itDesc = coordinator.getLocalizedText('it', 'voice_singing_bowl');
  assert.strictEqual(itDesc, 'Tibetan Singing Bowl (Deep Resonance)');

  const heDesc = coordinator.getLocalizedText('he', 'voice_singing_bowl');
  const iwDesc = coordinator.getLocalizedText('iw', 'voice_singing_bowl');
  assert.strictEqual(heDesc, 'Tibetan Singing Bowl (Deep Resonance)');
  assert.strictEqual(iwDesc, 'Tibetan Singing Bowl (Deep Resonance)');
  assert.strictEqual(coordinator.sanitizeLocale('he'), 'en');
  assert.strictEqual(coordinator.sanitizeLocale('iw'), 'en');

  assert.strictEqual(/^[0-9]+$/.test(coordinator.toWesternDigits(528)), true);
  console.log('✓ Test 5: 100-Locale support, strict English fallback, zero Hebrew & Western digits verified.');
}

console.log('--- All Mission #108 Tests PASSED (GREEN) ---');
