/**
 * DEEP FOCUS — Local Gentle Notification Scheduler & Quiet Hours Guard
 * Mission #045: Offline reminder scheduling, sleep/night quiet hours
 * protection, active session deferral, and Western digits formatting.
 */
(function (global) {
  'use strict';

  function clampHour(h) {
    if (typeof h !== 'number' || isNaN(h)) return 0;
    return Math.max(0, Math.min(23, Math.floor(h)));
  }

  function clampMinute(m) {
    if (typeof m !== 'number' || isNaN(m)) return 0;
    return Math.max(0, Math.min(59, Math.floor(m)));
  }

  function formatTimeWestern(hour24, minute) {
    var h = String(clampHour(hour24)).padStart(2, '0');
    var m = String(clampMinute(minute)).padStart(2, '0');
    return '\u200E' + h + ':' + m;
  }

  /**
   * Checks if currentHour falls within [startHour, endHour).
   * Supports overnight ranges (e.g., 22:00 to 07:00).
   */
  function isWithinQuietHours(currentHour, quietStart, quietEnd) {
    var cur = clampHour(currentHour);
    var start = clampHour(quietStart !== undefined ? quietStart : 22);
    var end = clampHour(quietEnd !== undefined ? quietEnd : 7);

    if (start === end) return false;
    if (start > end) {
      // Overnight span (e.g. 22 to 7)
      return cur >= start || cur < end;
    }
    return cur >= start && cur < end;
  }

  /**
   * Evaluates whether a scheduled gentle reminder should trigger now.
   */
  function evaluateReminderDispatch(reminder, context) {
    reminder = reminder || {};
    context = context || {};

    if (reminder.enabled === false) {
      return { status: "DISABLED", shouldTrigger: false };
    }

    if (context.isSessionActive) {
      return { status: "DEFERRED_ACTIVE_SESSION", shouldTrigger: false };
    }

    var currentH = context.currentHour24 !== undefined ? context.currentHour24 : 12;
    var qStart = context.quietStartHour !== undefined ? context.quietStartHour : 22;
    var qEnd = context.quietEndHour !== undefined ? context.quietEndHour : 7;

    if (isWithinQuietHours(currentH, qStart, qEnd)) {
      return { status: "SUPPRESSED_QUIET_HOURS", shouldTrigger: false };
    }

    return {
      status: "READY_TO_TRIGGER",
      shouldTrigger: true,
      title: reminder.titleAr || reminder.title || "حان وقت جلسة التركيز الهادئة",
      formattedTime: formatTimeWestern(reminder.hour24 !== undefined ? reminder.hour24 : currentH, reminder.minute || 0)
    };
  }

  var engine = {
    clampHour: clampHour,
    clampMinute: clampMinute,
    formatTimeWestern: formatTimeWestern,
    isWithinQuietHours: isWithinQuietHours,
    evaluateReminderDispatch: evaluateReminderDispatch
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  } else {
    global.GentleNotificationScheduler = engine;
  }
})(typeof window !== 'undefined' ? window : this);
