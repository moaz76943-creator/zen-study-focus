/**
 * DEEP FOCUS — Test Suite: Smart Flip & Proximity Sensor Coordinator (M098)
 * File: test/flip_sensor_coordinator.test.js
 */

const assert = require('assert');
const Coordinator = require('../android/app/src/main/assets/web/js/flip_sensor_coordinator.js');

console.log('--- Running 🎯 Mission #098: Smart Flip Sensor Coordinator Tests ---');

// Test 1: Orientation State Calculation
try {
  assert.strictEqual(Coordinator.calculateOrientationState(175, 2), Coordinator.SENSOR_STATES.FACE_DOWN);
  assert.strictEqual(Coordinator.calculateOrientationState(-170, -5), Coordinator.SENSOR_STATES.FACE_DOWN);

  assert.strictEqual(Coordinator.calculateOrientationState(10, 5), Coordinator.SENSOR_STATES.FACE_UP);
  assert.strictEqual(Coordinator.calculateOrientationState(-5, -2), Coordinator.SENSOR_STATES.FACE_UP);

  assert.strictEqual(Coordinator.calculateOrientationState(80, 20), Coordinator.SENSOR_STATES.UNKNOWN);
  assert.strictEqual(Coordinator.calculateOrientationState(NaN, 0), Coordinator.SENSOR_STATES.UNKNOWN);

  console.log('✓ Test 1: Orientation state calculation (face-down vs face-up angles) verified.');
} catch (err) {
  console.error('✗ Test 1 Failed:', err.message);
  process.exit(1);
}

// Test 2: Configurable Actions (Flip to Pause vs Flip to Focus)
try {
  Coordinator.clearListeners();
  let receivedEvent = null;
  Coordinator.onFlip(function(evt) {
    receivedEvent = evt;
  });

  Coordinator.setAction(Coordinator.FLIP_ACTIONS.FLIP_TO_PAUSE);
  Coordinator.setEnabled(true);

  let res = Coordinator.handleOrientationEvent(0, 0);

  res = Coordinator.handleOrientationEvent(178, 0);
  assert.strictEqual(res.handled, true);
  assert.strictEqual(res.event.triggeredAction, 'pause_session');
  assert.strictEqual(receivedEvent.triggeredAction, 'pause_session');
  assert(res.event.hapticCue.length > 0, 'Haptic cue must be present');

  console.log('✓ Test 2: Configurable action dispatch (Flip to Pause / Resume) verified.');
} catch (err) {
  console.error('✗ Test 2 Failed:', err.message);
  process.exit(1);
}

// Test 3: Debounce & Jitter Guard
try {
  const rapidEvent = Coordinator.handleOrientationEvent(0, 0);
  assert.strictEqual(rapidEvent.handled, false);
  assert.strictEqual(rapidEvent.reason, 'debounced', 'Rapid sensor events must be debounced within 500ms');

  console.log('✓ Test 3: 500ms debounce guard preventing sensor flutter verified.');
} catch (err) {
  console.error('✗ Test 3 Failed:', err.message);
  process.exit(1);
}

// Test 4: Multi-Language & Strict English Fallback
try {
  const summaryAr = Coordinator.getLocalizedSummary('ar');
  assert(summaryAr.actionLabel.includes('قلب الهاتف'), 'Arabic action label must be resolved');

  const summaryEs = Coordinator.getLocalizedSummary('es');
  assert(summaryEs.actionLabel.includes('Voltear'), 'Spanish action label must be resolved');

  const summaryFallback = Coordinator.getLocalizedSummary('unsupported_locale');
  assert.strictEqual(summaryFallback.actionLabel, 'Flip to Pause / Mute', 'Must fallback to English');

  console.log('✓ Test 4: Multi-language status labels & strict English fallback verified.');
} catch (err) {
  console.error('✗ Test 4 Failed:', err.message);
  process.exit(1);
}

// Test 5: Strict Western Arabic Digits & Hebrew Exclusion
try {
  const summary = Coordinator.getLocalizedSummary('ar');
  const easternDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const fullText = JSON.stringify(summary);

  easternDigits.forEach(d => {
    assert(!fullText.includes(d), `Summary must not contain Eastern digit ${d}`);
  });

  const summaryHe = Coordinator.getLocalizedSummary('he');
  assert.strictEqual(summaryHe.actionLabel, 'Flip to Pause / Mute', 'Hebrew must strictly fallback to English');
  assert(!JSON.stringify(summaryHe).includes('עבריت'), 'Must exclude Hebrew');

  console.log('✓ Test 5: Strict Western digits (0123456789) & Hebrew exclusion verified.');
  console.log('--- All Mission #098 Tests PASSED (GREEN) ---');
} catch (err) {
  console.error('✗ Test 5 Failed:', err.message);
  process.exit(1);
}
