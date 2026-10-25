const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/universal_gesture_tactile_orchestrator_engine.js');

console.log('--- Running 🎯 Mission #173: Universal Gesture & Tactile Tests ---');

// Test 1: Haptic Patterns Catalogue Verification
{
  assert.deepStrictEqual(Engine.HAPTIC_PATTERNS.session_start, [60, 40, 60]);
  assert.deepStrictEqual(Engine.HAPTIC_PATTERNS.session_complete, [150, 100, 150, 100, 200]);
  assert.deepStrictEqual(Engine.HAPTIC_PATTERNS.exam_milestone, [400]);
  assert.ok(Object.keys(Engine.HAPTIC_PATTERNS).length >= 7);

  console.log('✓ Test 1: Haptic patterns catalogue verified.');
}

// Test 2: Successful Dispatch and Timestamp Update
{
  const res = Engine.dispatchHapticEvent('session_start', 0, false);
  assert.strictEqual(res.dispatched, true);
  assert.strictEqual(res.statusKey, 'haptic_dispatched');
  assert.deepStrictEqual(res.pattern, [60, 40, 60]);
  assert.ok(res.lastTimestamp > 0);

  console.log('✓ Test 2: Successful tactile dispatch verified.');
}

// Test 3: Motor Burnout Cooldown Protection (250ms Throttle)
{
  const now = Date.now();
  const throttled = Engine.dispatchHapticEvent('session_pause', now, false);
  assert.strictEqual(throttled.dispatched, false);
  assert.strictEqual(throttled.statusKey, 'cooldown_throttled');
  assert.deepStrictEqual(throttled.pattern, []);

  console.log('✓ Test 3: Motor burnout cooldown protection verified.');
}

// Test 4: Power Saver Mute Override & Comprehensive Report
{
  const muted = Engine.dispatchHapticEvent('session_start', 0, true);
  assert.strictEqual(muted.dispatched, false);
  assert.strictEqual(muted.statusKey, 'haptics_muted');

  const report = Engine.generateOrchestratorReport(14, 'ar');
  assert.strictEqual(report.locale, 'ar');
  assert.strictEqual(report.catalogue.eventsDispatchedToday, '14');
  assert.strictEqual(report.motorProtection.zeroMusicPolicyVerified, true);
  assert.strictEqual(report.zeroMedicalClaimsVerified, true);

  console.log('✓ Test 4: Mute override and comprehensive report verified.');
}

// Test 5: 100-Locale support, strict English fallback, absolute Hebrew exclusion & Western digits
{
  assert.strictEqual(Engine.resolveLocale('he'), 'en');
  assert.strictEqual(Engine.resolveLocale('iw'), 'en');
  assert.strictEqual(Engine.resolveLocale('HE'), 'en');
  assert.strictEqual(Engine.resolveLocale('pl'), 'en');
  assert.strictEqual(Engine.resolveLocale('ar'), 'ar');

  const western = Engine.toWesternDigits('مهلة التهدئة ٢٥٠ms لعدد ١٤ حدثاً');
  assert.strictEqual(western, 'مهلة التهدئة 250ms لعدد 14 حدثاً');
  assert.ok(/^[0-9]+$/.test(Engine.toWesternDigits('١٢٣٤٥٦٧٨٩٠')));

  console.log('✓ Test 5: 100-Locale, Hebrew exclusion & Western digits verified.');
}

console.log('--- All Mission #173 Tests PASSED (GREEN) ---');
