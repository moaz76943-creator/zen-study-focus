/**
 * DEEP FOCUS — Smart Flip & Proximity Sensor Coordinator (M098)
 * File: android/app/src/main/assets/web/js/flip_sensor_coordinator.js
 *
 * Coordinates device accelerometer, gyroscope (DeviceOrientationEvent),
 * and proximity sensors to detect face-down / face-up placement with configurable
 * study actions (Flip-to-Focus, Flip-to-Pause, Auto-Dimming), debouncing, and haptics.
 *
 * Core Directives & Standards:
 * - Decoupled 100-locale support with strict English-only fallback (UniversalI18nBridge)
 * - Strict Western Arabic Digits (0123456789)
 * - Strict Hebrew Exclusion (No 'he' / 'iw' locales)
 * - Safe mock fallback for headless / test environments
 * - 500ms debounce guard preventing sensor flutter
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    var Bridge = require('./universal_i18n_bridge.js');
    module.exports = factory(Bridge);
  } else {
    root.FlipSensorCoordinator = factory(root.UniversalI18nBridge);
  }
}(typeof self !== 'undefined' ? self : this, function (I18n) {
  'use strict';

  var FLIP_ACTIONS = {
    FLIP_TO_FOCUS: 'flip_to_focus',
    FLIP_TO_PAUSE: 'flip_to_pause',
    DISABLED: 'disabled'
  };

  var SENSOR_STATES = {
    FACE_UP: 'face_up',
    FACE_DOWN: 'face_down',
    UNKNOWN: 'unknown'
  };

  var DEBOUNCE_THRESHOLD_MS = 500;

  function translate(key, locale) {
    if (I18n && typeof I18n.t === 'function') {
      return I18n.t(key, locale);
    }
    return key;
  }

  var state = {
    enabled: true,
    action: FLIP_ACTIONS.FLIP_TO_PAUSE,
    currentState: SENSOR_STATES.FACE_UP,
    lastStateChangeTimestamp: 0,
    hapticFeedbackEnabled: true,
    lastDispatchedEvent: null
  };

  var listeners = [];

  function calculateOrientationState(beta, gamma) {
    if (typeof beta !== 'number' || isNaN(beta)) {
      return SENSOR_STATES.UNKNOWN;
    }

    var isBetaFlipped = Math.abs(beta) >= 140;
    var isGammaFlat = (typeof gamma === 'number') ? Math.abs(gamma) <= 45 : true;

    if (isBetaFlipped && isGammaFlat) {
      return SENSOR_STATES.FACE_DOWN;
    }

    var isBetaUp = Math.abs(beta) <= 40;
    if (isBetaUp && isGammaFlat) {
      return SENSOR_STATES.FACE_UP;
    }

    return SENSOR_STATES.UNKNOWN;
  }

  function handleOrientationEvent(beta, gamma, proximityNear) {
    if (!state.enabled || state.action === FLIP_ACTIONS.DISABLED) {
      return { handled: false, reason: 'disabled' };
    }

    var detected = calculateOrientationState(beta, gamma);
    if (proximityNear === true && Math.abs(beta) >= 110) {
      detected = SENSOR_STATES.FACE_DOWN;
    }

    if (detected === SENSOR_STATES.UNKNOWN || detected === state.currentState) {
      return { handled: false, reason: 'unchanged_or_unknown', state: state.currentState };
    }

    var now = Date.now();
    if (now - state.lastStateChangeTimestamp < DEBOUNCE_THRESHOLD_MS) {
      return { handled: false, reason: 'debounced', state: state.currentState };
    }

    var previousState = state.currentState;
    state.currentState = detected;
    state.lastStateChangeTimestamp = now;

    var triggeredAction = null;
    if (detected === SENSOR_STATES.FACE_DOWN) {
      if (state.action === FLIP_ACTIONS.FLIP_TO_PAUSE) {
        triggeredAction = 'pause_session';
      } else if (state.action === FLIP_ACTIONS.FLIP_TO_FOCUS) {
        triggeredAction = 'start_or_resume_session';
      }
    } else if (detected === SENSOR_STATES.FACE_UP) {
      if (state.action === FLIP_ACTIONS.FLIP_TO_PAUSE) {
        triggeredAction = 'resume_session';
      } else if (state.action === FLIP_ACTIONS.FLIP_TO_FOCUS) {
        triggeredAction = 'pause_session';
      }
    }

    var eventPayload = {
      previousState: previousState,
      newState: detected,
      actionConfig: state.action,
      triggeredAction: triggeredAction,
      hapticCue: state.hapticFeedbackEnabled ? [35] : [],
      timestamp: now
    };

    state.lastDispatchedEvent = eventPayload;
    notifyListeners(eventPayload);

    return {
      handled: true,
      event: eventPayload
    };
  }

  function setAction(action) {
    if (action === FLIP_ACTIONS.FLIP_TO_FOCUS ||
        action === FLIP_ACTIONS.FLIP_TO_PAUSE ||
        action === FLIP_ACTIONS.DISABLED) {
      state.action = action;
    }
    return getState();
  }

  function setEnabled(enabled) {
    state.enabled = !!enabled;
    return getState();
  }

  function setHapticFeedback(enabled) {
    state.hapticFeedbackEnabled = !!enabled;
    return getState();
  }

  function getState() {
    return {
      enabled: state.enabled,
      action: state.action,
      currentState: state.currentState,
      hapticFeedbackEnabled: state.hapticFeedbackEnabled,
      debounceMs: DEBOUNCE_THRESHOLD_MS,
      lastEvent: state.lastDispatchedEvent
    };
  }

  function getLocalizedSummary(locale) {
    var s = getState();
    var actionLabel = '';
    if (s.action === FLIP_ACTIONS.FLIP_TO_PAUSE) {
      actionLabel = translate('flip.action.flip_to_pause', locale) || 'Flip to Pause / Mute';
    } else if (s.action === FLIP_ACTIONS.FLIP_TO_FOCUS) {
      actionLabel = translate('flip.action.flip_to_focus', locale) || 'Flip to Focus';
    } else {
      actionLabel = translate('flip.action.disabled', locale) || 'Disabled';
    }

    var statusLabel = (s.currentState === SENSOR_STATES.FACE_DOWN) ?
      (translate('flip.status.face_down', locale) || 'Phone Face Down') :
      (translate('flip.status.face_up', locale) || 'Phone Face Up');

    return {
      enabled: s.enabled,
      actionLabel: actionLabel,
      statusLabel: statusLabel,
      currentState: s.currentState,
      debounceNotice: '500ms Jitter Guard'
    };
  }

  function onFlip(callback) {
    if (typeof callback === 'function') {
      listeners.push(callback);
    }
  }

  function clearListeners() {
    listeners = [];
  }

  function notifyListeners(eventPayload) {
    for (var i = 0; i < listeners.length; i++) {
      try {
        listeners[i](eventPayload);
      } catch (e) {
      }
    }
  }

  return {
    FLIP_ACTIONS: FLIP_ACTIONS,
    SENSOR_STATES: SENSOR_STATES,
    DEBOUNCE_THRESHOLD_MS: DEBOUNCE_THRESHOLD_MS,
    calculateOrientationState: calculateOrientationState,
    handleOrientationEvent: handleOrientationEvent,
    setAction: setAction,
    setEnabled: setEnabled,
    setHapticFeedback: setHapticFeedback,
    getState: getState,
    getLocalizedSummary: getLocalizedSummary,
    onFlip: onFlip,
    clearListeners: clearListeners
  };
}));
