const assert = require('assert');
const Purifier = require('../android/app/src/main/assets/web/js/studio_audio_purifier_engine.js');

console.log("--- Running 🎯 Mission #072: Studio Audio Purifier Tests ---");

// Test 1: Anti-clipping headroom ceiling (Strict <= 0.85)
{
  assert.strictEqual(Purifier.clampSafeGain(1.0), 0.85, "1.0 gain must clamp down to 0.85 safe ceiling");
  assert.strictEqual(Purifier.clampSafeGain(1.5), 0.85, "Excessive gain must clamp to 0.85");
  assert.strictEqual(Purifier.clampSafeGain(-0.2), 0.0);
  assert.strictEqual(Purifier.clampSafeGain(0.6), 0.6);
  console.log("✓ Test 1: Anti-clipping safe headroom ceiling strictly enforced.");
}

// Test 2: Anti-pop smooth envelope ramp eliminates sudden jumps
{
  const ramp = Purifier.calculateEnvelopeRamp(0.0, 0.7, 10.0, 0.08);
  assert.strictEqual(ramp.startTime, 10.0);
  assert.strictEqual(ramp.endTime, 10.08);
  assert.strictEqual(ramp.startVal, 0.0);
  assert.strictEqual(ramp.targetVal, 0.7);
  assert.strictEqual(ramp.isAntiPopGuarded, true);
  console.log("✓ Test 2: Anti-pop smooth envelope ramp calculation verified.");
}

// Test 3: Catalog verification: 100% Free of music / Pure nature & bells only
{
  const catalogCheck = Purifier.verifyMusicFreeCatalog();
  assert.strictEqual(catalogCheck.isCompletelyMusicFree, true, "Must have zero musical songs or synth tunes");
  assert.strictEqual(catalogCheck.isZeroCopyright, true, "100% Zero copyright liability");
  assert.ok(catalogCheck.pureNatureCount >= 8);
  assert.ok(catalogCheck.pureAcousticBellsCount >= 4);
  console.log("✓ Test 3: Zero-music & pure acoustic nature/chimes catalog verified.");
}

// Test 4: Master limiter configuration constants
{
  const cfg = Purifier.MASTER_LIMITER_CONFIG;
  assert.strictEqual(cfg.threshold, -6.0);
  assert.strictEqual(cfg.ratio, 8.0);
  assert.ok(cfg.attack <= 0.005, "Fast attack catches loud peaks instantly");
  console.log("✓ Test 4: Master dynamics compressor/limiter settings verified.");
}

// Test 5: Default bell is 'zen_harmonic_chime'
{
  const bells = Purifier.PURE_ACOUSTIC_BELLS;
  const def = bells.find(b => b.isDefault);
  assert.ok(def, "Must have a default bell");
  assert.strictEqual(def.id, "zen_harmonic_chime");
  assert.strictEqual(def.baseHz, 528);
  console.log("✓ Test 5: Default harmonic bell (528Hz natural resonance) verified.");
}

console.log("--- All Mission #072 Tests PASSED (GREEN) ---");
