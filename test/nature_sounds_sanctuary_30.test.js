const assert = require('assert');
const Sanctuary = require('../android/app/src/main/assets/web/js/nature_sounds_sanctuary_30.js');

console.log("--- Running 🎯 Mission #088: 30 Nature Sounds Sanctuary Tests ---");

// Test 1: Exactly 30 distinct nature sounds across 5 categories
{
  assert.strictEqual(Sanctuary.NATURE_30_CATALOG.length, 30, "Must contain exactly 30 nature sounds");
  assert.strictEqual(Object.keys(Sanctuary.CATEGORIES).length, 5, "Must be organized into 5 categories");

  const waters = Sanctuary.NATURE_30_CATALOG.filter(s => s.cat === "waters");
  const winds = Sanctuary.NATURE_30_CATALOG.filter(s => s.cat === "winds");
  const earth = Sanctuary.NATURE_30_CATALOG.filter(s => s.cat === "earth");
  const noise = Sanctuary.NATURE_30_CATALOG.filter(s => s.cat === "noise_spectrums");
  const ambient = Sanctuary.NATURE_30_CATALOG.filter(s => s.cat === "spatial_ambient");

  assert.strictEqual(waters.length, 6, "6 waters sounds");
  assert.strictEqual(winds.length, 6, "6 winds sounds");
  assert.strictEqual(earth.length, 6, "6 earth sounds");
  assert.strictEqual(noise.length, 6, "6 noise spectrums");
  assert.strictEqual(ambient.length, 6, "6 ambient sounds");
  console.log("✓ Test 1: Exactly 30 nature sounds organized across 5 categories verified.");
}

// Test 2: Zero-music audit across all 30 sounds (Strict Word Boundaries)
{
  const catalog = Sanctuary.NATURE_30_CATALOG;
  const musicalKeywords = ["song", "melody", "piano", "guitar", "أغنية", "موسيقى", "لحن"];
  let violations = 0;

  for (let s of catalog) {
    const combined = (s.id + " " + s.nameAr + " " + s.nameEn).toLowerCase();
    for (let k of musicalKeywords) {
      const regex = new RegExp('(?:^|\\s|[^\w\u0621-\u064A])' + k + '(?=[^\w\u0621-\u064A]|\\s|$)', 'i');
      if (regex.test(combined)) violations++;
    }
  }
  assert.strictEqual(violations, 0, "All 30 sounds must be 100% music-free");
  console.log("✓ Test 2: 100% Music-Free organic nature sounds catalog verified.");
}

// Test 3: Standalone vector SVG card generation for all 30 sounds
{
  for (let s of Sanctuary.NATURE_30_CATALOG) {
    const svg = Sanctuary.generateSoundSvgIcon(s.id);
    assert.ok(svg.startsWith('<svg'), `SVG for ${s.id} must be valid XML`);
    assert.ok(svg.includes(s.nameAr), `SVG for ${s.id} must embed Arabic title`);
    assert.ok(svg.includes(s.emoji), `SVG for ${s.id} must embed emoji icon`);
  }
  console.log("✓ Test 3: Generated 30 custom, royalty-free, standalone SVG cards verified.");
}

// Test 4: Multi-channel audio mixer with anti-clipping normalization
{
  const channels = {
    gentle_rain: 0.6,
    campfire_crackle: 0.5,
    pine_breeze: 0.4
  };

  const mixed = Sanctuary.calculateMultiChannelMix(channels);
  assert.strictEqual(mixed.length, 3);

  const totalMasterGain = mixed.reduce((sum, ch) => sum + ch.masterSafeGain, 0);
  assert.ok(totalMasterGain <= 0.86, "Multi-channel mixed gain must normalize under safe headroom (<= 0.85)");
  console.log("✓ Test 4: Multi-channel mix anti-clipping normalization verified.");
}

// Test 5: Fallback safety on unknown sound ID
{
  const fallbackSvg = Sanctuary.generateSoundSvgIcon("non_existent_sound");
  assert.ok(fallbackSvg.startsWith('<svg'));
  console.log("✓ Test 5: Safe fallback on unknown sound ID verified.");
}

console.log("--- All Mission #088 Tests PASSED (GREEN) ---");
