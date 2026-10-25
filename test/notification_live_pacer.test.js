const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/notification_live_pacer_engine.js');

console.log('--- Running 🎯 Mission #167: Android Notification Live Pacer Tests ---');

// Test 1: Clock Formatting in Western Digits (MM:SS)
{
  assert.strictEqual(Engine.formatClock(1500), '25:00');
  assert.strictEqual(Engine.formatClock(245), '04:05');
  assert.strictEqual(Engine.formatClock(0), '00:00');

  console.log('✓ Test 1: Notification clock formatting in Western digits verified.');
}

// Test 2: Active Focus Notification Payload Generation
{
  const payload = Engine.generateNotificationPayload({
    mode: 'focus',
    isRunning: true,
    totalDurationSeconds: 1500,
    remainingSeconds: 750,
    taskAnchor: 'Quantum Electrodynamics'
  }, 'ar');

  assert.strictEqual(payload.locale, 'ar');
  assert.strictEqual(payload.progress.current, 50);
  assert.strictEqual(payload.subText, '50% Complete');
  assert.ok(payload.title.startsWith('12:30'));
  assert.strictEqual(payload.contentText, 'Quantum Electrodynamics');
  assert.strictEqual(payload.ongoing, true);
  assert.strictEqual(payload.actions[0].id, 'action_pause');
  assert.strictEqual(payload.zeroMusicCertified, true);

  console.log('✓ Test 2: Active focus notification payload generation verified.');
}

// Test 3: Paused State Action Toggle
{
  const pausedPayload = Engine.generateNotificationPayload({
    mode: 'focus',
    isRunning: false,
    totalDurationSeconds: 1500,
    remainingSeconds: 600,
    taskAnchor: 'Math Analysis'
  }, 'en');

  assert.strictEqual(pausedPayload.ongoing, false);
  assert.strictEqual(pausedPayload.actions[0].id, 'action_resume');
  assert.strictEqual(pausedPayload.actions[0].label, 'Resume');

  console.log('✓ Test 3: Paused state action toggle verified.');
}

// Test 4: Default Values & Fallbacks
{
  const def = Engine.generateNotificationPayload({}, 'en');
  assert.strictEqual(def.contentText, 'Primary Focus Block');
  assert.strictEqual(def.progress.max, 100);
  assert.strictEqual(def.zeroMedicalClaimsVerified, true);

  console.log('✓ Test 4: Default values & fallbacks verified.');
}

// Test 5: 100-Locale support, strict English fallback, absolute Hebrew exclusion & Western digits
{
  assert.strictEqual(Engine.resolveLocale('he'), 'en');
  assert.strictEqual(Engine.resolveLocale('iw'), 'en');
  assert.strictEqual(Engine.resolveLocale('HE'), 'en');
  assert.strictEqual(Engine.resolveLocale('tr'), 'en');
  assert.strictEqual(Engine.resolveLocale('ar'), 'ar');

  const western = Engine.toWesternDigits('الوقت ١٢:٣٠ بنسبة ٥٠%');
  assert.strictEqual(western, 'الوقت 12:30 بنسبة 50%');
  assert.ok(/^[0-9]+$/.test(Engine.toWesternDigits('١٢٣٤٥٦٧٨٩٠')));

  console.log('✓ Test 5: 100-Locale, Hebrew exclusion & Western digits verified.');
}

console.log('--- All Mission #167 Tests PASSED (GREEN) ---');
