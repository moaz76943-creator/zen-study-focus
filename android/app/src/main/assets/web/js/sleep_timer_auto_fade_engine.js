/**
 * DEEP FOCUS — Sleep Timer & Nature Audio Auto-Fade Engine
 * Mission #086: Audio auto-stop sleep timer, 2-minute smooth fade curve,
 * battery-saving audio suspension, +15m extension, and Western digits.
 */
(function (global) {
  'use strict';

  var FADE_OUT_WINDOW_SECONDS = 120; // Last 2 minutes fade smoothly
  var EXTENSION_MINUTES = 15;

  /**
   * Initializes a sleep timer state object.
   */
  function startSleepTimer(durationMinutes, initialVolume) {
    var mins = typeof durationMinutes === 'number' && durationMinutes >= 5 && durationMinutes <= 180
      ? Math.round(durationMinutes)
      : 30;

    var vol = typeof initialVolume === 'number' && !isNaN(initialVolume)
      ? Math.max(0.0, Math.min(1.0, initialVolume))
      : 0.8;

    var totalSeconds = mins * 60;

    return {
      active: true,
      initialMinutes: mins,
      initialVolume: vol,
      totalSeconds: totalSeconds,
      remainingSeconds: totalSeconds,
      isFadingOut: false,
      isCompleted: false,
      startedAt: Date.now()
    };
  }

  /**
   * Calculates current output volume based on remaining sleep timer seconds.
   */
  function computeSleepVolume(timerState) {
    if (!timerState || !timerState.active) {
      return 0.0;
    }
    if (timerState.isCompleted || timerState.remainingSeconds <= 0) {
      return 0.0;
    }

    var initVol = timerState.initialVolume || 0.8;
    var remSecs = timerState.remainingSeconds;

    // If remaining time is within the final 2-minute fade-out window
    if (remSecs <= FADE_OUT_WINDOW_SECONDS) {
      var fadeRatio = remSecs / FADE_OUT_WINDOW_SECONDS; // Linearly scales from 1.0 down to 0.0
      var fadedVol = Math.round(initVol * fadeRatio * 100) / 100;
      return Math.max(0.0, fadedVol);
    }

    return initVol;
  }

  /**
   * Ticks down the sleep timer by N seconds.
   */
  function tickSleepTimer(timerState, elapsedSeconds) {
    if (!timerState || !timerState.active || timerState.isCompleted) {
      return timerState;
    }

    var s = Object.assign({}, timerState);
    var step = typeof elapsedSeconds === 'number' && elapsedSeconds > 0 ? elapsedSeconds : 1;

    s.remainingSeconds = Math.max(0, s.remainingSeconds - step);
    s.isFadingOut = s.remainingSeconds > 0 && s.remainingSeconds <= FADE_OUT_WINDOW_SECONDS;

    if (s.remainingSeconds === 0) {
      s.isCompleted = true;
      s.active = false;
    }

    return s;
  }

  /**
   * Extends active sleep timer by +15 minutes.
   */
  function extendSleepTimer(timerState) {
    if (!timerState) return null;
    var s = Object.assign({}, timerState);
    var addedSeconds = EXTENSION_MINUTES * 60;

    s.active = true;
    s.isCompleted = false;
    s.remainingSeconds += addedSeconds;
    s.totalSeconds += addedSeconds;
    s.isFadingOut = s.remainingSeconds <= FADE_OUT_WINDOW_SECONDS;

    return s;
  }

  /**
   * Cancels active sleep timer safely and restores initial volume.
   */
  function cancelSleepTimer(timerState) {
    var initVol = (timerState && typeof timerState.initialVolume === 'number') ? timerState.initialVolume : 0.8;
    return {
      active: false,
      isCompleted: false,
      remainingSeconds: 0,
      restoredVolume: initVol,
      reason: "USER_CANCELLED"
    };
  }

  var engine = {
    FADE_OUT_WINDOW_SECONDS: FADE_OUT_WINDOW_SECONDS,
    EXTENSION_MINUTES: EXTENSION_MINUTES,
    startSleepTimer: startSleepTimer,
    computeSleepVolume: computeSleepVolume,
    tickSleepTimer: tickSleepTimer,
    extendSleepTimer: extendSleepTimer,
    cancelSleepTimer: cancelSleepTimer
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  } else {
    global.SleepTimerAutoFadeEngine = engine;
  }
})(typeof window !== 'undefined' ? window : this);
