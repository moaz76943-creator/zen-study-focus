/**
 * DEEP FOCUS — Daily Focus Rhythm & Peak Hours Discovery Engine
 * Mission #054: 24-hour distribution bins, peak productivity discovery,
 * 4 diurnal periods categorization, and Western digits formatting.
 */
(function (global) {
  'use strict';

  var PERIODS = {
    MORNING: { id: "morning", nameAr: "الصباح", startHour: 5, endHour: 11 },
    AFTERNOON: { id: "afternoon", nameAr: "الظهيرة", startHour: 12, endHour: 16 },
    EVENING: { id: "evening", nameAr: "المساء", startHour: 17, endHour: 21 },
    NIGHT: { id: "night", nameAr: "الليل", startHour: 22, endHour: 4 }
  };

  /**
   * Identifies which diurnal period an hour belongs to.
   */
  function getPeriodForHour(hour24) {
    var h = typeof hour24 === 'number' && !isNaN(hour24) ? Math.floor(hour24) % 24 : 0;
    if (h < 0) h += 24;

    if (h >= 5 && h <= 11) return PERIODS.MORNING;
    if (h >= 12 && h <= 16) return PERIODS.AFTERNOON;
    if (h >= 17 && h <= 21) return PERIODS.EVENING;
    return PERIODS.NIGHT;
  }

  /**
   * Formats hour to Western digits 24h format with LTR isolation (e.g. \u200E14:00).
   */
  function formatHourWestern(hour24) {
    var h = typeof hour24 === 'number' && isFinite(hour24) ? Math.floor(hour24) % 24 : 0;
    if (h < 0) h += 24;
    var str = String(h).padStart(2, '0') + ':00';
    return '\u200E' + str;
  }

  /**
   * Analyzes session history to map 24-hour distribution and identify peak focus.
   * @param {Array} sessions - Array of completed session objects.
   * @returns {Object} Comprehensive rhythm metrics.
   */
  function analyzeFocusRhythm(sessions) {
    var list = Array.isArray(sessions) ? sessions : [];
    
    // Initialize 24 hourly buckets (0 to 23)
    var hourlyBuckets = new Array(24);
    for (var i = 0; i < 24; i++) {
      hourlyBuckets[i] = 0;
    }

    var periodTotals = {
      morning: 0,
      afternoon: 0,
      evening: 0,
      night: 0
    };

    var totalAnalyzedMinutes = 0;

    for (var s = 0; s < list.length; s++) {
      var session = list[s];
      if (!session || typeof session !== 'object') continue;

      var duration = Math.max(0, Number(session.durationMinutes) || 0);
      if (duration === 0) continue;

      var sessionDate = new Date(session.timestamp || session.date || 0);
      if (isNaN(sessionDate.getTime()) || sessionDate.getTime() === 0) continue;

      var startHour = sessionDate.getHours();
      hourlyBuckets[startHour] += duration;
      totalAnalyzedMinutes += duration;

      var period = getPeriodForHour(startHour);
      periodTotals[period.id] += duration;
    }

    // Determine Peak Hour (highest minutes, earliest tie-breaker)
    var peakHour = 0;
    var maxHourlyMinutes = 0;
    for (var h = 0; h < 24; h++) {
      if (hourlyBuckets[h] > maxHourlyMinutes) {
        maxHourlyMinutes = hourlyBuckets[h];
        peakHour = h;
      }
    }

    // Determine Peak Period
    var peakPeriodId = "morning";
    var maxPeriodMinutes = -1;
    var periodKeys = Object.keys(periodTotals);
    for (var p = 0; p < periodKeys.length; p++) {
      var pKey = periodKeys[p];
      if (periodTotals[pKey] > maxPeriodMinutes) {
        maxPeriodMinutes = periodTotals[pKey];
        peakPeriodId = pKey;
      }
    }

    return {
      totalAnalyzedMinutes: totalAnalyzedMinutes,
      hourlyBuckets: hourlyBuckets,
      periodTotals: periodTotals,
      peakHour: peakHour,
      peakHourFormatted: formatHourWestern(peakHour),
      peakHourMinutes: maxHourlyMinutes,
      peakPeriod: PERIODS[peakPeriodId.toUpperCase()] || PERIODS.MORNING,
      hasEnoughData: totalAnalyzedMinutes >= 30
    };
  }

  var engine = {
    PERIODS: PERIODS,
    getPeriodForHour: getPeriodForHour,
    formatHourWestern: formatHourWestern,
    analyzeFocusRhythm: analyzeFocusRhythm
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  } else {
    global.DailyFocusRhythmEngine = engine;
  }
})(typeof window !== 'undefined' ? window : this);
