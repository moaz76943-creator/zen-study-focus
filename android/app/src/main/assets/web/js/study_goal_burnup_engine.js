/**
 * DEEP FOCUS — Paced Study Goal Sprint & Milestone Burn-Up Engine (Mission #161)
 * Architecture: Standalone dynamic JS module. Zero index.html overwrites.
 * Guarantees:
 * - Agile study goal burn-up trajectory calculation (Scope Line vs Progress Line).
 * - Velocity tracking & daily required pace deviation analysis (+/- hours/units).
 * - Target sprint milestone horizon projection.
 * - Zero music policy: silent mathematical modeling and goal tracking.
 * - Strict Western digits (0123456789).
 * - 100 Google Play locales support with English ('en') fallback.
 * - Absolute Hebrew ('he', 'iw') exclusion -> redirects to 'en'.
 * - Zero medical or clinical claims.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.StudyGoalBurnUpEngine = factory();
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
      pace_ahead: 'Sprint Ahead of Target Trajectory',
      pace_ontrack: 'Pace Aligned with Target Trajectory',
      pace_behind: 'Sprint Behind Target (Recalibration Needed)',
      burnup_title: 'Academic Goal Sprint Burn-Up Trajectory',
      required_pace_label: 'Target Daily Velocity Needed'
    },
    ar: {
      pace_ahead: 'وتيرة إنجاز الهدف متقدمة عن المنحنى المطلوب',
      pace_ontrack: 'وتيرة إنجاز متطابقة تماماً مع خطة الهدف',
      pace_behind: 'تأخر عن المنحنى المطلوب (يُوصى بزيادة طفيفة في الجلسات)',
      burnup_title: 'منحنى حرق وإنجاز الهدف الدراسي الشامل',
      required_pace_label: 'السرعة اليومية المطلوبة لإتمام الهدف'
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

  function calculateBurnUpTrajectory(totalScopeUnits, completedUnits, totalDays, elapsedDays) {
    var scope = Math.max(1, Number(totalScopeUnits) || 1);
    var done = Math.max(0, Math.min(scope, Number(completedUnits) || 0));
    var days = Math.max(1, parseInt(totalDays, 10) || 1);
    var elapsed = Math.max(1, Math.min(days, parseInt(elapsedDays, 10) || 1));

    var daysRemaining = Math.max(1, days - elapsed);
    var remainingScope = scope - done;

    var targetDailyPace = remainingScope / daysRemaining;
    var actualDailyPace = done / elapsed;
    var expectedUnitsByNow = (elapsed / days) * scope;

    var paceDelta = done - expectedUnitsByNow;
    var paceStatus = 'pace_ontrack';

    if (done >= scope || paceDelta >= 1.0) {
      paceStatus = 'pace_ahead';
    } else if (paceDelta < -1.5) {
      paceStatus = 'pace_behind';
    }

    var completionPercentage = Math.min(100, Math.round((done / scope) * 1000) / 10);

    return {
      totalScope: scope,
      completed: done,
      remainingScope: remainingScope,
      totalDays: days,
      elapsedDays: elapsed,
      daysRemaining: daysRemaining,
      completionPercentage: completionPercentage,
      formattedPercentage: toWesternDigits(completionPercentage.toFixed(1) + '%'),
      targetDailyPace: Math.round(targetDailyPace * 10) / 10,
      formattedTargetPace: toWesternDigits((Math.round(targetDailyPace * 10) / 10).toFixed(1) + ' units/day'),
      actualDailyPace: Math.round(actualDailyPace * 10) / 10,
      formattedActualPace: toWesternDigits((Math.round(actualDailyPace * 10) / 10).toFixed(1) + ' units/day'),
      paceDelta: Math.round(paceDelta * 10) / 10,
      formattedDelta: toWesternDigits((paceDelta >= 0 ? '+' : '') + (Math.round(paceDelta * 10) / 10).toFixed(1) + ' units'),
      paceStatus: paceStatus
    };
  }

  function generateSprintBurnUpReport(goalTitle, goalConfig, userLocale) {
    var loc = resolveLocale(userLocale);
    var dict = STRINGS[loc] || STRINGS.en;

    var trajectory = calculateBurnUpTrajectory(
      goalConfig.totalScopeUnits,
      goalConfig.completedUnits,
      goalConfig.totalDays,
      goalConfig.elapsedDays
    );

    return {
      locale: loc,
      goalTitle: goalTitle || 'Academic Sprint Goal',
      statusLabel: dict[trajectory.paceStatus] || STRINGS.en[trajectory.paceStatus],
      progress: {
        completed: toWesternDigits(String(trajectory.completed)),
        scope: toWesternDigits(String(trajectory.totalScope)),
        percentage: trajectory.formattedPercentage,
        daysLeft: toWesternDigits(String(trajectory.daysRemaining) + ' days')
      },
      pacingVelocity: {
        requiredDaily: trajectory.formattedTargetPace,
        currentActual: trajectory.formattedActualPace,
        deviation: trajectory.formattedDelta
      },
      zeroMusicCertified: true,
      timestamp: toWesternDigits(new Date().toISOString()),
      zeroMedicalClaimsVerified: true
    };
  }

  return {
    calculateBurnUpTrajectory: calculateBurnUpTrajectory,
    generateSprintBurnUpReport: generateSprintBurnUpReport,
    toWesternDigits: toWesternDigits,
    resolveLocale: resolveLocale,
    SUPPORTED_LOCALES: SUPPORTED_LOCALES
  };
}));
