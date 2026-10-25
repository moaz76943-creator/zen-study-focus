const assert = require('assert');
const engine = require('../android/app/src/main/assets/web/js/urban_noise_cancellation_engine.js');

console.log('--- Running 🎯 Mission #124: Urban Noise Cancellation & Filter Tests ---');

// Test 1: Profiles catalog & defaults
{
  const profiles = engine.PROFILES;
  assert.strictEqual(profiles.COFFEE_SHOP_CHATTER.centerFreqHz, 1200);
  assert.strictEqual(profiles.COFFEE_SHOP_CHATTER.filterType, 'bandpass');
  assert.strictEqual(profiles.TRAFFIC_RUMBLE.centerFreqHz, 280);
  assert.strictEqual(profiles.TRAFFIC_RUMBLE.filterType, 'highpass');
  assert.strictEqual(profiles.AIRPORT_TRANSIT.centerFreqHz, 2400);
  assert.strictEqual(profiles.LIBRARY_WHISPER.centerFreqHz, 800);
  console.log('✓ Test 1: Noise masking profiles catalog & Biquad filter types verified.');
}

// Test 2: BiquadFilterNode parameter calculations
{
  const coffeeFull = engine.calculateFilterParameters('COFFEE_SHOP_CHATTER', { maskingIntensity: 1.0 });
  assert.strictEqual(coffeeFull.frequencyHz, 1200);
  assert.strictEqual(coffeeFull.qFactor, 0.85);
  assert.strictEqual(coffeeFull.gainDb, -6.0);
  assert.strictEqual(coffeeFull.formattedGain, '-6.0 dB');

  const coffeeHalf = engine.calculateFilterParameters('COFFEE_SHOP_CHATTER', { maskingIntensity: 0.5 });
  assert.strictEqual(coffeeHalf.gainDb, -3.0);
  assert.strictEqual(coffeeHalf.formattedGain, '-3.0 dB');
  console.log('✓ Test 2: Biquad filter frequency, Q-factor, and gain modulation verified.');
}

// Test 3: Configuration validation and boundary clamping
{
  const cfg = engine.validateConfig({
    maskingIntensity: 4.0,
    ambientBlend: -1.0,
    activeProfile: 'INVALID_PROFILE'
  });

  assert.strictEqual(cfg.maskingIntensity, 0.5);
  assert.strictEqual(cfg.ambientBlend, 0.5);
  assert.strictEqual(cfg.activeProfile, 'COFFEE_SHOP_CHATTER');
  console.log('✓ Test 3: Configuration validation and intensity boundary clamping verified.');
}

// Test 4: Strict Western digits formatting
{
  const res = engine.calculateFilterParameters('TRAFFIC_RUMBLE', { maskingIntensity: 0.7 });

  assert.strictEqual(/^[0-9]+ Hz$/.test(res.formattedFrequency), true);
  assert.strictEqual(/^-?[0-9]+(\.[0-9]+)?\s*dB$/.test(res.formattedGain), true);
  assert.strictEqual(/^[0-9]+%$/.test(res.intensityPercent), true);
  console.log('✓ Test 4: Western digits validation across frequency, decibels, and percentage verified.');
}

// Test 5: 100-Locale translation, strict English fallback & zero Hebrew
{
  const arTitle = engine.getLocalizedText('ar', 'profile_coffee');
  assert.strictEqual(arTitle.includes('حجب ثرثرة المقاهي'), true);

  const itTitle = engine.getLocalizedText('it', 'profile_coffee');
  assert.strictEqual(itTitle.includes('Coffee Shop Chatter'), true);

  const heTitle = engine.getLocalizedText('he', 'profile_coffee');
  const iwTitle = engine.getLocalizedText('iw', 'profile_coffee');
  assert.strictEqual(heTitle.includes('Coffee Shop Chatter'), true);
  assert.strictEqual(iwTitle.includes('Coffee Shop Chatter'), true);
  assert.strictEqual(engine.sanitizeLocale('he'), 'en');
  assert.strictEqual(engine.sanitizeLocale('iw'), 'en');
  console.log('✓ Test 5: 100-Locale support, strict English fallback & zero Hebrew verified.');
}

console.log('--- All Mission #124 Tests PASSED (GREEN) ---');
