const assert = require('assert');
const PerfGuard = require('../android/app/src/main/assets/web/js/performance_profiling_guard.js');

console.log("--- Running 🎯 Mission #058: Performance Profiling Guard Tests ---");

// Test 1: Throttled task dispatcher limits execution frequency
{
  let callCount = 0;
  const throttled = PerfGuard.createThrottledTask(function () {
    callCount++;
  }, 100);

  // Trigger 5 rapid calls synchronously
  throttled();
  throttled();
  throttled();
  assert.strictEqual(callCount, 1, "Immediate execution happens once, blocking synchronous bursts");
  console.log("✓ Test 1: Throttled task execution rate limiting verified.");
}

// Test 2: Lifecycle registry tracks and tears down active timers
{
  const registry = PerfGuard.createLifecycleRegistry();
  const t1 = setTimeout(function () {}, 10000);
  const i1 = setInterval(function () {}, 10000);

  registry.registerTimeout(t1);
  registry.registerInterval(i1);

  const initialCounts = registry.getActiveCounts();
  assert.strictEqual(initialCounts.total, 2);

  const cleared = registry.teardownAll();
  assert.strictEqual(cleared, 2);
  assert.strictEqual(registry.getActiveCounts().total, 0, "All timers must be cleared from registry");
  console.log("✓ Test 2: Lifecycle registry and clean teardown verified.");
}

// Test 3: Performance health assessment (Optimal state)
{
  const health = PerfGuard.evaluatePerformanceHealth(2, 500000); // 2 timers, 500KB
  assert.strictEqual(health.status, "OPTIMAL");
  assert.strictEqual(health.warnings.length, 0);
  console.log("✓ Test 3: Optimal resource state verified.");
}

// Test 4: Leak warning on excessive active timers
{
  const leakHealth = PerfGuard.evaluatePerformanceHealth(12, 100000);
  assert.strictEqual(leakHealth.status, "LEAK_WARNING");
  assert.ok(leakHealth.warnings[0].includes("EXCESSIVE_ACTIVE_TIMERS"));
  console.log("✓ Test 4: Resource leak warning detection verified.");
}

// Test 5: Defensive resilience against invalid callbacks
{
  const noop = PerfGuard.createThrottledTask(null);
  assert.doesNotThrow(function () {
    noop();
  }, "Invalid callback must safely resolve to noop without throwing");
  console.log("✓ Test 5: Invalid callback resilience verified.");
}

console.log("--- All Mission #058 Tests PASSED (GREEN) ---");
