const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/quiet_personalization_engine.js');

console.log("--- Running 🎯 Mission #035: Quiet Sound Balance Tests ---");

// Test 1: Preset application & channel assignment
{
  let profile = Engine.createDefaultProfile();
  profile = Engine.applyPreset(profile, "rainy_library");
  
  assert.strictEqual(profile.activeSoundscape, "rainy_library");
  assert.strictEqual(profile.channels.rain, 0.6);
  assert.strictEqual(profile.channels.white_noise, 0.2);
  assert.strictEqual(profile.channels.stream, 0.0);
  console.log("✓ Test 1: Soundscape preset application verified.");
}

// Test 2: Safe volume clamping (Strict 0.0 to 1.0)
{
  assert.strictEqual(Engine.clampVolume(-0.4), 0.0);
  assert.strictEqual(Engine.clampVolume(1.8), 1.0);
  assert.strictEqual(Engine.clampVolume(NaN), 0.0);
  assert.strictEqual(Engine.clampVolume(0.556), 0.56);
  console.log("✓ Test 2: Strict volume clamping & NaN immunity verified.");
}

// Test 3: Mute toggle & effective volume calculation
{
  let profile = Engine.createDefaultProfile();
  profile = Engine.applyPreset(profile, "calm_forest"); // stream: 0.5, master: 0.8
  
  let effVol = Engine.getEffectiveVolume(profile, "stream");
  assert.strictEqual(effVol, 0.4, "Effective volume must equal stream * master (0.5 * 0.8)");

  profile = Engine.toggleMute(profile);
  assert.strictEqual(profile.muted, true);
  assert.strictEqual(Engine.getEffectiveVolume(profile, "stream"), 0.0, "Muted must output 0.0");

  profile = Engine.toggleMute(profile);
  assert.strictEqual(profile.muted, false);
  assert.strictEqual(Engine.getEffectiveVolume(profile, "stream"), 0.4, "Un-muted must restore ratio");
  console.log("✓ Test 3: Mute toggle & channel ratio preservation verified.");
}

// Test 4: Gentle fade calculation & defensive sanitization
{
  const steps = Engine.calculateFadeSteps(0.0, 0.8, 200, 50); // 4 steps
  assert.strictEqual(steps.length, 4);
  assert.strictEqual(steps[steps.length - 1], 0.8, "Fade target must reach 0.8");

  const corruptProfile = { masterVolume: "invalid", channels: { rain: 999, stream: "corrupt" } };
  const sanitized = Engine.sanitizeProfile(corruptProfile);
  assert.strictEqual(sanitized.masterVolume, 0.8, "Invalid master volume must revert to safe default 0.8");
  assert.strictEqual(sanitized.channels.rain, 1.0, "Out-of-range volume must clamp to 1.0");
  assert.strictEqual(sanitized.channels.stream, 0.0, "Corrupt channel must retain default 0.0");
  console.log("✓ Test 4: Gentle audio fade steps & defensive sanitization verified.");
}

console.log("--- All Mission #035 Quiet Sound Balance Tests PASSED (GREEN) ---");
