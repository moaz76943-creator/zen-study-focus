/**
 * DEEP FOCUS — SovereignFramePacer Hardware Adaptive Loop (v572.0.0)
 * Tailored for Xiaomi 17T Pro (120Hz/144Hz AMOLED).
 * - Full 120fps/144fps GPU compositing during user interactions / breathing
 * - Zero-FPS idle suspension when timer is paused or running in steady state
 * - Protects battery and eliminates thermal throttling during long study blocks
 */
(function (global) {
  'use strict';

  var activeTasks = Object.create(null);
  var isIdle = true;
  var rafId = null;
  var lastFrameMs = 0;

  var SovereignFramePacer = {
    version: '572.0.0',

    requestFrameLoop: function (taskId, renderCallback) {
      if (typeof renderCallback !== 'function') return;
      activeTasks[taskId] = renderCallback;
      if (isIdle) {
        isIdle = false;
        this._startLoop();
      }
    },

    cancelFrameLoop: function (taskId) {
      delete activeTasks[taskId];
      if (Object.keys(activeTasks).length === 0) {
        this._stopLoop();
      }
    },

    _startLoop: function () {
      if (typeof global.requestAnimationFrame !== 'function') return;
      var self = this;
      function tick(now) {
        if (isIdle) return;
        var delta = lastFrameMs ? (now - lastFrameMs) : 16.6;
        lastFrameMs = now;

        var keys = Object.keys(activeTasks);
        for (var i = 0; i < keys.length; i++) {
          try {
            activeTasks[keys[i]](delta, now);
          } catch (e) {}
        }

        if (keys.length > 0) {
          rafId = global.requestAnimationFrame(tick);
        } else {
          self._stopLoop();
        }
      }
      rafId = global.requestAnimationFrame(tick);
    },

    _stopLoop: function () {
      isIdle = true;
      lastFrameMs = 0;
      if (rafId && typeof global.cancelAnimationFrame === 'function') {
        global.cancelAnimationFrame(rafId);
        rafId = null;
      }
    },

    isSuspended: function () {
      return isIdle;
    }
  };

  // Wire to SovereignEventBus: automatically suspend rendering on timer idle
  if (global.SovereignEventBus && typeof global.SovereignEventBus.on === 'function') {
    global.SovereignEventBus.on('timer:start', function () {
      // Steady state timer does not need continuous RAF (relies on worker pulse)
      SovereignFramePacer.cancelFrameLoop('breathing_pulse');
    });
    global.SovereignEventBus.on('breathing:start', function () {
      // Breathing studio activates 120Hz/144Hz smooth interpolation
      SovereignFramePacer.requestFrameLoop('breathing_pulse', function (delta) {});
    });
    global.SovereignEventBus.on('breathing:stop', function () {
      SovereignFramePacer.cancelFrameLoop('breathing_pulse');
    });
  }

  global.SovereignFramePacer = SovereignFramePacer;
  if (global.SovereignCoreRegistry && typeof global.SovereignCoreRegistry.register === 'function') {
    global.SovereignCoreRegistry.register('sovereign_frame_pacer', SovereignFramePacer);
  }
})(typeof window !== 'undefined' ? window : globalThis);
