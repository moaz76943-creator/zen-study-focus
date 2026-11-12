/**
 * DEEP FOCUS — SovereignStartupBooster (v601.0.0)
 * Phased zero-jank boot orchestrator for Xiaomi 17T Pro (120Hz/144Hz AMOLED).
 * Segregates initialization into Critical (TTFF), Interactive, and Idle background tasks.
 */
(function (global) {
  'use strict';

  var BOOT_PHASES = {
    CRITICAL: 0,    // UI Skeleton & Canvas Paint (<50ms)
    INTERACTIVE: 1, // Core event listeners & frame pacer (<150ms)
    IDLE: 2         // Storage warming, sound preloading, analytics cache
  };

  var SovereignStartupBooster = {
    version: '601.0.0',
    startTime: typeof performance !== 'undefined' ? performance.now() : Date.now(),
    bootMetrics: {},
    phaseHandlers: {
      0: [],
      1: [],
      2: []
    },

    register: function (phase, fn) {
      if (typeof fn === 'function' && this.phaseHandlers[phase]) {
        this.phaseHandlers[phase].push(fn);
      }
    },

    executeCritical: function () {
      var self = this;
      if (typeof performance !== 'undefined' && performance.mark) {
        performance.mark('df_critical_start');
      }
      this.phaseHandlers[BOOT_PHASES.CRITICAL].forEach(function (fn) {
        try { fn(); } catch (e) { console.warn('[Booster] Phase 0 error:', e); }
      });
      if (typeof performance !== 'undefined' && performance.mark) {
        performance.mark('df_critical_end');
      }
    },

    executeInteractive: function () {
      var self = this;
      this.phaseHandlers[BOOT_PHASES.INTERACTIVE].forEach(function (fn) {
        try { fn(); } catch (e) { console.warn('[Booster] Phase 1 error:', e); }
      });
    },

    executeIdle: function () {
      var self = this;
      var runIdleTasks = function () {
        self.phaseHandlers[BOOT_PHASES.IDLE].forEach(function (fn) {
          try { fn(); } catch (e) { console.warn('[Booster] Phase 2 error:', e); }
        });
        self.recordBootMetrics();
      };

      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        window.requestIdleCallback(runIdleTasks, { timeout: 1000 });
      } else {
        setTimeout(runIdleTasks, 150);
      }
    },

    recordBootMetrics: function () {
      var now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      this.bootMetrics = {
        totalBootMs: parseFloat((now - this.startTime).toFixed(2)),
        isOptimal: (now - this.startTime) < 300.0,
        targetHz: 144
      };
      return this.bootMetrics;
    },

    init: function () {
      this.executeCritical();
      this.executeInteractive();
      this.executeIdle();
      return true;
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SovereignStartupBooster;
  }
  global.SovereignStartupBooster = SovereignStartupBooster;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
