/**
 * DEEP FOCUS — Performance Profiling & Memory Leak Guard
 * Mission #058: Memory leak prevention, throttled UI pacing,
 * timer teardown registry, and battery-friendly event disposal.
 */
(function (global) {
  'use strict';

  var MAX_SAFE_ACTIVE_TIMERS = 5;
  var MEMORY_DELTA_WARNING_BYTES = 5 * 1024 * 1024; // 5MB

  /**
   * Creates a throttled wrapper for high-frequency events (e.g. tick redraws).
   * Ensures function executes at most once per intervalMs.
   */
  function createThrottledTask(fn, intervalMs) {
    if (typeof fn !== 'function') return function () {};
    var delay = typeof intervalMs === 'number' && intervalMs > 0 ? intervalMs : 250;
    var lastExecution = 0;
    var timerId = null;

    return function () {
      var context = this;
      var args = arguments;
      var now = Date.now();

      if (now - lastExecution >= delay) {
        lastExecution = now;
        fn.apply(context, args);
      } else if (!timerId) {
        timerId = setTimeout(function () {
          lastExecution = Date.now();
          timerId = null;
          fn.apply(context, args);
        }, delay - (now - lastExecution));
      }
    };
  }

  /**
   * Registry to track and cleanly tear down active timers and event handlers.
   */
  function createLifecycleRegistry() {
    var activeIntervals = [];
    var activeTimeouts = [];

    return {
      registerInterval: function (id) {
        if (id) activeIntervals.push(id);
      },
      registerTimeout: function (id) {
        if (id) activeTimeouts.push(id);
      },
      getActiveCounts: function () {
        return {
          intervals: activeIntervals.length,
          timeouts: activeTimeouts.length,
          total: activeIntervals.length + activeTimeouts.length
        };
      },
      teardownAll: function () {
        for (var i = 0; i < activeIntervals.length; i++) {
          clearInterval(activeIntervals[i]);
        }
        for (var j = 0; j < activeTimeouts.length; j++) {
          clearTimeout(activeTimeouts[j]);
        }
        var count = activeIntervals.length + activeTimeouts.length;
        activeIntervals = [];
        activeTimeouts = [];
        return count;
      }
    };
  }

  /**
   * Evaluates memory and resource health metrics.
   */
  function evaluatePerformanceHealth(activeResourcesCount, heapDeltaBytes) {
    var count = typeof activeResourcesCount === 'number' ? activeResourcesCount : 0;
    var delta = typeof heapDeltaBytes === 'number' ? heapDeltaBytes : 0;

    var status = "OPTIMAL";
    var warnings = [];

    if (count > MAX_SAFE_ACTIVE_TIMERS) {
      status = "LEAK_WARNING";
      warnings.push("EXCESSIVE_ACTIVE_TIMERS: " + count);
    }

    if (delta > MEMORY_DELTA_WARNING_BYTES) {
      status = "LEAK_WARNING";
      warnings.push("HIGH_MEMORY_DELTA_BYTES: " + delta);
    }

    return {
      status: status,
      activeResourcesCount: count,
      heapDeltaBytes: delta,
      warnings: warnings
    };
  }

  var engine = {
    createThrottledTask: createThrottledTask,
    createLifecycleRegistry: createLifecycleRegistry,
    evaluatePerformanceHealth: evaluatePerformanceHealth
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  } else {
    global.PerformanceProfilingGuard = engine;
  }
})(typeof window !== 'undefined' ? window : this);
