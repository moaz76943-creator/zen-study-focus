/**
 * DEEP FOCUS — SovereignWidgetBridge (v574.0.0)
 * Real-time event-driven push synchronization between WebView and native AppWidgetManager.
 * Ensures Xiaomi 17T Pro home-screen widget is consistently accurate without battery-draining polling.
 */
(function (global) {
  'use strict';

  var lastPayload = null;

  var SovereignWidgetBridge = {
    version: '574.0.0',

    /**
     * Dispatches current timer state to Android AppWidgetManager via JavascriptInterface
     * @param {Object} state - { remainingSec, totalSec, mode, running, sessionCount }
     */
    syncWidgetState: function (state) {
      if (!state || typeof state !== 'object') {
        state = { remainingSec: 0, totalSec: 1500, mode: 'focus', running: false, sessionCount: 0 };
      }

      var payload = {
        remainingSec: Math.max(0, parseInt(state.remainingSec || 0, 10)),
        totalSec: Math.max(1, parseInt(state.totalSec || 1500, 10)),
        mode: String(state.mode || 'focus'),
        running: Boolean(state.running),
        sessionCount: parseInt(state.sessionCount || 0, 10),
        timestamp: Date.now()
      };

      lastPayload = payload;

      // 1. AndroidBridge / QuickTimerWidget native hooks
      if (global.AndroidBridge && typeof global.AndroidBridge.updateWidgetState === 'function') {
        try {
          global.AndroidBridge.updateWidgetState(JSON.stringify(payload));
        } catch (e) {
          // Native call failed gracefully
        }
      } else if (global.QuickTimerWidgetBridge && typeof global.QuickTimerWidgetBridge.pushState === 'function') {
        try {
          global.QuickTimerWidgetBridge.pushState(JSON.stringify(payload));
        } catch (e) {}
      }

      // 2. SovereignEventBus internal notification
      if (global.SovereignEventBus && typeof global.SovereignEventBus.emit === 'function') {
        global.SovereignEventBus.emit('widget:synced', payload);
      }

      return payload;
    },

    getLastPayload: function () {
      return lastPayload;
    },

    /**
     * Wires automatic push listeners on SovereignEventBus
     */
    initAutoSync: function () {
      if (global.SovereignEventBus && typeof global.SovereignEventBus.on === 'function') {
        global.SovereignEventBus.on('timer:tick', function (data) {
          SovereignWidgetBridge.syncWidgetState(data);
        });
        global.SovereignEventBus.on('timer:start', function (data) {
          SovereignWidgetBridge.syncWidgetState(data);
        });
        global.SovereignEventBus.on('timer:pause', function (data) {
          SovereignWidgetBridge.syncWidgetState(data);
        });
        global.SovereignEventBus.on('timer:reset', function (data) {
          SovereignWidgetBridge.syncWidgetState(data);
        });
      }
    }
  };

  // Auto-initialize event listeners
  if (typeof global !== 'undefined') {
    SovereignWidgetBridge.initAutoSync();
  }

  global.SovereignWidgetBridge = SovereignWidgetBridge;
  if (global.SovereignCoreRegistry && typeof global.SovereignCoreRegistry.register === 'function') {
    global.SovereignCoreRegistry.register('sovereign_widget_bridge', SovereignWidgetBridge);
  }
})(typeof window !== 'undefined' ? window : globalThis);
