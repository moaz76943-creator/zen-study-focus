const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/acoustic_noise_binaural_engine.js');

console.log('--- Running 🎯 Mission #141: Non-Musical Acoustic Noise & Binaural Tests ---');

// Test 1: Binaural Differential Carrier Calculation (Pure Sine, Zero Music)
{
  const alpha = Engine.calculateBinauralTuning('alpha');
  assert.strictEqual(alpha.beatHz, 10);
  assert.strictEqual(alpha.carrierHz, 216);
  assert.strictEqual(alpha.leftChannelHz, 211);
  assert.strictEqual(alpha.rightChannelHz, 221);
  assert.strictEqual(alpha.formattedBeat, '10 Hz');
  assert.strictEqual(alpha.zeroMusicCertified, true);

  const theta = Engine.calculateBinauralTuning('theta');
  assert.strictEqual(theta.beatHz, 6);

  const beta = Engine.calculateBinauralTuning('beta');
  assert.strictEqual(beta.beatHz, 15);

  console.log('✓ Test 1: Binaural differential calculation & zero-music guarantee verified.');
}

// Test 2: Natural Noise Spectra & Auditory Safety Gain Limiter
{
  const brown = Engine.calculateNoiseConfiguration('brown', -12);
  assert.strictEqual(brown.noiseType, 'brown');
  assert.strictEqual(brown.gainDb, -12);
  assert.strictEqual(brown.formattedGain, '-12.0 dB');

  const clamped = Engine.calculateNoiseConfiguration('pink', 2.0);
  assert.strictEqual(clamped.gainDb, -6.0);
  assert.strictEqual(clamped.formattedGain, '-6.0 dB');
  assert.strictEqual(clamped.safetyLimiterApplied, true);

  console.log('✓ Test 2: Natural noise spectra & auditory safety gain limiter verified.');
}

// Test 3: Comprehensive Acoustic Profile Generation
{
  const profile = Engine.generateAcousticProfile('alpha', 'brown', -10, 'ar');
  assert.strictEqual(profile.locale, 'ar');
  assert.strictEqual(profile.certification.zeroMusicPolicyVerified, true);
  assert.strictEqual(profile.certification.zeroMedicalClaimsVerified, true);
  assert.ok(profile.binaural.differential.includes('10 Hz'));
  assert.ok(profile.noise.safeGain.includes('dB'));

  console.log('✓ Test 3: Comprehensive Acoustic Profile generation verified.');
}

// Test 4: Strict Non-Musical Architecture Verification
{
  assert.strictEqual(Engine.BINAURAL_PRESETS.alpha.carrierHz, 216);
  assert.strictEqual(Engine.NOISE_PRESETS.white.spectralSlopeDbPerOctave, 0.0);
  assert.strictEqual(Engine.NOISE_PRESETS.brown.spectralSlopeDbPerOctave, -6.0);
  assert.strictEqual(Engine.NOISE_PRESETS.pink.spectralSlopeDbPerOctave, -3.0);

  console.log('✓ Test 4: Pure mathematical signal architecture verified.');
}

// Test 5: 100-Locale support, strict English fallback, absolute Hebrew exclusion & Western digits
{
  assert.strictEqual(Engine.resolveLocale('he'), 'en');
  assert.strictEqual(Engine.resolveLocale('iw'), 'en');
  assert.strictEqual(Engine.resolveLocale('HE'), 'en');
  assert.strictEqual(Engine.resolveLocale('tr'), 'en');
  assert.strictEqual(Engine.resolveLocale('ar'), 'ar');

  const western = Engine.toWesternDigits('تردد ٢١٦ Hz وكسب -١٢.٠ dB');
  assert.strictEqual(western, 'تردد 216 Hz وكسب -12.0 dB');
  assert.ok(/^[0-9]+$/.test(Engine.toWesternDigits('١٢٣٤٥٦٧٨٩٠')));

  console.log('✓ Test 5: 100-Locale, Hebrew exclusion & Western digits verified.');
}

console.log('--- All Mission #141 Tests PASSED (GREEN) ---');
