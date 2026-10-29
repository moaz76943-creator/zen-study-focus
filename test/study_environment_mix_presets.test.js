/**
 * DEEP FOCUS — Test Suite: Study Environment Mix Presets Engine (M089)
 * File: test/study_environment_mix_presets.test.js
 */

const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/study_environment_mix_presets_engine.js');

console.log('--- Running 🎯 Mission #089: Study Environment Mix Presets Tests ---');

// Test 1: Verify exactly 8 curated study environment presets
try {
  const presets = Engine.getPresets();
  assert.strictEqual(presets.length, 8, 'Must provide exactly 8 curated presets');

  const requiredIds = [
    'quiet_library',
    'study_cafe',
    'forest_cabin',
    'deep_noise_isolation',
    'zen_sanctuary',
    'midnight_study_train',
    'autumn_wilderness',
    'coastal_deep_flow'
  ];

  requiredIds.forEach(id => {
    const found = presets.find(p => p.id === id);
    assert(found, `Preset ${id} must exist`);
    assert(found.name_ar && found.name_ar.length > 0, `Preset ${id} must have Arabic name`);
    assert(found.name_en && found.name_en.length > 0, `Preset ${id} must have English name`);
    assert(Array.isArray(found.channels) && found.channels.length >= 3, `Preset ${id} must have at least 3 channels`);
  });

  console.log('✓ Test 1: Exactly 8 curated study environment presets verified.');
} catch (err) {
  console.error('✗ Test 1 Failed:', err.message);
  process.exit(1);
}

// Test 2: 100% Music-Free Organic Sounds Verification
try {
  const presets = Engine.getPresets();
  const knownSounds = new Set(Engine.VALID_SOUND_IDS);
  assert.strictEqual(knownSounds.size, 30, 'Must have exactly 30 recognized organic sound IDs');

  const forbiddenTokens = ['song', 'melody', 'music', 'tune', 'rhythm_beat', 'synth', 'piano', 'guitar', 'instrument'];

  presets.forEach(p => {
    const validation = Engine.validatePreset(p);
    assert(validation.valid, `Preset ${p.id} must be valid: ${validation.error}`);

    p.channels.forEach(ch => {
      assert(knownSounds.has(ch.soundId), `Channel sound ${ch.soundId} in preset ${p.id} must belong to 30 nature sounds`);
      forbiddenTokens.forEach(token => {
        const regex = new RegExp(`(^|_)${token}(_|$)`, 'i');
        assert(!regex.test(ch.soundId), `Sound ID ${ch.soundId} must not contain musical token ${token}`);
      });
    });
  });

  console.log('✓ Test 2: 100% Music-Free organic sounds & nature catalog verified.');
} catch (err) {
  console.error('✗ Test 2 Failed:', err.message);
  process.exit(1);
}

// Test 3: Anti-Clipping Headroom Protection & Normalization
try {
  const overloadedChannels = [
    { soundId: 'gentle_rain', volume: 1.0 },
    { soundId: 'forest_stream', volume: 1.0 },
    { soundId: 'deep_brown_noise', volume: 1.0 }
  ];

  const normalized = Engine.calculateNormalizedGains(overloadedChannels, 1.0);
  assert(normalized.totalNormalizedSum <= Engine.MASTER_HEADROOM_CEILING + 0.001,
    `Total normalized sum (${normalized.totalNormalizedSum}) must never exceed headroom (${Engine.MASTER_HEADROOM_CEILING})`);

  const applied = Engine.applyPreset('deep_noise_isolation', 1.0);
  assert.strictEqual(applied.presetId, 'deep_noise_isolation');
  assert(applied.activeChannels.length === 4, 'Must have 4 active channels');
  
  let appliedSum = 0;
  applied.activeChannels.forEach(ch => {
    appliedSum += ch.normalizedGain;
  });
  assert(appliedSum <= Engine.MASTER_HEADROOM_CEILING + 0.001,
    `Applied preset channels sum (${appliedSum}) must not clip headroom ceiling (${Engine.MASTER_HEADROOM_CEILING})`);

  console.log('✓ Test 3: Anti-Clipping headroom limiter (<= 0.85) & normalization verified.');
} catch (err) {
  console.error('✗ Test 3 Failed:', err.message);
  process.exit(1);
}

// Test 4: Customization and Safe Fallbacks
try {
  const fallback = Engine.getPresetById('non_existent_id');
  assert.strictEqual(fallback.id, 'quiet_library', 'Must fallback to quiet_library on unknown ID');

  const customized = Engine.customizePreset('quiet_library', [
    { soundId: 'rainy_library', volume: 0.8 },
    { soundId: 'clock_pendulum', volume: 0.0 }
  ]);

  const rainyCh = customized.channels.find(c => c.soundId === 'rainy_library');
  const clockCh = customized.channels.find(c => c.soundId === 'clock_pendulum');
  assert.strictEqual(rainyCh.volume, 0.8, 'Custom volume must be applied');
  assert.strictEqual(clockCh.volume, 0.0, 'Muted channel volume must be 0');

  console.log('✓ Test 4: Safe preset customization and fallback handling verified.');
} catch (err) {
  console.error('✗ Test 4 Failed:', err.message);
  process.exit(1);
}

// Test 5: Procedural SVG Vector Card Rendering
try {
  const svg = Engine.renderPresetCardSVG('quiet_library', { lang: 'ar', width: 400, height: 250 });
  assert(typeof svg === 'string', 'Render must return string');
  assert(svg.startsWith('<svg'), 'Must produce valid SVG markup');
  assert(svg.endsWith('</svg>'), 'Must terminate with closing svg tag');
  assert(svg.includes('المكتبة الهادئة'), 'Must embed Arabic title');
  assert(svg.includes('NATURE SOUND BLENDS'), 'Must display nature blends section');
  assert(!svg.includes('data:image/'), 'Must not contain external raster bitmaps');
  assert(!svg.includes('<image'), 'Must not contain external raster image elements');
  assert(!svg.includes('href="http'), 'Must not load external HTTP assets');

  console.log('✓ Test 5: Procedural royalty-free vector SVG card rendering verified.');
  console.log('--- All Mission #089 Tests PASSED (GREEN) ---');
} catch (err) {
  console.error('✗ Test 5 Failed:', err.message);
  process.exit(1);
}
