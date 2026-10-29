const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/flip_to_focus_gesture_engine.js');

console.log('--- Running 🎯 Mission #145: Flip-to-Focus Gesture Tests ---');

// Test 1: Sensor Orientation Evaluation (Flat Face Down & Face Up)
{
  const faceDown = Engine.evaluateSensorOrientation(-9.8, true);
  assert.strictEqual(faceDown.isFaceDown, true);
  assert.strictEqual(faceDown.isFaceUp, false);
  assert.strictEqual(faceDown.transitional, false);

  const faceUp = Engine.evaluateSensorOrientation(9.8, false);
  assert.strictEqual(faceUp.isFaceDown, false);
  assert.strictEqual(faceUp.isFaceUp, true);

  const tilted = Engine.evaluateSensorOrientation(-3.0, true);
  assert.strictEqual(tilted.isFaceDown, false);
  assert.strictEqual(tilted.transitional, true);

  console.log('✓ Test 1: Sensor orientation evaluation verified.');
}

// Test 2: Debounced Gesture Transition (1500ms Threshold)
{
  const rawDown = { isFaceDown: true, isFaceUp: false, transitional: false };

  const fast = Engine.processGestureTransition(rawDown, 'standby', 800);
  assert.strictEqual(fast.finalState, 'debouncing');
  assert.strictEqual(fast.action, 'await_stability');
  assert.strictEqual(fast.screenDimToBlack, false);

  const stable = Engine.processGestureTransition(rawDown, 'standby', 1600);
  assert.strictEqual(stable.finalState, 'face_down');
  assert.strictEqual(stable.action, 'start_or_resume_timer');
  assert.deepStrictEqual(stable.hapticPattern, [70, 50, 70]);
  assert.strictEqual(stable.screenDimToBlack, true);

  console.log('✓ Test 2: Debounced gesture transition verified.');
}

// Test 3: Face-Up Release Transition
{
  const rawUp = { isFaceDown: false, isFaceUp: true, transitional: false };
  const lifted = Engine.processGestureTransition(rawUp, 'face_down', 600);
  assert.strictEqual(lifted.finalState, 'face_up');
  assert.strictEqual(lifted.action, 'pause_and_summarize');
  assert.deepStrictEqual(lifted.hapticPattern, [50]);
  assert.strictEqual(lifted.screenDimToBlack, false);

  console.log('✓ Test 3: Face-up release transition verified.');
}

// Test 4: Comprehensive Gesture Report & Zero Music Guarantee
{
  const report = Engine.generateFlipGestureReport({
    accelZ: -9.81,
    isNearProximity: true
  }, 1800, 'standby', 'ar');

  assert.strictEqual(report.locale, 'ar');
  assert.strictEqual(report.gestureState, 'face_down');
  assert.strictEqual(report.screenBlackoutProtection, true);
  assert.strictEqual(report.zeroMusicCertified, true);
  assert.strictEqual(report.zeroMedicalClaimsVerified, true);
  assert.ok(report.sensorMetrics.zAxisAcceleration.includes('m/s²'));
  assert.ok(report.sensorMetrics.stableMilliseconds.includes('ms'));

  console.log('✓ Test 4: Comprehensive Gesture Report verified.');
}

// Test 5: 100-Locale support, strict English fallback, absolute Hebrew exclusion & Western digits
{
  assert.strictEqual(Engine.resolveLocale('he'), 'en');
  assert.strictEqual(Engine.resolveLocale('iw'), 'en');
  assert.strictEqual(Engine.resolveLocale('HE'), 'en');
  assert.strictEqual(Engine.resolveLocale('el'), 'en');
  assert.strictEqual(Engine.resolveLocale('ar'), 'ar');

  const western = Engine.toWesternDigits('تسارع -٩.٨١ m/s² واستقرار ١٨٠٠ms');
  assert.strictEqual(western, 'تسارع -9.81 m/s² واستقرار 1800ms');
  assert.ok(/^[0-9]+$/.test(Engine.toWesternDigits('١٢٣٤٥٦٧٨٩٠')));

  console.log('✓ Test 5: 100-Locale, Hebrew exclusion & Western digits verified.');
}

console.log('--- All Mission #145 Tests PASSED (GREEN) ---');
