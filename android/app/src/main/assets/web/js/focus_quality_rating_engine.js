/**
 * DEEP FOCUS — In-Session Friction & Focus Quality Rating Engine
 * Cycle: CYCLE-105 (Mission #105)
 * Architecture: v21 Data Fortress Safe, Zero Medical Claims, Pure Focus Habit Optimization
 * Strict Rules:
 *  - 100-Locale Support with Strict English-Only Fallback
 *  - Absolute Hebrew Exclusion (he, iw -> en)
 *  - Strict Western Digits 0123456789
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.FocusQualityRatingEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const QUALITY_LEVELS = {
    DEEP: 'DEEP',
    MODERATE: 'MODERATE',
    FRAGMENTED: 'FRAGMENTED'
  };

  const FRICTION_TYPES = {
    INTERNAL_THOUGHTS: 'INTERNAL_THOUGHTS',
    DIGITAL_NOTIFICATIONS: 'DIGITAL_NOTIFICATIONS',
    ENVIRONMENTAL_NOISE: 'ENVIRONMENTAL_NOISE',
    FATIGUE: 'FATIGUE',
    OTHER: 'OTHER'
  };

  const I18N_STRINGS = {
    en: {
      quality_deep_title: "Deep Flow",
      quality_deep_desc: "High immersion, sustained uninterrupted focus.",
      quality_moderate_title: "Steady Focus",
      quality_moderate_desc: "Good overall focus with minor fleeting distractions.",
      quality_fragmented_title: "Fragmented Focus",
      quality_fragmented_desc: "Frequent interruptions or heavy resistance.",
      friction_internal_thoughts: "Mind Wandering / Daydreaming",
      friction_digital_notifications: "Digital Alerts / Phone Check",
      friction_environmental_noise: "Surrounding Noise / People",
      friction_fatigue: "Physical Fatigue / Low Energy",
      friction_other: "Other Interruption",
      summary_quality_score: "Focus Quality Score",
      summary_total_frictions: "Total Distractions Logged"
    },
    ar: {
      quality_deep_title: "تدفق عميق",
      quality_deep_desc: "استغراق تام وتركيز متواصل دون انقطاع.",
      quality_moderate_title: "تركيز معتدل",
      quality_moderate_desc: "أداء جيد مع تشتت عابر ومحدود.",
      quality_fragmented_title: "تركيز متقطع",
      quality_fragmented_desc: "انقطاعات متكررة أو صعوبة في الاستمرار.",
      friction_internal_thoughts: "أفكار شاردة / استرسال ذهني",
      friction_digital_notifications: "تنبيهات الهاتف / إشعارات رقمية",
      friction_environmental_noise: "ضجيج محيط / مقاطعات خارجية",
      friction_fatigue: "إجهاد بدني / انخفاض الطاقة",
      friction_other: "عامل تشتت آخر",
      summary_quality_score: "مؤشر جودة التركيز",
      summary_total_frictions: "إجمالي مرات التشتت المسجلة"
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

  function toWesternDigits(num) {
    const val = Number(num);
    if (!Number.isFinite(val)) return '0';
    return Math.round(val).toString();
  }

  function getQualityLevels() {
    return Object.values(QUALITY_LEVELS);
  }

  function getFrictionTypes() {
    return Object.values(FRICTION_TYPES);
  }

  function logFriction(sessionFrictionList, frictionType, timestampMs) {
    const list = Array.isArray(sessionFrictionList) ? sessionFrictionList.slice() : [];
    const validTypes = getFrictionTypes();
    const type = validTypes.includes(frictionType) ? frictionType : FRICTION_TYPES.OTHER;
    const time = timestampMs ? Number(timestampMs) : Date.now();

    list.push({
      type,
      timestamp: time
    });

    return list;
  }

  function calculateQualityScore(selfRating, frictionLogs = []) {
    let baseScore = 80;
    if (selfRating === QUALITY_LEVELS.DEEP) {
      baseScore = 95;
    } else if (selfRating === QUALITY_LEVELS.MODERATE) {
      baseScore = 75;
    } else if (selfRating === QUALITY_LEVELS.FRAGMENTED) {
      baseScore = 50;
    }

    const frictionCount = Array.isArray(frictionLogs) ? frictionLogs.length : 0;
    const penalty = frictionCount * 5;
    const finalScore = Math.max(10, Math.min(100, baseScore - penalty));

    return {
      score: finalScore,
      scoreFormatted: toWesternDigits(finalScore),
      frictionCount,
      frictionCountFormatted: toWesternDigits(frictionCount),
      rating: selfRating || QUALITY_LEVELS.MODERATE
    };
  }

  function aggregateFrictions(sessionsWithRatings = []) {
    const counts = {
      [FRICTION_TYPES.INTERNAL_THOUGHTS]: 0,
      [FRICTION_TYPES.DIGITAL_NOTIFICATIONS]: 0,
      [FRICTION_TYPES.ENVIRONMENTAL_NOISE]: 0,
      [FRICTION_TYPES.FATIGUE]: 0,
      [FRICTION_TYPES.OTHER]: 0
    };

    let totalFrictions = 0;
    sessionsWithRatings.forEach(s => {
      const logs = (s && s.frictionLogs) || [];
      logs.forEach(item => {
        if (counts[item.type] !== undefined) {
          counts[item.type]++;
          totalFrictions++;
        }
      });
    });

    let topFriction = null;
    let maxCount = -1;
    Object.keys(counts).forEach(k => {
      if (counts[k] > maxCount && counts[k] > 0) {
        maxCount = counts[k];
        topFriction = k;
      }
    });

    return {
      counts,
      totalFrictions,
      totalFormatted: toWesternDigits(totalFrictions),
      primaryDistraction: topFriction
    };
  }

  function getLocalizedText(locale, key) {
    const clean = sanitizeLocale(locale);
    const dict = (clean === 'ar') ? I18N_STRINGS.ar : I18N_STRINGS.en;
    return dict[key] || I18N_STRINGS.en[key] || '';
  }

  return {
    QUALITY_LEVELS,
    FRICTION_TYPES,
    getQualityLevels,
    getFrictionTypes,
    logFriction,
    calculateQualityScore,
    aggregateFrictions,
    getLocalizedText,
    sanitizeLocale,
    toWesternDigits
  };
}));
