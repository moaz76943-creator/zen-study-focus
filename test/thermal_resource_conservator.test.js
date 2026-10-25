const assert = require('assert');
const engine = require('../android/app/src/main/assets/web/js/thermal_resource_conservator_engine.js');

console.log('--- Running 🎯 Mission #128: Thermal Throttle & Resource Conservator Tests ---');

// Test 1: States catalog & parameters
{
  const states = engine.THERMAL_STATES;
  assert.strictEqual(states.NORMAL.fpsLimit, 60);
  assert.strictEqual(states.NORMAL.animationsEnabled, true);
  assert.strictEqual(states.WARM_CONSERVE.fpsLimit, 30);
  assert.strictEqual(states.WARM_CONSERVE.canvasRenderMode, 'LITE');
  assert.strictEqual(states.CRITICAL_COOL.fpsLimit, 1);
  assert.strictEqual(states.CRITICAL_COOL.timerTickIntervalMs, 5000);
  console.log('✓ Test 1: Thermal state profiles & hardware throttling tiers verified.');
}

// Test 2: Session duration-driven resolution
{
  assert.strictEqual(engine.resolveThermalState(45).id, 'NORMAL');
  assert.strictEqual(engine.resolveThermalState(95).id, 'WARM_CONSERVE');
  assert.strictEqual(engine.resolveThermalState(185).id, 'CRITICAL_COOL');

  assert.strictEqual(engine.resolveThermalState(200, null, false, { autoThrottleEnabled: false }).id, 'NORMAL');
  console.log('✓ Test 2: Cumulative session duration thresholds verified.');
}

// Test 3: Battery level adaptation
{
  assert.strictEqual(engine.resolveThermalState(15, 10, false).id, 'CRITICAL_COOL');
  assert.strictEqual(engine.resolveThermalState(15, 10, true).id, 'NORMAL');
  assert.strictEqual(engine.resolveThermalState(30, 50, false).id, 'NORMAL');
  console.log('✓ Test 3: Battery level monitoring & charging exemption verified.');
}

// Test 4: CSS variable generation with strict Western digits
{
  const css = engine.generateGovernorCssVariables(engine.THERMAL_STATES.WARM_CONSERVE);
  assert.strictEqual(css['--zen-render-fps'], '30');
  assert.strictEqual(css['--zen-anim-display'], 'none');
  assert.strictEqual(css['--zen-canvas-opacity'], '0.5');
  assert.strictEqual(css['--zen-tick-interval-ms'], '1000');

  assert.strictEqual(/^[0-9]+$/.test(css['--zen-render-fps']), true);
  assert.strictEqual(/^[0-9]+$/.test(css['--zen-tick-interval-ms']), true);
  console.log('✓ Test 4: Dynamic CSS governor injection & Western digits verified.');
}

// Test 5: 100-Locale translation, strict English fallback & zero Hebrew
{
  const arTitle = engine.getLocalizedText('ar', 'thermal_conserve');
  assert.strictEqual(arTitle.includes('تبريد العتاد'), true);

  const ruTitle = engine.getLocalizedText('ru', 'thermal_conserve');
  assert.strictEqual(ruTitle.includes('Hardware Conservator Active'), true);

  const heTitle = engine.getLocalizedText('he', 'thermal_conserve');
  const iwTitle = engine.getLocalizedText('iw', 'thermal_conserve');
  assert.strictEqual(heTitle.includes('Hardware Conservator Active'), true);
  assert.strictEqual(iwTitle.includes('Hardware Conservator Active'), true);
  assert.strictEqual(engine.sanitizeLocale('he'), 'en');
  assert.strictEqual(engine.sanitizeLocale('iw'), 'en');
  console.log('✓ Test 5: 100-Locale support, strict English fallback & zero Hebrew verified.');
}

console.log('--- All Mission #128 Tests PASSED (GREEN) ---');
