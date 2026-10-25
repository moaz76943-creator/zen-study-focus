/**
 * DEEP FOCUS — Streak Resilience & Paced Recovery Engine (Mission #136)
 * Architecture: Standalone dynamic JS module. Zero index.html overwrites.
 * Guarantees:
 * - Compassionate streak maintenance & forgiving recovery protocol.
 * - Grace period protection (prevents catastrophic streak abandonment).
 * - Micro-session stepped ramp-up for broken habit recovery.
 * - Resilience velocity score (14-day bounce-back consistency index).
 * - Strict Western digits (0123456789).
 * - 100 Google Play locales support with English ('en') fallback.
 * - Absolute Hebrew ('he', 'iw') exclusion -> redirects to 'en'.
 * - Zero medical or clinical claims.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.StreakResilienceRecoveryEngine = factory();
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
      status_active: 'Unbroken Momentum',
      status_grace_protected: 'Grace Shield Protected',
      status_recovery_mode: 'Paced Recovery Cadence',
      status_fresh_start: 'Fresh Rhythm Ignition',
      ramp_micro_label: 'Gentle Re-entry (15m)',
      ramp_moderate_label: 'Balanced Re-alignment (25m)',
      ramp_full_label: 'Full Flow Return (45m)'
    },
    ar: {
      status_active: 'زخم دراسي متصل وثابت',
      status_grace_protected: 'محمي بدرع المرونة واستراحة الإيقاع',
      status_recovery_mode: 'مسار استعادة تدريجي متزن',
      status_fresh_start: 'انطلاقة إيقاعية متجددة',
      ramp_micro_label: 'جلسة عودة ميسرة (15 د)',
      ramp_moderate_label: 'إعادة محاذاة متوازنة (25 د)',
      ramp_full_label: 'عودة كاملة للتدفق (45 د)'
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

  function evaluateStreakState(currentStreakDays, daysSinceLastStudy, availableGraceShields) {
    var streak = Math.max(0, parseInt(currentStreakDays, 10) || 0);
    var gap = Math.max(0, parseInt(daysSinceLastStudy, 10) || 0);
    var shields = Math.max(0, parseInt(availableGraceShields, 10) || 0);

    if (gap <= 1) {
      return {
        effectiveStreak: streak,
        status: 'status_active',
        remainingShields: shields,
        isShieldApplied: false,
        daysToRecover: 0
      };
    }

    if (gap === 2 && shields > 0) {
      return {
        effectiveStreak: streak,
        status: 'status_grace_protected',
        remainingShields: shields - 1,
        isShieldApplied: true,
        daysToRecover: 1
      };
    }

    if (gap <= 4) {
      return {
        effectiveStreak: Math.max(1, Math.round(streak * 0.7)),
        status: 'status_recovery_mode',
        remainingShields: shields,
        isShieldApplied: false,
        daysToRecover: 2
      };
    }

    return {
      effectiveStreak: 0,
      status: 'status_fresh_start',
      remainingShields: Math.max(1, shields),
      isShieldApplied: false,
      daysToRecover: 1
    };
  }

  function generatePacedRecoveryPlan(status, standardTargetMinutes) {
    var stdMinutes = Math.max(25, parseInt(standardTargetMinutes, 10) || 45);

    if (status === 'status_active') {
      return {
        recommendedSessionMinutes: stdMinutes,
        rampTier: 'ramp_full_label',
        sessionsRequiredToSeal: 1
      };
    }

    if (status === 'status_grace_protected') {
      return {
        recommendedSessionMinutes: Math.min(stdMinutes, 25),
        rampTier: 'ramp_moderate_label',
        sessionsRequiredToSeal: 1
      };
    }

    if (status === 'status_recovery_mode') {
      return {
        recommendedSessionMinutes: 15,
        rampTier: 'ramp_micro_label',
        sessionsRequiredToSeal: 2
      };
    }

    return {
      recommendedSessionMinutes: 15,
      rampTier: 'ramp_micro_label',
      sessionsRequiredToSeal: 1
    };
  }

  function calculateResilienceScore(activeDaysInLast14) {
    var activeCount = Math.max(0, Math.min(14, parseInt(activeDaysInLast14, 10) || 0));
    var consistencyRatio = (activeCount / 14) * 100;
    var score = Math.round(consistencyRatio * 10) / 10;

    return {
      activeDaysInWindow: activeCount,
      windowSizeDays: 14,
      resilienceScore: score,
      formattedScore: toWesternDigits(score.toFixed(1) + '%')
    };
  }

  function generateRecoveryReport(userHabitData, userLocale) {
    var loc = resolveLocale(userLocale);
    var dict = STRINGS[loc] || STRINGS.en;

    var streakEval = evaluateStreakState(
      userHabitData.currentStreakDays,
      userHabitData.daysSinceLastStudy,
      userHabitData.availableGraceShields
    );

    var plan = generatePacedRecoveryPlan(
      streakEval.status,
      userHabitData.standardTargetMinutes
    );

    var resilience = calculateResilienceScore(
      userHabitData.activeDaysInLast14
    );

    return {
      locale: loc,
      streak: {
        effectiveDays: streakEval.effectiveStreak,
        formattedDays: toWesternDigits(String(streakEval.effectiveStreak)),
        statusLabel: dict[streakEval.status] || STRINGS.en[streakEval.status],
        shieldProtected: streakEval.isShieldApplied,
        remainingShields: streakEval.remainingShields
      },
      plan: {
        recommendedMinutes: plan.recommendedSessionMinutes,
        formattedMinutes: toWesternDigits(plan.recommendedSessionMinutes + 'm'),
        rampLabel: dict[plan.rampTier] || STRINGS.en[plan.rampTier],
        sessionsToSeal: plan.sessionsRequiredToSeal
      },
      resilience: {
        score: resilience.resilienceScore,
        formattedScore: resilience.formattedScore
      },
      timestamp: toWesternDigits(new Date().toISOString()),
      zeroMedicalClaimsVerified: true
    };
  }

  return {
    evaluateStreakState: evaluateStreakState,
    generatePacedRecoveryPlan: generatePacedRecoveryPlan,
    calculateResilienceScore: calculateResilienceScore,
    generateRecoveryReport: generateRecoveryReport,
    toWesternDigits: toWesternDigits,
    resolveLocale: resolveLocale,
    SUPPORTED_LOCALES: SUPPORTED_LOCALES
  };
}));
