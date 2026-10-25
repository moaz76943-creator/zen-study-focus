/**
 * DEEP FOCUS — Gentle Haptic Patterns Coordinator
 * Mission #056: Sub-perceptual tactile feedback, calm pulse patterns,
 * intensity scaling, battery conservation, and hardware-safe fallbacks.
 */
(function (global) {
  'use strict';

  var PATTERNS = {
    soft_tap: [15],
    gentle_pulse: [40, 60, 40],
    zen_completion: [80, 100, 80, 100, 120],
    subtle_warning: [30, 40, 30]
  };

  /**
   * Clamps intensity strictly between 0.0 and 1.0.
   */
  function clampIntensity(val) {
    if (typeof val !== 'number' || isNaN(val)) return 1.0;
    return Math.max(0.0, Math.min(1.0, val));
  }

  /**
   * Scales a vibration pattern according to user intensity preference.
   * Vibration durations scale down; pause intervals remain untouched.
   */
  function scalePattern(pattern, intensity) {
    if (!Array.isArray(pattern)) return [];
    var factor = clampIntensity(intensity);
    if (factor === 0.0) return [];

    var scaled = [];
    for (var i = 0; i < pattern.length; i++) {
      if (i % 2 === 0) {
        // Active vibration pulse
        var dur = Math.max(5, Math.round(pattern[i] * factor));
        scaled.push(dur);
      } else {
        // Silence/pause interval
        scaled.push(pattern[i]);
      }
    }
    return scaled;
  }

  /**
   * Triggers a gentle haptic pattern safely without throwing.
   * @param {string} patternKey - Key from PATTERNS.
   * @param {Object} options - { intensity: number, enabled: boolean, isMuted: boolean, navigatorObj: Object }
   * @returns {Object} Execution receipt.
   */
  function triggerHaptic(patternKey, options) {
    options = options || {};
    var enabled = options.enabled !== false;
    var isMuted = Boolean(options.isMuted);

    if (!enabled) {
      return { executed: false, reason: "HAPTICS_DISABLED" };
    }
    if (isMuted) {
      return { executed: false, reason: "MUTED_GLOBALLY" };
    }

    var basePattern = PATTERNS[patternKey] || PATTERNS.soft_tap;
    var intensity = options.intensity !== undefined ? options.intensity : 1.0;
    var finalPattern = scalePattern(basePattern, intensity);

    if (finalPattern.length === 0) {
      return { executed: false, reason: "ZERO_INTENSITY" };
    }

    var nav = options.navigatorObj || (typeof navigator !== 'undefined' ? navigator : null);
    if (!nav || typeof nav.vibrate !== 'function') {
      return {
        executed: false,
        reason: "HARDWARE_NOT_SUPPORTED",
        pattern: finalPattern
      };
    }

    try {
      var ok = nav.vibrate(finalPattern);
      return {
        executed: Boolean(ok),
        reason: ok ? "VIBRATED_SUCCESS" : "SYSTEM_BLOCKED",
        pattern: finalPattern
      };
    } catch (e) {
      return {
        executed: false,
        reason: "VIBRATE_ERROR",
        error: String(e)
      };
    }
  }

  var engine = {
    PATTERNS: PATTERNS,
    clampIntensity: clampIntensity,
    scalePattern: scalePattern,
    triggerHaptic: triggerHaptic
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  } else {
    global.GentleHapticCoordinator = engine;
  }
})(typeof window !== 'undefined' ? window : this);
