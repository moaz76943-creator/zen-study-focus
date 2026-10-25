const assert = require('assert');
const engine = require('../android/app/src/main/assets/web/js/ambient_light_night_vision_engine.js');

console.log('--- Running 🎯 Mission #109: Ambient Light & Night Vision Auto-Dim Tests ---');

// Test 1: Lighting profiles catalog
{
  const profiles = engine.PROFILES;
  assert.strictEqual(profiles.DAY_BRIGHT.colorTempK, 6500);
  assert.strictEqual(profiles.INDOOR_BALANCED.colorTempK, 5500);
  assert.strictEqual(profiles.DIM_EVENING.colorTempK, 4000);
  assert.strictEqual(profiles.NIGHT_VISION_MONO.colorTempK, 2200);
  assert.strictEqual(profiles.NIGHT_VISION_MONO.blueReductionPct, 90);
  console.log('✓ Test 1: Lighting profiles & Kelvin color temperatures verified.');
}

// Test 2: Sensor-driven Lux resolution
{
  assert.strictEqual(engine.resolveProfile(500, 12).id, 'DAY_BRIGHT');
  assert.strictEqual(engine.resolveProfile(120, 12).id, 'INDOOR_BALANCED');
  assert.strictEqual(engine.resolveProfile(30, 12).id, 'DIM_EVENING');
  assert.strictEqual(engine.resolveProfile(4, 12).id, 'NIGHT_VISION_MONO');
  console.log('✓ Test 2: Ambient sensor Lux-based boundary resolution verified.');
}

// Test 3: Circadian time-of-day schedule fallback
{
  assert.strictEqual(engine.isNightHours(23, 22, 6), true);
  assert.strictEqual(engine.isNightHours(2, 22, 6), true);
  assert.strictEqual(engine.isNightHours(14, 22, 6), false);

  assert.strictEqual(engine.resolveProfile(null, 23).id, 'NIGHT_VISION_MONO');
  assert.strictEqual(engine.resolveProfile(null, 19).id, 'DIM_EVENING');
  assert.strictEqual(engine.resolveProfile(null, 10).id, 'DAY_BRIGHT');
  console.log('✓ Test 3: Circadian time schedule fallback & night window verified.');
}

// Test 4: CSS variable generation with strict Western digits
{
  const cssNight = engine.generateCssVariables(engine.PROFILES.NIGHT_VISION_MONO);
  assert.strictEqual(cssNight['--zen-dim-brightness'], '0.55');
  assert.strictEqual(cssNight['--zen-dim-contrast'], '1.15');
  assert.strictEqual(cssNight['--zen-color-temperature'], '2200K');
  assert.strictEqual(cssNight['--zen-blue-reduction'], '90%');
  assert.strictEqual(cssNight['--zen-night-mono-active'], '1');

  assert.strictEqual(/^[0-9]+(\.[0-9]+)?$/.test(cssNight['--zen-dim-brightness']), true);
  assert.strictEqual(/^[0-9]+K$/.test(cssNight['--zen-color-temperature']), true);
  console.log('✓ Test 4: Dynamic CSS variable injection & Western digits verified.');
}

// Test 5: 100-Locale translation, strict English fallback & zero Hebrew
{
  const arDesc = engine.getLocalizedText('ar', 'profile_night_vision_mono');
  assert.strictEqual(arDesc.includes('رؤية ليلية'), true);

  const esDesc = engine.getLocalizedText('es', 'profile_night_vision_mono');
  assert.strictEqual(esDesc, 'Night Vision (Deep Red/Amber Mono 2200K)');

  const heDesc = engine.getLocalizedText('he', 'profile_night_vision_mono');
  const iwDesc = engine.getLocalizedText('iw', 'profile_night_vision_mono');
  assert.strictEqual(heDesc, 'Night Vision (Deep Red/Amber Mono 2200K)');
  assert.strictEqual(iwDesc, 'Night Vision (Deep Red/Amber Mono 2200K)');
  assert.strictEqual(engine.sanitizeLocale('he'), 'en');
  assert.strictEqual(engine.sanitizeLocale('iw'), 'en');
  console.log('✓ Test 5: 100-Locale support, strict English fallback & zero Hebrew verified.');
}

console.log('--- All Mission #109 Tests PASSED (GREEN) ---');
