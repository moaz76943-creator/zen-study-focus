/**
 * DEEP FOCUS — Custom Focus DND & Quiet Mode Coordinator
 * Mission #042: In-app focus shield, OS ringer mode integration,
 * graceful state restore, and zero-distraction alert policy.
 */
(function (global) {
  'use strict';

  var RINGER_MODES = {
    SILENT: 0,
    VIBRATE: 1,
    NORMAL: 2
  };

  var SHIELD_STATES = {
    IDLE: 'IDLE',
    SHIELDED_ACTIVE: 'SHIELDED_ACTIVE',
    RESTORED: 'RESTORED'
  };

  /**
   * Generates a clean, validated default DND configuration.
   */
  function createDefaultDndSettings() {
    return {
      autoShieldOnStart: true,
      allowBreakReminders: true,
      respectSystemSilent: true,
      vibrateOnCompletionIfSilent: false
    };
  }

  /**
   * Evaluates whether an audio alert is permitted to sound.
   * @param {string} alertType - 'session_completion', 'break_reminder', 'interruption'
   * @param {Object} context - { isSessionActive, systemRingerMode, dndSettings, isMuted }
   * @returns {Object} { allowed: boolean, reason: string }
   */
  function evaluateAlertPermission(alertType, context) {
    context = context || {};
    var settings = context.dndSettings || createDefaultDndSettings();
    var ringer = context.systemRingerMode !== undefined ? context.systemRingerMode : RINGER_MODES.NORMAL;

    // Rule 1: Master mute override
    if (context.isMuted) {
      return { allowed: false, reason: "MUTED_GLOBALLY" };
    }

    // Rule 2: Respect Android OS Silent Mode
    if (settings.respectSystemSilent && ringer === RINGER_MODES.SILENT) {
      return { allowed: false, reason: "OS_RINGER_SILENT" };
    }

    // Rule 3: Respect Android OS Vibrate Mode for audible chime
    if (settings.respectSystemSilent && ringer === RINGER_MODES.VIBRATE) {
      return { allowed: false, reason: "OS_RINGER_VIBRATE_ONLY" };
    }

    // Rule 4: In-session active shield
    if (context.isSessionActive) {
      if (alertType === 'break_reminder' && settings.allowBreakReminders) {
        return { allowed: true, reason: "BREAK_REMINDER_PERMITTED" };
      }
      return { allowed: false, reason: "FOCUS_SHIELD_ACTIVE" };
    }

    // Rule 5: Session completion alert is permitted if unmuted and normal ringer
    if (alertType === 'session_completion') {
      return { allowed: true, reason: "COMPLETION_ALERT_PERMITTED" };
    }

    return { allowed: true, reason: "DEFAULT_PERMITTED" };
  }

  /**
   * Computes shield state transition.
   */
  function transitionShieldState(currentState, sessionEvent) {
    if (sessionEvent === 'START' || sessionEvent === 'RESUME') {
      return SHIELD_STATES.SHIELDED_ACTIVE;
    }
    if (sessionEvent === 'COMPLETE' || sessionEvent === 'PAUSE' || sessionEvent === 'RESET') {
      return SHIELD_STATES.RESTORED;
    }
    return currentState || SHIELD_STATES.IDLE;
  }

  var engine = {
    RINGER_MODES: RINGER_MODES,
    SHIELD_STATES: SHIELD_STATES,
    createDefaultDndSettings: createDefaultDndSettings,
    evaluateAlertPermission: evaluateAlertPermission,
    transitionShieldState: transitionShieldState
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  } else {
    global.FocusDndCoordinator = engine;
  }
})(typeof window !== 'undefined' ? window : this);
