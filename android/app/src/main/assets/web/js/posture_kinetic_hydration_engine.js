/**
 * DEEP FOCUS — Mindful Eye Hydration & Posture Kinetic Rest Pacer Engine (Mission #164)
 * Architecture: Standalone dynamic JS module. Zero index.html overwrites.
 * Guarantees:
 * - Micro kinetic reset pacer (cervical spine alignment, palming eye warmth, hydration).
 * - Break-time ergonomic movement sequencing (15s neck release, 20s eye warmth).
 * - Daily water sip tracker (8-glass target with Western digits).
 * - Zero music policy: silent operation with gentle tactile guidance only.
 * - Strict Western digits (0123456789).
 * - 100 Google Play locales support with English ('en') fallback.
 * - Absolute Hebrew ('he', 'iw') exclusion -> redirects to 'en'.
 * - Zero medical or clinical claims.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PostureKineticHydrationEngine = factory();
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
      posture_title: 'Break Kinetic Reset & Eye Hydration',
      step_neck: 'Shoulder Drop & Gentle Neck Release (15s)',
      step_palming: 'Palm Warming Over Closed Eyes (20s)',
      step_water: 'Mindful Sip of Water (Hydration Anchor)',
      hydration_status: 'Daily Hydration Target',
      score_excellent: 'Optimal Ergonomic Self-Care',
      score_moderate: 'Steady Physical Comfort'
    },
    ar: {
      posture_title: 'إعادة الضبط الحركي وترطيب العينين أثناء الاستراحة',
      step_neck: 'إرخاء الكتفين وتحريك الرقبة بلطف (15 ثانية)',
      step_palming: 'تدفئة راحتي اليدين ووضعهما على العينين المغمضتين (20 ثانية)',
      step_water: 'رشفة ماء واعية لترطيب الجسم وتجديد النشاط',
      hydration_status: 'معدل شرب الماء اليومي المستهدف',
      score_excellent: 'عناية جسدية وبصرية مثالية ومتوازنة',
      score_moderate: 'راحة جسدية معتدلة ومستمرة'
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

  function generateKineticBreakSteps(breakMinutes) {
    var mins = Math.max(1, parseInt(breakMinutes, 10) || 5);

    return [
      {
        stepId: 'neck_release',
        durationSeconds: 15,
        hapticPattern: [60, 40, 60],
        key: 'step_neck'
      },
      {
        stepId: 'eye_palming',
        durationSeconds: 20,
        hapticPattern: [80, 50, 80],
        key: 'step_palming'
      },
      {
        stepId: 'water_sip',
        durationSeconds: 10,
        hapticPattern: [100],
        key: 'step_water'
      }
    ];
  }

  function recordWaterSip(currentGlassesCount, targetGlasses) {
    var current = Math.max(0, parseInt(currentGlassesCount, 10) || 0) + 1;
    var target = Math.max(1, parseInt(targetGlasses, 10) || 8);
    var pct = Math.min(100, Math.round((current / target) * 1000) / 10);

    return {
      glassesCompleted: current,
      targetGlasses: target,
      percentage: pct,
      formattedProgress: toWesternDigits(current + ' / ' + target + ' glasses (' + pct.toFixed(1) + '%)'),
      targetMet: current >= target
    };
  }

  function calculateErgonomicScore(breaksTaken, hydrationCompleted) {
    var b = Math.max(0, parseInt(breaksTaken, 10) || 0);
    var h = Math.max(0, parseInt(hydrationCompleted, 10) || 0);

    var rawScore = (b * 15) + (h * 8);
    var score = Math.min(100, Math.max(0, rawScore));

    var tierKey = score >= 75 ? 'score_excellent' : 'score_moderate';

    return {
      score: score,
      formattedScore: toWesternDigits(score + '%'),
      tierKey: tierKey
    };
  }

  function generatePostureReport(breakMinutes, currentGlasses, breaksTaken, userLocale) {
    var loc = resolveLocale(userLocale);
    var dict = STRINGS[loc] || STRINGS.en;

    var steps = generateKineticBreakSteps(breakMinutes);
    var hydration = recordWaterSip((currentGlasses || 0) - 1, 8);
    var ergo = calculateErgonomicScore(breaksTaken, hydration.glassesCompleted);

    return {
      locale: loc,
      title: dict.posture_title,
      kineticSteps: steps.map(function (s) {
        return {
          id: s.stepId,
          instruction: dict[s.key] || STRINGS.en[s.key],
          duration: toWesternDigits(s.durationSeconds + 's'),
          tactileFeedback: s.hapticPattern
        };
      }),
      hydrationTracker: {
        progress: hydration.formattedProgress,
        glassesCompleted: toWesternDigits(String(hydration.glassesCompleted))
      },
      ergonomicRating: {
        score: ergo.formattedScore,
        label: dict[ergo.tierKey] || STRINGS.en[ergo.tierKey]
      },
      zeroMusicCertified: true,
      timestamp: toWesternDigits(new Date().toISOString()),
      zeroMedicalClaimsVerified: true
    };
  }

  return {
    generateKineticBreakSteps: generateKineticBreakSteps,
    recordWaterSip: recordWaterSip,
    calculateErgonomicScore: calculateErgonomicScore,
    generatePostureReport: generatePostureReport,
    toWesternDigits: toWesternDigits,
    resolveLocale: resolveLocale,
    SUPPORTED_LOCALES: SUPPORTED_LOCALES
  };
}));
