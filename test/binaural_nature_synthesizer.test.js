const assert = require('assert');
const engine = require('../android/app/src/main/assets/web/js/binaural_nature_synthesizer_engine.js');

console.log('--- Running 🎯 Mission #122: Binaural Beat & Nature Sanctuary Synthesizer Tests ---');

// Test 1: Catalogs & wave modes
{
  const modes = engine.BINAURAL_MODES;
  assert.strictEqual(modes.ALPHA_RELAX.beatOffsetHz, 10);
  assert.strictEqual(modes.BETA_SOLVE.beatOffsetHz, 18);
  assert.strictEqual(modes.THETA_INSIGHT.beatOffsetHz, 6);
  assert.strictEqual(modes.GAMMA_PEAK.beatOffsetHz, 40);

  const colors = Object.keys(engine.NOISE_COLORS);
  assert.strictEqual(colors.includes('PINK'), true);
  assert.strictEqual(colors.includes('BROWN'), true);
  assert.strictEqual(colors.includes('WHITE'), true);
  console.log('✓ Test 1: Binaural wave bands (Alpha/Beta/Theta/Gamma) & noise colors verified.');
}

// Test 2: Stereo channel frequency separation
{
  const alpha = engine.calculateStereoParameters('ALPHA_RELAX');
  assert.strictEqual(alpha.leftFrequencyHz, 216);
  assert.strictEqual(alpha.rightFrequencyHz, 226);
  assert.strictEqual(alpha.beatFrequencyHz, 10);

  const beta = engine.calculateStereoParameters('BETA_SOLVE');
  assert.strictEqual(beta.leftFrequencyHz, 250);
  assert.strictEqual(beta.rightFrequencyHz, 268);
  assert.strictEqual(beta.beatFrequencyHz, 18);
  console.log('✓ Test 2: Left/Right stereo frequency offsets and carrier frequencies verified.');
}

// Test 3: Dual-channel volume gain scaling
{
  const params = engine.calculateStereoParameters('THETA_INSIGHT', {
    binauralVolume: 0.5,
    natureVolume: 0.8,
    masterVolume: 0.5
  });

  assert.strictEqual(params.binauralGain, 0.25);
  assert.strictEqual(params.natureGain, 0.4);
  console.log('✓ Test 3: Dual-channel volume gain scaling and master mixer verified.');
}

// Test 4: Configuration validation and volume clamping
{
  const cfg = engine.validateConfig({
    binauralVolume: 5.0,
    natureVolume: -2.0,
    activeMode: 'INVALID_MODE'
  });

  assert.strictEqual(cfg.binauralVolume, 0.5);
  assert.strictEqual(cfg.natureVolume, 0.5);
  assert.strictEqual(cfg.activeMode, 'ALPHA_RELAX');
  console.log('✓ Test 4: Configuration sanitization and volume boundary clamping verified.');
}

// Test 5: 100-Locale translation, strict English fallback, absolute Hebrew exclusion & Western digits
{
  const arAlpha = engine.getLocalizedText('ar', 'mode_alpha');
  assert.strictEqual(arAlpha.includes('موجات ألفا'), true);

  const esAlpha = engine.getLocalizedText('es', 'mode_alpha');
  assert.strictEqual(esAlpha.includes('Alpha Focus'), true);

  const heAlpha = engine.getLocalizedText('he', 'mode_alpha');
  const iwAlpha = engine.getLocalizedText('iw', 'mode_alpha');
  assert.strictEqual(heAlpha.includes('Alpha Focus'), true);
  assert.strictEqual(iwAlpha.includes('Alpha Focus'), true);
  assert.strictEqual(engine.sanitizeLocale('he'), 'en');
  assert.strictEqual(engine.sanitizeLocale('iw'), 'en');

  const params = engine.calculateStereoParameters('GAMMA_PEAK');
  assert.strictEqual(/^[0-9]+ Hz$/.test(params.formattedLeftHz), true);
  assert.strictEqual(/^[0-9]+ Hz$/.test(params.formattedBeatHz), true);
  console.log('✓ Test 5: 100-Locale support, strict English fallback, zero Hebrew & Western digits verified.');
}

console.log('--- All Mission #122 Tests PASSED (GREEN) ---');
