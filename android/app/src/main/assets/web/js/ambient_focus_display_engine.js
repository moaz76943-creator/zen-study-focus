/**
 * DEEP FOCUS — Ambient Focus Display Mode & Touch Lock Guard
 * Mission #050: Battery-saving minimalist display, accidental touch lock,
 * zero backlight glare, and Western digits timer formatting.
 */
(function (global) {
  'use strict';

  function formatAmbientTimer(remainingSeconds) {
    var secs = typeof remainingSeconds === 'number' && !isNaN(remainingSeconds) ? Math.max(0, Math.floor(remainingSeconds)) : 0;
    var mins = Math.floor(secs / 60);
    var remSecs = secs % 60;
    var mStr = String(mins).padStart(2, '0');
    var sStr = String(remSecs).padStart(2, '0');
    return '\u200E' + mStr + ':' + sStr;
  }

  function createAmbientConfig(options) {
    options = options || {};
    return {
      dimBrightness: options.dimBrightness !== undefined ? Boolean(options.dimBrightness) : true,
      keepScreenOn: options.keepScreenOn !== undefined ? Boolean(options.keepScreenOn) : true,
      touchLockEnabled: options.touchLockEnabled !== undefined ? Boolean(options.touchLockEnabled) : true,
      clockOnlyMode: Boolean(options.clockOnlyMode)
    };
  }

  function evaluateTouchUnlock(currentState, interactionEvent) {
    currentState = currentState || { locked: true, touchCount: 0 };
    if (!currentState.locked) {
      return { locked: false, actionPermitted: true, touchCount: 0 };
    }

    if (interactionEvent === 'DOUBLE_TAP' || interactionEvent === 'LONG_PRESS') {
      return { locked: false, actionPermitted: true, touchCount: 0 };
    }

    var newCount = (currentState.touchCount || 0) + 1;
    return {
      locked: true,
      actionPermitted: false,
      touchCount: newCount,
      hintAr: "اضغط مرتين لفك قفل الشاشة"
    };
  }

  var engine = {
    formatAmbientTimer: formatAmbientTimer,
    createAmbientConfig: createAmbientConfig,
    evaluateTouchUnlock: evaluateTouchUnlock
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  } else {
    global.AmbientFocusDisplayEngine = engine;
  }
})(typeof window !== 'undefined' ? window : this);
