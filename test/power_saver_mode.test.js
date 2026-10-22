/**
 * DEEP FOCUS — Test Suite: Low-Battery Power Saver Mode Engine (M094)
 * File: test/power_saver_mode.test.js
 */

const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/power_saver_mode_engine.js');

console.log('--- Running 🎯 Mission #094: Low-Battery Power Saver Mode Tests ---');

// Test 1: Auto-Detection Logic & Thresholds
try {
  Engine.setMode(Engine.MODES.AUTO);
  Engine.setThresholdPercent(20);

  let s = Engine.updateBatteryStatus(0.80, false);
  assert.strictEqual(s.isActive, false, '80% discharging should be standard performance');

  s = Engine.updateBatteryStatus(0.18, false);
  assert.strictEqual(s.isActive, true, '18% discharging must engage power saver');
  assert.strictEqual(s.batteryPercent, 18);

  s = Engine.updateBatteryStatus(0.18, true);
  assert.strictEqual(s.isActive, false, 'Charging device should disengage power saver');

  console.log('✓ Test 1: Auto-detection thresholds (<= 20% & discharging) verified.');
} catch (err) {
  console.error('✗ Test 1 Failed:', err.message);
  process.exit(1);
}

// Test 2: Manual Override Modes & Event Notifications
try {
  Engine.clearListeners();
  let notifiedState = null;
  Engine.onStateChange(function(newState) {
    notifiedState = newState;
  });

  Engine.updateBatteryStatus(1.0, false);
  Engine.setMode(Engine.MODES.ALWAYS_ON);
  let s = Engine.getState();
  assert.strictEqual(s.isActive, true, 'Always On must enforce power saving');
  assert.strictEqual(notifiedState.isActive, true, 'State change listener must be notified');

  Engine.updateBatteryStatus(0.05, false);
  Engine.setMode(Engine.MODES.ALWAYS_OFF);
  s = Engine.getState();
  assert.strictEqual(s.isActive, false, 'Always Off must disable power saving');

  Engine.setMode(Engine.MODES.AUTO);

  console.log('✓ Test 2: Manual override modes (Always On / Always Off) and listeners verified.');
} catch (err) {
  console.error('✗ Test 2 Failed:', err.message);
  process.exit(1);
}

// Test 3: Optimization Profiles & OLED True-Black Invariants
try {
  Engine.updateBatteryStatus(0.15, false);
  const state = Engine.getState();
  assert.strictEqual(state.isActive, true);
  assert.strictEqual(state.optimizations.oledTrueBlack, true, 'OLED true black must be active');
  assert.strictEqual(state.optimizations.disableAuraAnimations, true, 'Animations must be disabled');
  assert.strictEqual(state.optimizations.throttleFramePacing, true, 'Frame pacing must be throttled');
  assert.strictEqual(state.optimizations.uiRepaintIntervalMs, 1000, 'UI repaint must throttle to 1000ms');

  console.log('✓ Test 3: OLED True-Black (#000000) & animation throttle optimizations verified.');
} catch (err) {
  console.error('✗ Test 3 Failed:', err.message);
  process.exit(1);
}

// Test 4: Multi-Language Summary & Strict English Fallback
try {
  Engine.updateBatteryStatus(0.15, false);

  const summaryAr = Engine.getLocalizedSummary('ar');
  assert.strictEqual(summaryAr.themeBgColor, '#000000');
  assert.strictEqual(summaryAr.statusText, 'نمط توفير الطاقة نشط');
  assert.strictEqual(summaryAr.batteryPercentStr, '15%');

  const summaryEs = Engine.getLocalizedSummary('es');
  assert.strictEqual(summaryEs.statusText, 'Ahorro de Batería Activo');

  const summaryFallback = Engine.getLocalizedSummary('unsupported_lang');
  assert.strictEqual(summaryFallback.statusText, 'Power Saver Active');
  assert.strictEqual(summaryFallback.modeLabel, 'Auto (<= 20%)');

  console.log('✓ Test 4: Multi-language summary & strict English fallback verified.');
} catch (err) {
  console.error('✗ Test 4 Failed:', err.message);
  process.exit(1);
}

// Test 5: Strict Western Arabic Digits & Hebrew Exclusion
try {
  Engine.updateBatteryStatus(0.18, false);
  const summary = Engine.getLocalizedSummary('ar');

  const easternDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const fullText = JSON.stringify(summary);

  easternDigits.forEach(d => {
    assert(!fullText.includes(d), `Summary must not contain Eastern digit ${d}`);
  });

  const summaryHe = Engine.getLocalizedSummary('he');
  assert.strictEqual(summaryHe.statusText, 'Power Saver Active', 'Hebrew must strictly fallback to English');
  assert(!JSON.stringify(summaryHe).includes('עברית'), 'Must exclude Hebrew');

  console.log('✓ Test 5: Strict Western digits (0123456789) & Hebrew exclusion verified.');
  console.log('--- All Mission #094 Tests PASSED (GREEN) ---');
} catch (err) {
  console.error('✗ Test 5 Failed:', err.message);
  process.exit(1);
}
