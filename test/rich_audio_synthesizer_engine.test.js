const assert = require('assert');
const AudioSynth = require('../android/app/src/main/assets/web/js/rich_audio_synthesizer_engine.js');

console.log("--- Running 🎯 Mission #071: Rich Audio Synthesizer & Alerts Tests ---");

// Test 1: Verify 12 Rich Nature Sounds catalog
{
  assert.strictEqual(AudioSynth.NATURE_SOUNDS_CATALOG.length, 12, "Must provide 12 distinct nature sounds");
  const ids = AudioSynth.NATURE_SOUNDS_CATALOG.map(s => s.id);
  assert.ok(ids.includes("gentle_rain"));
  assert.ok(ids.includes("heavy_rain"));
  assert.ok(ids.includes("ocean_waves"));
  assert.ok(ids.includes("campfire_crackle"));
  assert.ok(ids.includes("brown_noise"));
  console.log("✓ Test 1: 12 Rich Nature Sounds catalog verified.");
}

// Test 2: Verify 9 Completion Alerts across Gentle, Medium, and Loud tiers
{
  assert.strictEqual(AudioSynth.COMPLETION_ALERTS_CATALOG.length, 9, "Must provide 9 completion alerts");
  
  const gentle = AudioSynth.getAlertsByTier("gentle");
  const medium = AudioSynth.getAlertsByTier("medium");
  const loud = AudioSynth.getAlertsByTier("loud");

  assert.strictEqual(gentle.length, 3, "3 gentle alerts");
  assert.strictEqual(medium.length, 3, "3 medium alerts");
  assert.strictEqual(loud.length, 3, "3 loud alerts");
  assert.strictEqual(loud[0].peakGain, 1.0, "Loud alerts must have max 1.0 peak gain");
  console.log("✓ Test 2: 9 Completion Alerts (3 Gentle, 3 Medium, 3 Loud) verified.");
}

// Test 3: Verify Active Default is 'zen_harmonic_chime'
{
  const def = AudioSynth.getDefaultCompletionAlert();
  assert.strictEqual(def.id, "zen_harmonic_chime");
  assert.strictEqual(def.isDefault, true);
  assert.strictEqual(def.tier, "gentle");

  // Only 1 alert should be marked as default
  const defaultsCount = AudioSynth.COMPLETION_ALERTS_CATALOG.filter(a => a.isDefault).length;
  assert.strictEqual(defaultsCount, 1, "Strictly one active default alert");
  console.log("✓ Test 3: Active Default ('zen_harmonic_chime') verified while others stay in list.");
}

// Test 4: Fallback to default when unknown alert ID is requested
{
  const fallback = AudioSynth.getCompletionAlertById("non_existent_sound");
  assert.strictEqual(fallback.id, "zen_harmonic_chime");
  console.log("✓ Test 4: Safe fallback to default harmonic chime verified.");
}

// Test 5: 100% Royalty-Free & Zero Copyright Claim Audit
{
  const audit = AudioSynth.auditAudioLicensing();
  assert.strictEqual(audit.totalAssets, 21, "12 nature + 9 completion = 21 total sound presets");
  assert.strictEqual(audit.royaltyFreeVerified, true);
  assert.strictEqual(audit.unlicensedCount, 0);
  console.log("✓ Test 5: 100% Procedural Royalty-Free licensing verified across all 21 sounds.");
}

console.log("--- All Mission #071 Tests PASSED (GREEN) ---");
