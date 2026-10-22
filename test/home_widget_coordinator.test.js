const assert = require('assert');
const WidgetCoordinator = require('../android/app/src/main/assets/web/js/home_widget_coordinator.js');

console.log("--- Running 🎯 Mission #061: Home Screen Widget Coordinator Tests ---");

// Test 1: Widget state payload generation & Western time formatting
{
  const ctx = {
    timerState: WidgetCoordinator.TIMER_STATES.RUNNING,
    remainingSeconds: 1420,
    streakDays: 7,
    todayTaskTitle: "مراجعة الذكاء الاصطناعي"
  };

  const payload = WidgetCoordinator.generateWidgetStatePayload(ctx);
  assert.strictEqual(payload.version, 21);
  assert.strictEqual(payload.timerState, "RUNNING");
  assert.strictEqual(payload.formattedTime, "\u200E23:40");
  assert.strictEqual(payload.streakFormatted, "\u200E7 يوم");
  assert.strictEqual(payload.canStart, false);
  assert.strictEqual(payload.canPause, true);
  console.log("✓ Test 1: Widget state payload generation & Western digits verified.");
}

// Test 2: Intent deep-link action resolution
{
  assert.deepStrictEqual(WidgetCoordinator.resolveWidgetAction("ZEN_WIDGET_START"), {
    handled: true,
    event: "START_TIMER",
    defaultDurationMinutes: 25
  });

  assert.deepStrictEqual(WidgetCoordinator.resolveWidgetAction("ZEN_WIDGET_PAUSE"), {
    handled: true,
    event: "PAUSE_TIMER"
  });

  assert.deepStrictEqual(WidgetCoordinator.resolveWidgetAction("ZEN_WIDGET_OPEN_TODAY"), {
    handled: true,
    event: "NAVIGATE_DESTINATION",
    destinationId: "tasks"
  });

  assert.deepStrictEqual(WidgetCoordinator.resolveWidgetAction("UNKNOWN_ACTION"), {
    handled: false,
    event: "NOOP"
  });
  console.log("✓ Test 2: Deep-link widget click intent resolution verified.");
}

// Test 3: Safe dispatch with Mock native bridge
{
  let bridgeCalledData = null;
  const mockBridge = {
    updateWidgetData: function (dataStr) {
      bridgeCalledData = JSON.parse(dataStr);
    }
  };

  const samplePayload = { timerState: "IDLE", remainingSeconds: 1500 };
  const res = WidgetCoordinator.dispatchToNativeWidget(samplePayload, mockBridge);
  assert.strictEqual(res.dispatched, true);
  assert.strictEqual(res.target, "NATIVE_BRIDGE");
  assert.strictEqual(bridgeCalledData.remainingSeconds, 1500);
  console.log("✓ Test 3: Native Android bridge dispatch contract verified.");
}

// Test 4: Graceful fallback when native bridge is absent
{
  const res = WidgetCoordinator.dispatchToNativeWidget({ test: true }, null);
  assert.strictEqual(res.dispatched, true);
  assert.strictEqual(res.target, "LOCAL_FALLBACK");
  console.log("✓ Test 4: Graceful local fallback when bridge is absent verified.");
}

// Test 5: Boundary and negative seconds handling
{
  assert.strictEqual(WidgetCoordinator.formatWidgetTime(-10), "\u200E00:00");
  assert.strictEqual(WidgetCoordinator.formatWidgetTime(NaN), "\u200E00:00");
  assert.strictEqual(WidgetCoordinator.formatWidgetTime(60), "\u200E01:00");
  console.log("✓ Test 5: Negative and boundary time values formatting verified.");
}

console.log("--- All Mission #061 Tests PASSED (GREEN) ---");
