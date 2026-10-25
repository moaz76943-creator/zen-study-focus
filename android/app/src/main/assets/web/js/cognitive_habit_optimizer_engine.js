/**
 * DEEP FOCUS — Predictive Cognitive Habit & Study Schedule Optimizer Engine
 * Cycle: CYCLE-126 (Mission #126)
 * Architecture: v21 Data Fortress Safe, Peak Cognitive Window Discovery & Habit Scoring
 * Strict Rules:
 *  - 100-Locale Support with Strict English-Only Fallback
 *  - Absolute Hebrew Exclusion (he, iw -> en)
 *  - Strict Western Digits 0123456789
 *  - Zero Medical / Clinical Claims (Productivity Pacing Only)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CognitiveHabitOptimizerEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const TIME_WINDOWS = {
    EARLY_MORNING: { id: 'EARLY_MORNING', startHour: 5, endHour: 9 },
    MID_MORNING: { id: 'MID_MORNING', startHour: 9, endHour: 13 },
    AFTERNOON: { id: 'AFTERNOON', startHour: 13, endHour: 17 },
    EVENING: { id: 'EVENING', startHour: 17, endHour: 21 },
    LATE_NIGHT: { id: 'LATE_NIGHT', startHour: 21, endHour: 24 }
  };

  const I18N_STRINGS = {
    en: {
      peak_window_title: "Peak Focus Window",
      consistency_score_title: "Habit Regularity Index",
      recommended_slot_label: "Recommended Session Slot: {timeRange}",
      optimal_duration_label: "Target Session Duration: {duration} min",
      window_early_morning: "Early Morning (05:00 - 09:00)",
      window_mid_morning: "Mid-Morning Flow (09:00 - 13:00)",
      window_afternoon: "Afternoon Focus (13:00 - 17:00)",
      window_evening: "Evening Focus (17:00 - 21:00)",
      window_late_night: "Late Night Deep Dive (21:00 - 24:00)",
      insufficient_data: "Collecting session insights to discover your peak focus windows."
    },
    ar: {
      peak_window_title: "فترة ذروة الاستيعاب الذهني",
      consistency_score_title: "مؤشر انتظام واستمرارية العادة",
      recommended_slot_label: "الفترة المقترحة للجلسة: {timeRange}",
      optimal_duration_label: "المدة المثالية المقترحة: {duration} دقيقة",
      window_early_morning: "الصباح الباكر (05:00 - 09:00)",
      window_mid_morning: "منتصف الصباح المتدفق (09:00 - 13:00)",
      window_afternoon: "فترة بعد الظهر (13:00 - 17:00)",
      window_evening: "فترة المساء (17:00 - 21:00)",
      window_late_night: "جلسة الليل الهادئة (21:00 - 24:00)",
      insufficient_data: "جاري جمع بيانات الجلسات لاكتشاف فترات ذروة التركيز الخاصة بك."
    }
  };

  function sanitizeLocale(locale) {
    if (!locale || typeof locale !== 'string') return 'en';
    const clean = locale.toLowerCase().trim().split(/[-_]/)[0];
    if (clean === 'he' || clean === 'iw') {
      return 'en';
    }
    return clean;
  }

  function toWesternDigits(num, decimals = 0) {
    const val = Number(num);
    if (isNaN(val)) return '0';
    return decimals > 0 ? val.toFixed(decimals) : Math.round(val).toString();
  }

  function getLocalizedText(locale, key) {
    const clean = sanitizeLocale(locale);
    const dict = (clean === 'ar') ? I18N_STRINGS.ar : I18N_STRINGS.en;
    return dict[key] || I18N_STRINGS.en[key] || '';
  }

  function resolveTimeWindow(hour) {
    const h = parseInt(hour, 10);
    if (isNaN(h)) return TIME_WINDOWS.MID_MORNING;
    if (h >= 5 && h < 9) return TIME_WINDOWS.EARLY_MORNING;
    if (h >= 9 && h < 13) return TIME_WINDOWS.MID_MORNING;
    if (h >= 13 && h < 17) return TIME_WINDOWS.AFTERNOON;
    if (h >= 17 && h < 21) return TIME_WINDOWS.EVENING;
    return TIME_WINDOWS.LATE_NIGHT;
  }

  function analyzeHabitPatterns(sessionsList = []) {
    const list = Array.isArray(sessionsList) ? sessionsList : [];
    if (list.length === 0) {
      return {
        hasData: false,
        peakWindow: TIME_WINDOWS.MID_MORNING.id,
        regularityScore: 70,
        regularityFormatted: '70%',
        recommendedDurationMinutes: 45,
        recommendedDurationFormatted: '45',
        windowStats: {}
      };
    }

    const windowBuckets = {
      EARLY_MORNING: { count: 0, totalMinutes: 0, qualitySum: 0 },
      MID_MORNING: { count: 0, totalMinutes: 0, qualitySum: 0 },
      AFTERNOON: { count: 0, totalMinutes: 0, qualitySum: 0 },
      EVENING: { count: 0, totalMinutes: 0, qualitySum: 0 },
      LATE_NIGHT: { count: 0, totalMinutes: 0, qualitySum: 0 }
    };

    let totalDurationMinutes = 0;

    list.forEach(s => {
      if (!s) return;
      const durMins = Math.max(1, Math.round((parseInt(s.durationSeconds, 10) || 1500) / 60));
      totalDurationMinutes += durMins;

      let hour = 10;
      if (s.startTime) {
        hour = new Date(s.startTime).getHours();
      } else if (s.time) {
        hour = parseInt(s.time.split(':')[0], 10) || 10;
      }

      const win = resolveTimeWindow(hour);
      const b = windowBuckets[win.id];
      b.count++;
      b.totalMinutes += durMins;
      b.qualitySum += (s.qualityScore !== undefined ? Number(s.qualityScore) : 80);
    });

    let bestWindow = 'MID_MORNING';
    let highestScore = -1;

    Object.keys(windowBuckets).forEach(w => {
      const b = windowBuckets[w];
      if (b.count > 0) {
        const avgQuality = b.qualitySum / b.count;
        const compositeScore = (avgQuality * 0.7) + (Math.min(100, b.totalMinutes / 2) * 0.3);
        if (compositeScore > highestScore) {
          highestScore = compositeScore;
          bestWindow = w;
        }
      }
    });

    const sortedCounts = Object.values(windowBuckets).map(b => b.count).sort((a, b) => b - a);
    const top2Count = (sortedCounts[0] || 0) + (sortedCounts[1] || 0);
    const regularityScore = Math.min(100, Math.round((top2Count / list.length) * 100));

    const avgDuration = Math.round(totalDurationMinutes / list.length);
    const recommendedDurationMinutes = Math.max(25, Math.min(60, avgDuration));

    return {
      hasData: true,
      peakWindow: bestWindow,
      regularityScore,
      regularityFormatted: `${toWesternDigits(regularityScore)}%`,
      recommendedDurationMinutes,
      recommendedDurationFormatted: toWesternDigits(recommendedDurationMinutes),
      totalSessionsAnalyzed: list.length,
      windowStats: windowBuckets
    };
  }

  return {
    TIME_WINDOWS,
    resolveTimeWindow,
    analyzeHabitPatterns,
    sanitizeLocale,
    toWesternDigits,
    getLocalizedText
  };
}));
