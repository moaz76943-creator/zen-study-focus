/**
 * DEEP FOCUS — SovereignShortcutsBridge (v575.0.0)
 * Manages Dynamic App Shortcuts and deep-link intent routing for Android 15 (SDK 35).
 * Enables instant one-tap launching into Quick Focus, Box Breathing, and Analytics.
 */
(function (global) {
  'use strict';

  var SHORTCUT_DEFS = [
    {
      id: 'shortcut_quick_focus',
      action: 'quick_focus',
      shortLabel: 'Quick Focus',
      longLabel: 'Start 25m Focus Session',
      icon: 'timer'
    },
    {
      id: 'shortcut_calm_breathing',
      action: 'calm_breathing',
      shortLabel: 'Breathing',
      longLabel: 'Calm Box Breathing (4-4-4-4)',
      icon: 'spa'
    },
    {
      id: 'shortcut_view_analytics',
      action: 'view_analytics',
      shortLabel: 'Analytics',
      longLabel: 'View Study Heatmap & Momentum',
      icon: 'insights'
    }
  ];

  var lastActionExecuted = null;

  var SovereignShortcutsBridge = {
    version: '575.0.0',

    getRegisteredShortcuts: function () {
      return SHORTCUT_DEFS.slice();
    },

    getLastAction: function () {
      return lastActionExecuted;
    },

    /**
     * Publishes shortcuts definitions to native Android ShortcutManagerCompat
     */
    publishToAndroid: function () {
      var payload = JSON.stringify(SHORTCUT_DEFS);
      if (global.AndroidBridge && typeof global.AndroidBridge.setDynamicShortcuts === 'function') {
        try {
          global.AndroidBridge.setDynamicShortcuts(payload);
        } catch (e) {
          // Native bridge call failed gracefully
        }
      }
      if (global.SovereignEventBus && typeof global.SovereignEventBus.emit === 'function') {
        global.SovereignEventBus.emit('shortcuts:published', SHORTCUT_DEFS);
      }
      return true;
    },

    /**
     * Executes intent action and coordinates with corresponding sovereign modules
     * @param {string} action - 'quick_focus' | 'calm_breathing' | 'view_analytics'
     */
    handleShortcutAction: function (action) {
      if (!action || typeof action !== 'string') return false;
      lastActionExecuted = action;

      switch (action) {
        case 'quick_focus':
          if (global.SovereignTimerEngine && typeof global.SovereignTimerEngine.start === 'function') {
            global.SovereignTimerEngine.start(1500);
          } else if (global.SovereignEventBus) {
            global.SovereignEventBus.emit('timer:request_start', { duration: 1500 });
          }
          break;

        case 'calm_breathing':
          if (global.SovereignWellnessUI && typeof global.SovereignWellnessUI.openBreathing === 'function') {
            global.SovereignWellnessUI.openBreathing('box');
          } else if (global.SovereignEventBus) {
            global.SovereignEventBus.emit('wellness:open_breathing', { pattern: 'box' });
          }
          break;

        case 'view_analytics':
          if (global.SovereignAnalyticsSuite && typeof global.SovereignAnalyticsSuite.renderHeatmap === 'function') {
            global.SovereignAnalyticsSuite.renderHeatmap();
          } else if (global.SovereignEventBus) {
            global.SovereignEventBus.emit('navigation:goto', { target: 'analytics' });
          }
          break;

        default:
          return false;
      }

      if (global.SovereignEventBus) {
        global.SovereignEventBus.emit('shortcut:executed', { action: action, timestamp: Date.now() });
      }
      return true;
    },

    /**
     * Inspects URL query params on startup for shortcut deep links (?shortcut=...)
     */
    checkLaunchIntent: function (searchString) {
      var query = searchString;
      if (typeof query === 'undefined' && typeof window !== 'undefined' && window.location) {
        query = window.location.search;
      }
      if (!query || typeof query !== 'string') return false;

      var match = query.match(/[?&]shortcut=([^&]+)/);
      if (match && match[1]) {
        var action = decodeURIComponent(match[1]);
        return SovereignShortcutsBridge.handleShortcutAction(action);
      }
      return false;
    }
  };

  // Wire auto-publish and launch detection
  if (typeof global !== 'undefined') {
    SovereignShortcutsBridge.publishToAndroid();
    if (typeof window !== 'undefined') {
      window.addEventListener('DOMContentLoaded', function () {
        SovereignShortcutsBridge.checkLaunchIntent();
      });
    }
  }

  global.SovereignShortcutsBridge = SovereignShortcutsBridge;
  if (global.SovereignCoreRegistry && typeof global.SovereignCoreRegistry.register === 'function') {
    global.SovereignCoreRegistry.register('sovereign_shortcuts_bridge', SovereignShortcutsBridge);
  }
})(typeof window !== 'undefined' ? window : globalThis);
