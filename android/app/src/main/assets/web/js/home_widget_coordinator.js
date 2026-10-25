/**
 * DEEP FOCUS — Android Home Screen Widget Coordinator
 * Mission #061: AppWidget contracts (Quick Launch & Mini Timer),
 * battery-safe state dispatch, deep-link intents, and fallback storage.
 */
(function (global) {
  'use strict';

  var WIDGET_TYPES = {
    QUICK_START: "QUICK_START_WIDGET",
    MINI_TIMER: "MINI_TIMER_WIDGET"
  };

  var TIMER_STATES = {
    IDLE: "IDLE",
    RUNNING: "RUNNING",
    PAUSED: "PAUSED"
  };

  /**
   * Formats seconds to Western digits MM:SS with LTR mark.
   */
  function formatWidgetTime(seconds) {
    var secs = typeof seconds === 'number' && !isNaN(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
    var mins = Math.floor(secs / 60);
    var rem = secs % 60;
    var mStr = String(mins).padStart(2, '0');
    var sStr = String(rem).padStart(2, '0');
    return '\u200E' + mStr + ':' + sStr;
  }

  /**
   * Generates a clean state payload for the Android Widget.
   */
  function generateWidgetStatePayload(context) {
    context = context || {};
    var timerState = context.timerState || TIMER_STATES.IDLE;
    var remainingSeconds = typeof context.remainingSeconds === 'number' ? Math.max(0, context.remainingSeconds) : 1500;
    var streakDays = typeof context.streakDays === 'number' ? Math.max(0, context.streakDays) : 0;
    var todayTaskTitle = typeof context.todayTaskTitle === 'string' && context.todayTaskTitle.trim()
      ? context.todayTaskTitle.trim()
      : "جلسة تركيز حرة";

    return {
      version: 21,
      timestamp: Date.now(),
      timerState: timerState,
      remainingSeconds: remainingSeconds,
      formattedTime: formatWidgetTime(remainingSeconds),
      streakDays: streakDays,
      streakFormatted: '\u200E' + streakDays + ' يوم',
      todayTaskTitle: todayTaskTitle,
      canStart: timerState === TIMER_STATES.IDLE || timerState === TIMER_STATES.PAUSED,
      canPause: timerState === TIMER_STATES.RUNNING
    };
  }

  /**
   * Dispatches the widget payload safely to the Android Bridge or fallback.
   */
  function dispatchToNativeWidget(payload, bridgeObj) {
    var bridge = bridgeObj || (typeof window !== 'undefined' && window.ZenWidgetBridge ? window.ZenWidgetBridge : null);
    var serialized = JSON.stringify(payload);

    if (bridge && typeof bridge.updateWidgetData === 'function') {
      try {
        bridge.updateWidgetData(serialized);
        return { dispatched: true, target: "NATIVE_BRIDGE" };
      } catch (err) {
        return { dispatched: false, target: "BRIDGE_ERROR", error: String(err) };
      }
    }

    return { dispatched: true, target: "LOCAL_FALLBACK", payload: payload };
  }

  /**
   * Resolves incoming deep-link action from an Android widget click.
   */
  function resolveWidgetAction(actionIntentString) {
    var action = String(actionIntentString || '').trim();

    if (action === 'ZEN_WIDGET_START') {
      return { handled: true, event: 'START_TIMER', defaultDurationMinutes: 25 };
    }
    if (action === 'ZEN_WIDGET_PAUSE') {
      return { handled: true, event: 'PAUSE_TIMER' };
    }
    if (action === 'ZEN_WIDGET_RESUME') {
      return { handled: true, event: 'RESUME_TIMER' };
    }
    if (action === 'ZEN_WIDGET_OPEN_TODAY') {
      return { handled: true, event: 'NAVIGATE_DESTINATION', destinationId: 'tasks' };
    }

    return { handled: false, event: 'NOOP' };
  }

  var engine = {
    WIDGET_TYPES: WIDGET_TYPES,
    TIMER_STATES: TIMER_STATES,
    formatWidgetTime: formatWidgetTime,
    generateWidgetStatePayload: generateWidgetStatePayload,
    dispatchToNativeWidget: dispatchToNativeWidget,
    resolveWidgetAction: resolveWidgetAction
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  } else {
    global.HomeWidgetCoordinator = engine;
  }
})(typeof window !== 'undefined' ? window : this);
