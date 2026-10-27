/**
 * DEEP FOCUS — Reading Speed & Page Absorption Tracker Engine
 * Cycle: CYCLE-115 (Mission #115)
 * Architecture: v21 Data Fortress Safe, Pace Estimation & Study Material Progress
 * Strict Rules:
 *  - 100-Locale Support with Strict English-Only Fallback
 *  - Absolute Hebrew Exclusion (he, iw -> en)
 *  - Strict Western Digits 0123456789
 *  - 100% Offline (Local Material Tracker)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ReadingSpeedAbsorptionEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DEFAULTS = {
    wordsPerPageEstimate: 250,
    optimalWpmMin: 180,
    optimalWpmMax: 320
  };

  const I18N_STRINGS = {
    en: {
      pace_label: "Pace: {pace} min/page",
      speed_label: "Reading Speed: {wpm} WPM",
      pages_completed_label: "{pages} pages completed",
      remaining_time_label: "Estimated time to finish: {hours} hours",
      absorption_high: "Deep Absorption",
      absorption_balanced: "Balanced Flow",
      absorption_skim: "Rapid Skim / Light Review"
    },
    ar: {
      pace_label: "معدل القراءة: {pace} دقيقة/صفحة",
      speed_label: "سرعة القراءة: {wpm} كلمة/دقيقة",
      pages_completed_label: "تم إنجاز {pages} صفحة",
      remaining_time_label: "الوقت التقديري لإنهاء المادة: {hours} ساعة",
      absorption_high: "استيعاب وفهم عميق",
      absorption_balanced: "تدفق متوازن",
      absorption_skim: "تصفح سريع / مراجعة عابرة"
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

  function calculateReadingMetrics(startPage, endPage, durationMinutes, customWordsPerPage = 250) {
    const start = Math.max(1, parseInt(startPage, 10) || 1);
    const end = Math.max(start, parseInt(endPage, 10) || start);
    const parsedDuration = parseFloat(durationMinutes);
    const mins = Number.isFinite(parsedDuration) ? Math.max(1, parsedDuration) : 1;
    const wpp = Math.max(50, parseInt(customWordsPerPage, 10) || DEFAULTS.wordsPerPageEstimate);

    const pagesRead = (end - start) + 1;
    const paceMinutesPerPage = Number((mins / pagesRead).toFixed(2));
    const estimatedTotalWords = pagesRead * wpp;
    const wpm = Math.round(estimatedTotalWords / mins);

    let paceTier = 'BALANCED';
    if (wpm < DEFAULTS.optimalWpmMin) {
      paceTier = 'DEEP_STUDY';
    } else if (wpm > DEFAULTS.optimalWpmMax) {
      paceTier = 'RAPID_SKIM';
    }

    return {
      pagesRead,
      pagesReadFormatted: toWesternDigits(pagesRead),
      durationMinutes: mins,
      durationFormatted: toWesternDigits(mins, 1),
      paceMinutesPerPage,
      paceFormatted: toWesternDigits(paceMinutesPerPage, 2),
      wpm,
      wpmFormatted: toWesternDigits(wpm),
      estimatedTotalWords,
      paceTier
    };
  }

  function calculateMaterialProgress(currentPage, totalPages, paceMinutesPerPage = 2.5) {
    const current = Math.max(0, parseInt(currentPage, 10) || 0);
    const total = Math.max(current, parseInt(totalPages, 10) || current);
    const pace = Math.max(0.2, parseFloat(paceMinutesPerPage) || 2.5);

    const remainingPages = Math.max(0, total - current);
    const progressPct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 100;
    const estimatedRemainingMinutes = Math.round(remainingPages * pace);
    const estimatedRemainingHours = Number((estimatedRemainingMinutes / 60).toFixed(1));

    return {
      currentPage: current,
      totalPages: total,
      remainingPages,
      progressPct,
      estimatedRemainingMinutes,
      estimatedRemainingHours,
      progressFormatted: `${toWesternDigits(progressPct)}%`,
      remainingPagesFormatted: toWesternDigits(remainingPages),
      remainingHoursFormatted: toWesternDigits(estimatedRemainingHours, 1)
    };
  }

  return {
    DEFAULTS,
    calculateReadingMetrics,
    calculateMaterialProgress,
    sanitizeLocale,
    toWesternDigits,
    getLocalizedText
  };
}));
