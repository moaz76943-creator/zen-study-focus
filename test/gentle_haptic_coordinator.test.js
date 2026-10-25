const assert = require('assert');
const Haptics = require('../android/app/src/main/assets/web/js/gentle_haptic_coordinator.js');

console.log("--- Running 🎯 Mission #056: Gentle Haptic Coordinator Tests ---");

// Test 1: Pattern preset retrieval & bounds
{
  assert.deepStrictEqual(Haptics.PATTERNS.soft_tap, [15]);
  assert.strictEqual(Haptics.PATTERNS.zen_completion.length, 5);
  assert.ok(Haptics.PATTERNS.zen_completion[4] <= 150, "Max pulse must stay quiet and brief");
  console.log("✓ Test 1: Pattern preset configurations verified.");
}

// Test 2: Intensity scaling calculation
{
  const base = [40, 60, 40]; // gentle_pulse
  const half = Haptics.scalePattern(base, 0.5);
  assert.strictEqual(half[0], 20, "Active pulse must scale down by 50%");
  assert.strictEqual(half[1], 60, "Silence interval must remain untouched");
  assert.strictEqual(half[2], 20);

  const zero = Haptics.scalePattern(base, 0.0);
  assert.deepStrictEqual(zero, [], "0 intensity must return empty pattern");
  console.log("✓ Test 2: Intensity scaling preserves silence intervals correctly.");
}

// Test 3: Haptic dispatch contract with mock navigator.vibrate
{
  let calledWith = null;
  const mockNavigator = {
    vibrate: function (pat) {
      calledWith = pat;
      return true;
    }
  };

  const res = Haptics.triggerHaptic("gentle_pulse", { navigatorObj: mockNavigator });
  assert.strictEqual(res.executed, true);
  assert.strictEqual(res.reason, "VIBRATED_SUCCESS");
  assert.deepStrictEqual(calledWith, [40, 60, 40]);
  console.log("✓ Test 3: Hardware dispatch contract with navigator.vibrate verified.");
}

// Test 4: Suppression when muted or disabled
{
  const disabledRes = Haptics.triggerHaptic("soft_tap", { enabled: false });
  assert.strictEqual(disabledRes.executed, false);
  assert.strictEqual(disabledRes.reason, "HAPTICS_DISABLED");

  const mutedRes = Haptics.triggerHaptic("soft_tap", { isMuted: true });
  assert.strictEqual(mutedRes.executed, false);
  assert.strictEqual(mutedRes.reason, "MUTED_GLOBALLY");
  console.log("✓ Test 4: Suppression during mute and disabled state verified.");
}

// Test 5: Safe fallback when hardware/navigator is unsupported
{
  const unsupportedRes = Haptics.triggerHaptic("soft_tap", { navigatorObj: null });
  assert.strictEqual(unsupportedRes.executed, false);
  assert.strictEqual(unsupportedRes.reason, "HARDWARE_NOT_SUPPORTED");
  assert.deepStrictEqual(unsupportedRes.pattern, [15]);
  console.log("✓ Test 5: Hardware-absent graceful fallback verified.");
}

console.log("--- All Mission #056 Tests PASSED (GREEN) ---");
