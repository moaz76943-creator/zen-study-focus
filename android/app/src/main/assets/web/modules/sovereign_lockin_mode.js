/**
 * DEEP FOCUS — SovereignLockInMode (v583.0.0)
 * Zen Lock-In Mode providing comprehensive sensory shielding and impulse friction.
 * Employs true AMOLED pure-black backdrop (0% pixel power) and 3-second long-press unlock.
 */
(function (global) {
  'use strict';

  var isActive = false;
  var options = {
    strictLock: true,
    autoDim: true,
    hideControls: true,
    durationSec: 1500
  };

  var SovereignLockInMode = {
    version: '583.0.0',

    activateLockIn: function (opt) {
      isActive = true;
      if (opt && typeof opt === 'object') {
        options = Object.assign({}, options, opt);
      }

      // 1. Apply DOM classes for sensory shielding
      if (typeof document !== 'undefined' && document.body) {
        document.body.classList.add('df-lockin-active');
        if (options.autoDim) {
          document.body.classList.add('df-lockin-dimmed');
        }
      }

      // 2. Request native immersive sticky fullscreen if bridge exists
      if (global.AndroidBridge && typeof global.AndroidBridge.setImmersiveFullscreen === 'function') {
        try {
          global.AndroidBridge.setImmersiveFullscreen(true);
        } catch (e) {}
      }

      if (global.SovereignEventBus && typeof global.SovereignEventBus.emit === 'function') {
        global.SovereignEventBus.emit('lockin:activated', options);
      }
      return true;
    },

    deactivateLockIn: function (forced) {
      if (!isActive) return false;
      if (options.strictLock && !forced) {
        return false; // Requires emergency exit verification
      }

      isActive = false;

      if (typeof document !== 'undefined' && document.body) {
        document.body.classList.remove('df-lockin-active');
        document.body.classList.remove('df-lockin-dimmed');
      }

      if (global.AndroidBridge && typeof global.AndroidBridge.setImmersiveFullscreen === 'function') {
        try {
          global.AndroidBridge.setImmersiveFullscreen(false);
        } catch (e) {}
      }

      if (global.SovereignEventBus && typeof global.SovereignEventBus.emit === 'function') {
        global.SovereignEventBus.emit('lockin:deactivated', { forced: Boolean(forced) });
      }
      return true;
    },

    /**
     * Impulse friction: user must hold exit button for 3000ms to cancel session
     * @param {number} holdDurationMs
     */
    handleEmergencyExitPress: function (holdDurationMs) {
      var ms = parseInt(holdDurationMs || 0, 10);
      if (ms >= 3000) {
        return this.deactivateLockIn(true);
      }
      return false;
    },

    isLockInActive: function () {
      return isActive;
    },

    getLockInOptions: function () {
      return Object.assign({}, options);
    }
  };

  // Auto-wire into timer start when strictMode is enabled
  if (typeof global !== 'undefined') {
    if (global.SovereignEventBus && typeof global.SovereignEventBus.on === 'function') {
      global.SovereignEventBus.on('timer:start', function (data) {
        if (data && data.strictMode) {
          SovereignLockInMode.activateLockIn({ durationSec: data.remainingSec || 1500 });
        }
      });
      global.SovereignEventBus.on('timer:complete', function () {
        SovereignLockInMode.deactivateLockIn(true);
      });
      global.SovereignEventBus.on('timer:reset', function () {
        SovereignLockInMode.deactivateLockIn(true);
      });
    }
  }

  global.SovereignLockInMode = SovereignLockInMode;
  if (global.SovereignCoreRegistry && typeof global.SovereignCoreRegistry.register === 'function') {
    global.SovereignCoreRegistry.register('sovereign_lockin_mode', SovereignLockInMode);
  }
})(typeof window !== 'undefined' ? window : globalThis);
