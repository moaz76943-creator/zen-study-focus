/**
 * DEEP FOCUS — Exam Countdown & Target Deadline Binder
 * Mission #083: Civil-day target countdown, mindful readiness tiers,
 * study hours goal progress, and calendar/task integration.
 */
(function (global) {
  'use strict';

  var READINESS_TIERS = {
    RELAXED: { id: "relaxed", nameAr: "الأفق المريح", minDays: 31 },
    STEADY: { id: "steady", nameAr: "الإيقاع المنتظم", minDays: 14 },
    FOCUSED: { id: "focused", nameAr: "التركيز المكثف", minDays: 3 },
    ZEN_READINESS: { id: "zen_readiness", nameAr: "السكينة والجاهزية", minDays: 0 }
  };

  /**
   * Sanitizes text strings defensively.
   */
  function sanitizeTitle(str) {
    if (typeof str !== 'string') return '';
    return str.trim().replace(/[<>]/g, '');
  }

  /**
   * Returns true only for a parseable civil date string (YYYY-MM-DD).
   */
  function hasValidCivilDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return false;
    return !isNaN(new Date(dateStr.split('T')[0] + 'T00:00:00Z').getTime());
  }

  /**
   * Computes the exact integer days remaining between two civil dates (YYYY-MM-DD).
   */
  function calculateDaysRemaining(targetDateStr, referenceDateStr) {
    if (!targetDateStr || typeof targetDateStr !== 'string') return 0;
    var target = new Date(targetDateStr.split('T')[0] + 'T00:00:00Z');
    var ref = referenceDateStr ? new Date(referenceDateStr.split('T')[0] + 'T00:00:00Z') : new Date();

    if (isNaN(target.getTime())) return 0;

    var targetMidnight = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());
    var refMidnight = Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate());

    var diffMs = targetMidnight - refMidnight;
    return Math.round(diffMs / 86400000);
  }

  /**
   * Evaluates readiness tier based on days remaining.
   */
  function getReadinessTier(daysRemaining) {
    var d = typeof daysRemaining === 'number' ? daysRemaining : 0;
    if (d >= 31) return READINESS_TIERS.RELAXED;
    if (d >= 14) return READINESS_TIERS.STEADY;
    if (d >= 3) return READINESS_TIERS.FOCUSED;
    return READINESS_TIERS.ZEN_READINESS;
  }

  /**
   * Evaluates an exam / deadline goal record.
   * @param {Object} examGoal - { id, title, targetDateStr, targetHours, loggedMinutes }
   * @param {string} referenceDateStr - Optional YYYY-MM-DD
   * @returns {Object} Comprehensive countdown metrics.
   */
  function evaluateExamCountdown(examGoal, referenceDateStr) {
    if (!examGoal || typeof examGoal !== 'object') return null;

    var title = sanitizeTitle(examGoal.title) || "امتحان قادم";
    var hasDeadline = hasValidCivilDate(examGoal.targetDateStr);
    var days = calculateDaysRemaining(examGoal.targetDateStr, referenceDateStr);
    var isToday = hasDeadline && days === 0;
    var isPassed = hasDeadline && days < 0;

    var loggedMins = typeof examGoal.loggedMinutes === 'number' && examGoal.loggedMinutes > 0 ? examGoal.loggedMinutes : 0;
    var loggedHours = Math.round((loggedMins / 60) * 10) / 10;
    var goalHours = typeof examGoal.targetHours === 'number' && examGoal.targetHours > 0 ? examGoal.targetHours : 20;

    var progressPercent = Math.min(100, Math.round((loggedHours / goalHours) * 100));
    var tier = getReadinessTier(days);

    var daysDigits = '\u200E' + Math.abs(days);
    var badgeTextAr = !hasDeadline ? "لم يُحدَّد الموعد" : (isToday ? "موعد الامتحان اليوم!" : (isPassed ? "انتهى الموعد" : ("باقي " + daysDigits + " يوماً")));
    var badgeTextEn = !hasDeadline ? "No deadline set" : (isToday ? "Exam is Today!" : (isPassed ? "Deadline Passed" : (daysDigits + " days remaining")));

    return {
      id: examGoal.id || ('exam_' + Date.now()),
      title: title,
      targetDate: examGoal.targetDateStr,
      daysRemaining: days,
      isToday: isToday,
      isPassed: isPassed,
      readinessTier: tier,
      loggedHours: loggedHours,
      goalHours: goalHours,
      progressPercent: progressPercent,
      badgeTextAr: badgeTextAr,
      badgeTextEn: badgeTextEn
    };
  }

  var engine = {
    READINESS_TIERS: READINESS_TIERS,
    calculateDaysRemaining: calculateDaysRemaining,
    getReadinessTier: getReadinessTier,
    evaluateExamCountdown: evaluateExamCountdown
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  } else {
    global.ExamCountdownBinder = engine;
  }
})(typeof window !== 'undefined' ? window : this);
