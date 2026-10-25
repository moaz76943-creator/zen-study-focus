/**
 * DEEP FOCUS — Predictive Focus Fatigue & Dynamic Break Pacer Engine
 * Cycle: CYCLE-114 (Mission #114)
 * Architecture: v21 Data Fortress Safe, Cognitive Load Modeling & Rest Pacing
 * Strict Rules:
 *  - 100-Locale Support with Strict English-Only Fallback
 *  - Absolute Hebrew Exclusion (he, iw -> en)
 *  - Strict Western Digits 0123456789
 *  - Zero Medical / Clinical Claims (Ergonomic Pacing Only)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PredictiveFatigueBreakPacerEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const FATIGUE_TIERS = {
    FRESH: { id: 'FRESH', minScore: 0, maxScore: 35 },
    MODERATE: { id: 'MODERATE', minScore: 36, maxScore: 69 },
    EXHAUSTED: { id: 'EXHAUSTED', minScore: 70, maxScore: 100 }
  };

  const BREAK_ACTIVITIES = {
    EYE_REST: 'EYE_REST',
    HYDRATION_SIP: 'HYDRATION_SIP',
    MOBILITY_STRETCH: 'MOBILITY_STRETCH',
    BREATH_PACER: 'BREATH_PACER',
    MINDFUL_WALK: 'MINDFUL_WALK'
  };

  const I18N_STRINGS = {
    en: {
      tier_fresh: "Fresh & Energized",
      tier_moderate: "Moderate Load",
      tier_exhausted: "High Focus Strain",
      break_recommendation: "Recommended break: {minutes} minutes.",
      activity_eye_rest: "20-20-20 Eye Rest (Gaze 20 feet away)",
      activity_hydration: "Mindful Water Intake (Hydrate)",
      activity_stretch: "Gentle Neck & Shoulder Mobility",
      activity_breath: "Tactile Breath Pacer (4-7-8)",
      activity_walk: "Short Mindful Walk (Unplugged)"
    },
    ar: {
      tier_fresh: "نشاط وصفاء ذهني",
      tier_moderate: "جهد تركيز معتدل",
      tier_exhausted: "إجهاد تركيز مرتفع",
      break_recommendation: "مدة الاستراحة المقترحة: {minutes} دقيقة.",
      activity_eye_rest: "راحة العين 20-20-20 (النظر للأفق)",
      activity_hydration: "شرب كوب ماء بروية",
      activity_stretch: "إطالة خفيفة للرقبة والكتفين",
      activity_breath: "تمرين التنفس الهادئ (4-7-8)",
      activity_walk: "مشية هادئة قصيرة لتجديد النشاط"
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

  function calculateFatigueScore(sessionMinutes, consecutiveSessionsCount = 1, frictionCount = 0, currentHour = 14) {
    const mins = Math.max(0, parseInt(sessionMinutes, 10) || 0);
    const streak = Math.max(1, parseInt(consecutiveSessionsCount, 10) || 1);
    const frictions = Math.max(0, parseInt(frictionCount, 10) || 0);
    const hour = parseInt(currentHour, 10) || 14;

    let base = Math.min(60, mins * 0.6);
    const streakBonus = (streak - 1) * 12;
    const frictionPenalty = Math.min(20, frictions * 4);

    let circadianMod = 0;
    if (hour >= 22 || hour < 4) {
      circadianMod = 12;
    } else if (hour >= 13 && hour <= 15) {
      circadianMod = 5;
    }

    const rawScore = Math.round(base + streakBonus + frictionPenalty + circadianMod);
    const score = Math.max(0, Math.min(100, rawScore));

    let tier = FATIGUE_TIERS.FRESH.id;
    if (score >= FATIGUE_TIERS.EXHAUSTED.minScore) {
      tier = FATIGUE_TIERS.EXHAUSTED.id;
    } else if (score >= FATIGUE_TIERS.MODERATE.minScore) {
      tier = FATIGUE_TIERS.MODERATE.id;
    }

    return {
      score,
      scoreFormatted: toWesternDigits(score),
      tier
    };
  }

  function recommendBreak(fatigueMetrics, sessionMinutes) {
    const score = (fatigueMetrics && fatigueMetrics.score !== undefined) ? fatigueMetrics.score : 40;
    const mins = Math.max(0, parseInt(sessionMinutes, 10) || 0);

    let breakMinutes = 5;
    let activities = [];

    if (score < 35 && mins <= 30) {
      breakMinutes = 4;
      activities = [BREAK_ACTIVITIES.EYE_REST, BREAK_ACTIVITIES.HYDRATION_SIP];
    } else if (score < 70 && mins <= 60) {
      breakMinutes = 8;
      activities = [BREAK_ACTIVITIES.EYE_REST, BREAK_ACTIVITIES.MOBILITY_STRETCH, BREAK_ACTIVITIES.HYDRATION_SIP];
    } else if (score >= 70 || mins > 60) {
      breakMinutes = Math.min(25, Math.round(mins * 0.25) + 5);
      activities = [BREAK_ACTIVITIES.MOBILITY_STRETCH, BREAK_ACTIVITIES.BREATH_PACER, BREAK_ACTIVITIES.MINDFUL_WALK];
    }

    return {
      breakMinutes,
      breakMinutesFormatted: toWesternDigits(breakMinutes),
      suggestedActivities: activities,
      fatigueScore: score,
      tier: fatigueMetrics.tier
    };
  }

  return {
    FATIGUE_TIERS,
    BREAK_ACTIVITIES,
    calculateFatigueScore,
    recommendBreak,
    sanitizeLocale,
    toWesternDigits,
    getLocalizedText
  };
}));
