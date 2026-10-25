const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/natural_soundscape_sanctuary_engine.js');

console.log('--- Running 🎯 Mission #157: Natural Soundscape Sanctuary Tests ---');

// Test 1: 8 Natural Soundscapes Directory Verification (Zero Music Policy)
{
  const keys = Object.keys(Engine.SOUNDSCAPES);
  assert.strictEqual(keys.length, 8);
  assert.ok(keys.includes('deep_rain_forest'));
  assert.ok(keys.includes('coastal_ocean_swell'));
  assert.ok(keys.includes('mountain_pine_breeze'));
  assert.ok(keys.includes('flowing_pebble_brook'));
  assert.ok(keys.includes('crackling_cedar_hearth'));
  assert.ok(keys.includes('night_desert_solitude'));
  assert.ok(keys.includes('autumn_leaf_rustle'));
  assert.ok(keys.includes('ancient_stone_library'));

  console.log('✓ Test 1: 8 organic natural soundscapes directory verified.');
}

// Test 2: Natural Layer Creation & Ear-Safety Gain Limiter (-6.0 dB Ceiling)
{
  const layerNormal = Engine.createNaturalLayer('deep_rain_forest', 50);
  assert.strictEqual(layerNormal.soundscapeId, 'deep_rain_forest');
  assert.strictEqual(layerNormal.volumePercent, 50);
  assert.strictEqual(layerNormal.formattedVolume, '50%');
  assert.strictEqual(layerNormal.zeroMusicCertified, true);
  assert.ok(layerNormal.gainDb <= -6.0);

  const layerMax = Engine.createNaturalLayer('crackling_cedar_hearth', 100);
  assert.strictEqual(layerMax.gainDb, -6.0);
  assert.strictEqual(layerMax.formattedGain, '-6.0 dB');

  console.log('✓ Test 2: Natural layer creation and safety gain limiter verified.');
}

// Test 3: Multi-Layer Blending (Up to 3 Organic Layers)
{
  const mix = Engine.blendNaturalSoundscapes([
    { soundscapeId: 'deep_rain_forest', volumePercent: 80 },
    { soundscapeId: 'crackling_cedar_hearth', volumePercent: 60 },
    { soundscapeId: 'mountain_pine_breeze', volumePercent: 40 },
    { soundscapeId: 'coastal_ocean_swell', volumePercent: 50 }
  ], 85);

  assert.strictEqual(mix.activeLayersCount, 3);
  assert.strictEqual(mix.layers.length, 3);
  assert.strictEqual(mix.formattedMasterVolume, '85%');
  assert.strictEqual(mix.zeroMusicCertified, true);
  assert.ok(mix.masterGainDb <= -6.0);

  console.log('✓ Test 3: Multi-layer natural blending (capped at 3) verified.');
}

// Test 4: Comprehensive Sanctuary Report Generation & Zero Music Guarantee
{
  const report = Engine.generateSanctuaryReport({
    layers: [
      { soundscapeId: 'flowing_pebble_brook', volumePercent: 70 },
      { soundscapeId: 'ancient_stone_library', volumePercent: 50 }
    ],
    masterVolume: 75
  }, 'ar');

  assert.strictEqual(report.locale, 'ar');
  assert.strictEqual(report.certification.zeroMusicPolicyVerified, true);
  assert.strictEqual(report.zeroMedicalClaimsVerified, true);
  assert.strictEqual(report.mixOverview.totalLayers, '2');
  assert.ok(report.mixOverview.layers[0].title.includes('جدول مائي'));

  console.log('✓ Test 4: Comprehensive sanctuary report & zero music guarantee verified.');
}

// Test 5: 100-Locale support, strict English fallback, absolute Hebrew exclusion & Western digits
{
  assert.strictEqual(Engine.resolveLocale('he'), 'en');
  assert.strictEqual(Engine.resolveLocale('iw'), 'en');
  assert.strictEqual(Engine.resolveLocale('HE'), 'en');
  assert.strictEqual(Engine.resolveLocale('da'), 'en');
  assert.strictEqual(Engine.resolveLocale('ar'), 'ar');

  const western = Engine.toWesternDigits('مستوى الصوت ٨٥% وكسب -٦.٠ dB لعدد ٣ طبقات');
  assert.strictEqual(western, 'مستوى الصوت 85% وكسب -6.0 dB لعدد 3 طبقات');
  assert.ok(/^[0-9]+$/.test(Engine.toWesternDigits('١٢٣٤٥٦٧٨٩٠')));

  console.log('✓ Test 5: 100-Locale, Hebrew exclusion & Western digits verified.');
}

console.log('--- All Mission #157 Tests PASSED (GREEN) ---');
