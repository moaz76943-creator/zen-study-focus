/**
 * DEEP FOCUS — Strict Focus Mode & Anti-Abandonment Quit Guard
 * Mission #081: 5-second mindful cooldown hold, impulsive exit prevention,
 * discipline ratio tracking, and user opt-in configuration.
 */
(function (global) {
  'use strict';

  var REQUIRED_HOLD_MS = 5000; // 5 seconds continuous hold to abandon

  var MINDFUL_WARNING_AR = "هل ترغب حقاً في مقاطعة تركيزك؟ خذ نفساً عميقاً وفكّر قبل الاستسلام.";
  var MINDFUL_WARNING_EN = "Do you truly wish to break your focus? Take a deep breath before giving up.";

  /**
   * Generates default strict focus configuration.
   */
  function createDefaultStrictConfig() {
    return {
      enabled: false, // Opt-in by default
      requiredHoldMs: REQUIRED_HOLD_MS,
      blockBackButton: true,
      logInterruptionOnQuit: true
    };
  }

  /**
   * Intercepts a quit / abandon request during a focus session.
   * @param {Object} context - { isSessionActive, config, elapsedHoldMs, isRtl }
   * @returns {Object} Verdict and instructions.
   */
  function evaluateAbandonmentRequest(context) {
    context = context || {};
    var isRunning = Boolean(context.isSessionActive);
    var config = context.config || createDefaultStrictConfig();
    var isRtl = context.isRtl !== false;

    // If session is not actively running or strict mode is off, permit exit immediately
    if (!isRunning || !config.enabled) {
      return {
        permitted: true,
        requiresHoldCooldown: false,
        reason: "EXIT_PERMITTED_IMMEDIATELY"
      };
    }

    var holdMs = typeof context.elapsedHoldMs === 'number' && context.elapsedHoldMs >= 0
      ? context.elapsedHoldMs
      : 0;

    var reqMs = typeof config.requiredHoldMs === 'number' && config.requiredHoldMs > 0
      ? config.requiredHoldMs
      : REQUIRED_HOLD_MS;

    // Check if user has held continuously for the full cooldown duration
    if (holdMs >= reqMs) {
      return {
        permitted: true,
        requiresHoldCooldown: false,
        reason: "COOLDOWN_HOLD_COMPLETED",
        interruptionLogged: Boolean(config.logInterruptionOnQuit)
      };
    }

    // Intercept and enforce 5-second cooldown hold
    var remainingMs = reqMs - holdMs;
    var remainingSecs = Math.ceil(remainingMs / 1000);

    return {
      permitted: false,
      requiresHoldCooldown: true,
      remainingHoldMs: remainingMs,
      remainingSeconds: remainingSecs,
      promptText: isRtl ? MINDFUL_WARNING_AR : MINDFUL_WARNING_EN,
      holdInstruction: isRtl
        ? ("اضغط مطولاً لمدة \u200E" + remainingSecs + " ثوانٍ للاستسلام")
        : ("Hold for \u200E" + remainingSecs + "s to abandon")
    };
  }

  /**
   * Calculates student discipline ratio.
   */
  function calculateDisciplineRatio(completedSessionsCount, abandonedSessionsCount) {
    var comp = typeof completedSessionsCount === 'number' && completedSessionsCount >= 0 ? completedSessionsCount : 0;
    var aban = typeof abandonedSessionsCount === 'number' && abandonedSessionsCount >= 0 ? abandonedSessionsCount : 0;
    var total = comp + aban;

    if (total === 0) return 100;
    return Math.round((comp / total) * 100);
  }

  var engine = {
    REQUIRED_HOLD_MS: REQUIRED_HOLD_MS,
    MINDFUL_WARNING_AR: MINDFUL_WARNING_AR,
    MINDFUL_WARNING_EN: MINDFUL_WARNING_EN,
    createDefaultStrictConfig: createDefaultStrictConfig,
    evaluateAbandonmentRequest: evaluateAbandonmentRequest,
    calculateDisciplineRatio: calculateDisciplineRatio
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  } else {
    global.StrictFocusQuitGuard = engine;
  }
})(typeof window !== 'undefined' ? window : this);
