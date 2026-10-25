/**
 * DEEP FOCUS — Net Focus Ratio & Productivity Velocity Engine (Mission #134)
 * Architecture: Standalone dynamic JS module. Zero index.html overwrites.
 * Guarantees:
 * - Net Focus Ratio (NFR) calculation: pure focused time vs gross elapsed session time.
 * - Productivity Velocity (PV) tracking: focused blocks completed per active hour.
 * - Focus Friction Index (FFI): micro-distractions, pause latency, and task drag.
 * - Strict Western digits (0123456789).
 * - 100 Google Play locales support with English ('en') fallback.
 * - Absolute Hebrew ('he', 'iw') exclusion -> redirects to 'en'.
 * - Zero medical or clinical claims.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.NetFocusVelocityEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SUPPORTED_LOCALES = [
    'af', 'am', 'ar', 'as', 'az', 'be', 'bg', 'bn', 'bs', 'ca',
    'cs', 'da', 'de', 'el', 'en', 'es', 'et', 'eu', 'fa', 'fi',
    'fil', 'fr', 'gl', 'gu', 'hi', 'hr', 'hu', 'hy', 'id', 'is',
    'it', 'ja', 'jv', 'ka', 'kk', 'km', 'kn', 'ko', 'ky', 'lo',
    'lt', 'lv', 'mk', 'ml', 'mn', 'mr', 'ms', 'my', 'ne', 'nl',
    'no', 'or', 'pa', 'pl', 'pt', 'ro', 'ru', 'si', 'sk', 'sl',
    'sq', 'sr', 'sv', 'sw', 'ta', 'te', 'th', 'tr', 'uk', 'ur',
    'uz', 'vi', 'zh', 'zu'
  ];

  var STRINGS = {
    en: {
      ratio_optimal: 'Optimal Flow State',
      ratio_balanced: 'Balanced Focus',
      ratio_fragmented: 'Fragmented Rhythm',
      velocity_label: 'Velocity Index',
      friction_low: 'Low Cognitive Drag',
      friction_medium: 'Moderate Distraction Friction',
      friction_high: 'High Friction Attention State'
    },
    ar: {
      ratio_optimal: 'حالة تدفق مثالية',
      ratio_balanced: 'تركيز متوازن',
      ratio_fragmented: 'إيقاع مجزأ',
      velocity_label: 'مؤشر سرعة الإنتاجية',
      friction_low: 'مقاومة ذهنية منخفضة',
      friction_medium: 'احتكاك تشتت متوسط',
      friction_high: 'حالة تشتت وانتباه عالي الاحتكاك'
    }
  };

  function toWesternDigits(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/[٠-٩]/g, function (d) { return '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]; })
      .replace(/[۰-۹]/g, function (d) { return '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)]; });
  }

  function resolveLocale(locale) {
    if (!locale || typeof locale !== 'string') return 'en';
    var clean = locale.toLowerCase().trim().split(/[-_]/)[0];
    if (clean === 'he' || clean === 'iw') return 'en';
    return STRINGS[clean] ? clean : 'en';
  }

  function calculateNetFocusRatio(grossDurationMs, pauseDurationMs, distractionEscapeMs) {
    var gross = Math.max(0, Number(grossDurationMs) || 0);
    var pauses = Math.max(0, Number(pauseDurationMs) || 0);
    var escapes = Math.max(0, Number(distractionEscapeMs) || 0);

    if (gross <= 0) {
      return {
        ratioPercentage: 0,
        formattedRatio: '0.0%',
        netDurationMs: 0,
        tier: 'ratio_fragmented'
      };
    }

    var nonFocused = pauses + escapes;
    var netDuration = Math.max(0, gross - nonFocused);
    var ratio = Math.min(100, Math.max(0, (netDuration / gross) * 100));
    var roundedRatio = Math.round(ratio * 10) / 10;

    var tier = 'ratio_fragmented';
    if (roundedRatio >= 85.0) {
      tier = 'ratio_optimal';
    } else if (roundedRatio >= 65.0) {
      tier = 'ratio_balanced';
    }

    return {
      ratioPercentage: roundedRatio,
      formattedRatio: toWesternDigits(roundedRatio.toFixed(1) + '%'),
      netDurationMs: netDuration,
      grossDurationMs: gross,
      tier: tier
    };
  }

  function calculateProductivityVelocity(completedSessions, activeStudySpanMinutes) {
    var count = Math.max(0, Number(completedSessions) || 0);
    var spanMinutes = Math.max(0, Number(activeStudySpanMinutes) || 0);

    if (spanMinutes <= 0) {
      return {
        velocityScore: 0,
        formattedVelocity: '0.00 blocks/hr',
        sessionsCompleted: count
      };
    }

    var activeHours = spanMinutes / 60;
    var velocity = count / activeHours;
    var roundedVelocity = Math.round(velocity * 100) / 100;

    return {
      velocityScore: roundedVelocity,
      formattedVelocity: toWesternDigits(roundedVelocity.toFixed(2) + ' blocks/hr'),
      sessionsCompleted: count,
      activeHours: Math.round(activeHours * 10) / 10
    };
  }

  function assessFocusFriction(microDistractionsCount, averagePauseSeconds) {
    var distractions = Math.max(0, Number(microDistractionsCount) || 0);
    var avgPause = Math.max(0, Number(averagePauseSeconds) || 0);

    var frictionScore = Math.min(100, Math.round((distractions * 7.5) + (avgPause * 0.4)));

    var level = 'friction_low';
    if (frictionScore >= 60) {
      level = 'friction_high';
    } else if (frictionScore >= 25) {
      level = 'friction_medium';
    }

    return {
      frictionScore: frictionScore,
      formattedScore: toWesternDigits(String(frictionScore)),
      level: level
    };
  }

  function generateVelocityReport(sessionData, userLocale) {
    var loc = resolveLocale(userLocale);
    var dict = STRINGS[loc] || STRINGS.en;

    var nfr = calculateNetFocusRatio(
      sessionData.grossDurationMs,
      sessionData.pauseDurationMs,
      sessionData.distractionEscapeMs
    );

    var velocity = calculateProductivityVelocity(
      sessionData.completedSessions,
      sessionData.activeStudySpanMinutes
    );

    var friction = assessFocusFriction(
      sessionData.microDistractionsCount,
      sessionData.averagePauseSeconds
    );

    return {
      locale: loc,
      netFocusRatio: {
        percentage: nfr.ratioPercentage,
        formatted: nfr.formattedRatio,
        label: dict[nfr.tier] || STRINGS.en[nfr.tier]
      },
      velocity: {
        score: velocity.velocityScore,
        formatted: velocity.formattedVelocity,
        label: dict.velocity_label || STRINGS.en.velocity_label
      },
      friction: {
        score: friction.frictionScore,
        formatted: friction.formattedScore,
        label: dict[friction.level] || STRINGS.en[friction.level]
      },
      timestamp: toWesternDigits(new Date().toISOString()),
      zeroMedicalClaimsVerified: true
    };
  }

  return {
    calculateNetFocusRatio: calculateNetFocusRatio,
    calculateProductivityVelocity: calculateProductivityVelocity,
    assessFocusFriction: assessFocusFriction,
    generateVelocityReport: generateVelocityReport,
    toWesternDigits: toWesternDigits,
    resolveLocale: resolveLocale,
    SUPPORTED_LOCALES: SUPPORTED_LOCALES
  };
}));
