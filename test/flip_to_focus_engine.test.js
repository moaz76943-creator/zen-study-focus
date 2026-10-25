const assert = require('assert');
const FlipEngine = require('../android/app/src/main/assets/web/js/flip_to_focus_engine.js');

console.log("--- Running 🎯 Mission #078: Flip-to-Focus Engine Tests ---");

// Test 1: Orientation math detects face-down angle accurately
{
  assert.strictEqual(FlipEngine.isDeviceFaceDown(175, 5), true, "beta 175, gamma 5 is face down");
  assert.strictEqual(FlipEngine.isDeviceFaceDown(-165, -10), true, "beta -165, gamma -10 is face down");
  assert.strictEqual(FlipEngine.isDeviceFaceDown(45, 0), false, "beta 45 is facing up / tilted");
  assert.strictEqual(FlipEngine.isDeviceFaceDown(NaN, 0), false);
  console.log("✓ Test 1: Device face-down orientation geometry verified.");
}

// Test 2: Trigger start session when flipped face down
{
  const res = FlipEngine.evaluateFlipGesture(
    { beta: 170, gamma: 2 },
    { isEnabled: true, isTypingInput: false, currentTimerState: "IDLE" }
  );
  assert.strictEqual(res.shouldDispatch, true);
  assert.strictEqual(res.action, "START_SESSION");
  assert.strictEqual(res.reason, "DEVICE_FLIPPED_FACE_DOWN");
  assert.strictEqual(res.debounceMs, 1500);
  console.log("✓ Test 2: Auto-start on face-down gesture verified.");
}

// Test 3: Trigger pause session when lifted face up
{
  const res = FlipEngine.evaluateFlipGesture(
    { beta: 20, gamma: 0 },
    { isEnabled: true, isTypingInput: false, currentTimerState: "RUNNING" }
  );
  assert.strictEqual(res.shouldDispatch, true);
  assert.strictEqual(res.action, "PAUSE_SESSION");
  assert.strictEqual(res.reason, "DEVICE_LIFTED_FACE_UP");
  console.log("✓ Test 3: Auto-pause on lifting phone verified.");
}

// Test 4: Active typing input guard suppresses flip actions
{
  const res = FlipEngine.evaluateFlipGesture(
    { beta: 175, gamma: 0 },
    { isEnabled: true, isTypingInput: true, currentTimerState: "IDLE" }
  );
  assert.strictEqual(res.shouldDispatch, false);
  assert.strictEqual(res.action, "SUPPRESSED_USER_TYPING");
  console.log("✓ Test 4: Typing input guard protection verified.");
}

// Test 5: Ignored when feature is disabled
{
  const res = FlipEngine.evaluateFlipGesture(
    { beta: 180, gamma: 0 },
    { isEnabled: false }
  );
  assert.strictEqual(res.shouldDispatch, false);
  assert.strictEqual(res.action, "IGNORED_DISABLED");
  console.log("✓ Test 5: Disabled state pass-through verified.");
}

console.log("--- All Mission #078 Tests PASSED (GREEN) ---");
