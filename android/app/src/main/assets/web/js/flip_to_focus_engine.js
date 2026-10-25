/**
 * DEEP FOCUS — Flip-to-Focus Face-Down Sensor Engine
 * Mission #078: Physical device orientation sensing, face-down detection,
 * anti-flicker debounce, active input protection, and seamless timer dispatch.
 */
(function (global) {
  'use strict';

  var DEBOUNCE_START_MS = 1500; // Must stay face-down for 1.5s to trigger
  var DEBOUNCE_PAUSE_MS = 800;  // Must stay face-up for 0.8s to pause

  /**
   * Evaluates if orientation angles correspond to a face-down phone on a flat surface.
   * On Android: beta near +/- 180 degrees, gamma near 0 degrees.
   */
  function isDeviceFaceDown(beta, gamma) {
    if (typeof beta !== 'number' || typeof gamma !== 'number') return false;
    if (isNaN(beta) || isNaN(gamma)) return false;

    var absBeta = Math.abs(beta);
    var absGamma = Math.abs(gamma);

    // Flat face-down threshold: beta >= 150 deg and gamma <= 35 deg
    return absBeta >= 150 && absGamma <= 35;
  }

  /**
   * Creates a clean, validated default Flip-to-Focus configuration.
   */
  function createDefaultConfig() {
    return {
      enabled: false, // Opt-in by default
      autoStartOnFaceDown: true,
      autoPauseOnFaceUp: true,
      debounceStartMs: DEBOUNCE_START_MS,
      debouncePauseMs: DEBOUNCE_PAUSE_MS
    };
  }

  /**
   * Evaluates incoming orientation event state.
   * @param {Object} sensorData - { beta, gamma, isProximityCovered }
   * @param {Object} context - { isEnabled, isTypingInput, currentTimerState }
   * @returns {Object} Evaluation verdict.
   */
  function evaluateFlipGesture(sensorData, context) {
    sensorData = sensorData || {};
    context = context || {};

    if (!context.isEnabled) {
      return { action: "IGNORED_DISABLED", shouldDispatch: false };
    }

    // Input guard: never trigger if user is actively writing a note or task
    if (context.isTypingInput) {
      return { action: "SUPPRESSED_USER_TYPING", shouldDispatch: false };
    }

    var faceDown = isDeviceFaceDown(sensorData.beta, sensorData.gamma) || Boolean(sensorData.isProximityCovered);
    var timerState = context.currentTimerState || "IDLE";

    if (faceDown) {
      if (timerState === "IDLE" || timerState === "PAUSED") {
        return {
          action: "START_SESSION",
          shouldDispatch: true,
          debounceMs: DEBOUNCE_START_MS,
          reason: "DEVICE_FLIPPED_FACE_DOWN"
        };
      }
      return { action: "ALREADY_RUNNING", shouldDispatch: false };
    } else {
      // Device is face up or held in hand
      if (timerState === "RUNNING") {
        return {
          action: "PAUSE_SESSION",
          shouldDispatch: true,
          debounceMs: DEBOUNCE_PAUSE_MS,
          reason: "DEVICE_LIFTED_FACE_UP"
        };
      }
      return { action: "ALREADY_IDLE", shouldDispatch: false };
    }
  }

  var engine = {
    DEBOUNCE_START_MS: DEBOUNCE_START_MS,
    DEBOUNCE_PAUSE_MS: DEBOUNCE_PAUSE_MS,
    isDeviceFaceDown: isDeviceFaceDown,
    createDefaultConfig: createDefaultConfig,
    evaluateFlipGesture: evaluateFlipGesture
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  } else {
    global.FlipToFocusEngine = engine;
  }
})(typeof window !== 'undefined' ? window : this);
