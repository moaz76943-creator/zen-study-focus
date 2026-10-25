/**
 * DEEP FOCUS — Low-Battery Power Saver Mode Engine (M094)
 * File: android/app/src/main/assets/web/js/power_saver_mode_engine.js
 *
 * Dynamically throttles UI animations, throttles background frame rates,
 * activates OLED True-Black contrast, and conserves CPU/GPU energy during
 * extended study sessions on low battery.
 *
 * Core Directives & Standards:
 * - Decoupled 100-locale support with strict English-only fallback (UniversalI18nBridge)
 * - Battery API auto-detection (<= 20% and discharging) with manual overrides
 * - True-Black OLED styling (#000000) with disabled non-essential CSS/SVG animations
 * - Strict Western Arabic Digits (0123456789)
 * - Strict Hebrew Exclusion (No 'he' / 'iw' locales)
 * - Safe mock fallback for headless / test environments
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    var Bridge = require('./universal_i18n_bridge.js');
    module.exports = factory(Bridge);
  } else {
    root.PowerSaverModeEngine = factory(root.UniversalI18nBridge);
  }
}(typeof self !== 'undefined' ? self : this, function (I18n) {
  'use strict';

  var MODES = {
    AUTO: 'auto',
    ALWAYS_ON: 'always_on',
    ALWAYS_OFF: 'always_off'
  };

  var DEFAULT_THRESHOLD_PERCENT = 20;

  function translate(key, locale) {
    if (I18n && typeof I18n.t === 'function') {
      return I18n.t(key, locale);
    }
    return key;
  }

  var state = {
    mode: MODES.AUTO,
    thresholdPercent: DEFAULT_THRESHOLD_PERCENT,
    batteryLevel: 1.0,
    isCharging: false,
    isActive: false,
    oledTrueBlack: true,
    disableAuraAnimations: true,
    throttleFramePacing: true
  };

  var listeners = [];

  function evaluateActivation() {
    if (state.mode === MODES.ALWAYS_ON) {
      return true;
    }
    if (state.mode === MODES.ALWAYS_OFF) {
      return false;
    }
    var levelPercent = Math.round(state.batteryLevel * 100);
    return (!state.isCharging && levelPercent <= state.thresholdPercent);
  }

  function updateBatteryStatus(level, isCharging) {
    if (typeof level === 'number' && !isNaN(level)) {
      state.batteryLevel = Math.max(0.0, Math.min(1.0, level));
    }
    if (typeof isCharging === 'boolean') {
      state.isCharging = isCharging;
    }

    var wasActive = state.isActive;
    state.isActive = evaluateActivation();

    if (wasActive !== state.isActive) {
      notifyListeners();
    }

    return getState();
  }

  function setMode(newMode) {
    if (newMode === MODES.AUTO || newMode === MODES.ALWAYS_ON || newMode === MODES.ALWAYS_OFF) {
      state.mode = newMode;
      var wasActive = state.isActive;
      state.isActive = evaluateActivation();

      if (wasActive !== state.isActive) {
        notifyListeners();
      }
    }
    return getState();
  }

  function setThresholdPercent(percent) {
    var p = parseInt(percent, 10);
    if (!isNaN(p) && p >= 5 && p <= 50) {
      state.thresholdPercent = p;
      state.isActive = evaluateActivation();
      notifyListeners();
    }
    return getState();
  }

  function getState() {
    return {
      mode: state.mode,
      thresholdPercent: state.thresholdPercent,
      batteryLevel: state.batteryLevel,
      batteryPercent: Math.round(state.batteryLevel * 100),
      isCharging: state.isCharging,
      isActive: state.isActive,
      optimizations: {
        oledTrueBlack: state.isActive && state.oledTrueBlack,
        disableAuraAnimations: state.isActive && state.disableAuraAnimations,
        throttleFramePacing: state.isActive && state.throttleFramePacing,
        uiRepaintIntervalMs: state.isActive ? 1000 : 250
      }
    };
  }

  function getLocalizedSummary(locale) {
    var s = getState();
    var levelStr = s.batteryPercent + '%';

    var statusText = '';
    if (s.isActive) {
      statusText = translate('power_saver.status.active', locale) || 'Power Saver Active';
    } else if (s.isCharging) {
      statusText = translate('power_saver.status.charging', locale) || 'Device Charging';
    } else {
      statusText = translate('power_saver.status.normal', locale) || 'Standard Performance';
    }

    var modeLabel = '';
    if (s.mode === MODES.AUTO) {
      modeLabel = translate('power_saver.mode.auto', locale) || 'Auto (<= 20%)';
    } else if (s.mode === MODES.ALWAYS_ON) {
      modeLabel = translate('power_saver.mode.always_on', locale) || 'Always On';
    } else {
      modeLabel = translate('power_saver.mode.always_off', locale) || 'Always Off';
    }

    return {
      isActive: s.isActive,
      batteryPercentStr: levelStr,
      statusText: statusText,
      modeLabel: modeLabel,
      themeBgColor: s.isActive ? '#000000' : '#0F172A',
      accentColor: s.isActive ? '#10B981' : '#38BDF8'
    };
  }

  function onStateChange(callback) {
    if (typeof callback === 'function') {
      listeners.push(callback);
    }
  }

  function clearListeners() {
    listeners = [];
  }

  function notifyListeners() {
    var current = getState();
    for (var i = 0; i < listeners.length; i++) {
      try {
        listeners[i](current);
      } catch (e) {
      }
    }
  }

  function initBatteryObserver() {
    if (typeof navigator !== 'undefined' && typeof navigator.getBattery === 'function') {
      try {
        navigator.getBattery().then(function (battery) {
          updateBatteryStatus(battery.level, battery.charging);

          battery.addEventListener('levelchange', function () {
            updateBatteryStatus(battery.level, battery.charging);
          });

          battery.addEventListener('chargingchange', function () {
            updateBatteryStatus(battery.level, battery.charging);
          });
        }).catch(function () {
        });
        return true;
      } catch (e) {
        return false;
      }
    }
    return false;
  }

  return {
    MODES: MODES,
    DEFAULT_THRESHOLD_PERCENT: DEFAULT_THRESHOLD_PERCENT,
    getState: getState,
    updateBatteryStatus: updateBatteryStatus,
    setMode: setMode,
    setThresholdPercent: setThresholdPercent,
    getLocalizedSummary: getLocalizedSummary,
    onStateChange: onStateChange,
    clearListeners: clearListeners,
    initBatteryObserver: initBatteryObserver
  };
}));
