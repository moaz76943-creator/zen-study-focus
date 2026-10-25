const assert = require('assert');
const Engine = require('../android/app/src/main/assets/web/js/ambient_focus_display_engine.js');

console.log("--- Running 🎯 Mission #050: Ambient Focus Display Tests ---");
{
  assert.strictEqual(Engine.formatAmbientTimer(1500), "\u200E25:00");
  assert.strictEqual(Engine.formatAmbientTimer(65), "\u200E01:05");
  assert.strictEqual(Engine.formatAmbientTimer(0), "\u200E00:00");
  assert.strictEqual(Engine.formatAmbientTimer(-10), "\u200E00:00");
  console.log("✓ Test 1: Minimalist timer formatting with Western digits verified.");
}
{
  const lockedState = { locked: true, touchCount: 0 };
  const singleTap = Engine.evaluateTouchUnlock(lockedState, 'SINGLE_TAP');
  assert.strictEqual(singleTap.locked, true);
  assert.strictEqual(singleTap.actionPermitted, false);

  const doubleTap = Engine.evaluateTouchUnlock(lockedState, 'DOUBLE_TAP');
  assert.strictEqual(doubleTap.locked, false);
  assert.strictEqual(doubleTap.actionPermitted, true);
  console.log("✓ Test 2: Touch lock guard & double-tap unlock verified.");
}
{
  const cfg = Engine.createAmbientConfig();
  assert.strictEqual(cfg.dimBrightness, true);
  assert.strictEqual(cfg.keepScreenOn, true);
  assert.strictEqual(cfg.touchLockEnabled, true);
  console.log("✓ Test 3: Default ambient display configuration verified.");
}
{
  const unlocked = Engine.evaluateTouchUnlock({ locked: false }, 'ANY_EVENT');
  assert.strictEqual(unlocked.actionPermitted, true);
  console.log("✓ Test 4: Unlocked state pass-through verified.");
}
console.log("--- All Mission #050 Tests PASSED (GREEN) ---");
