/**
 * DEEP FOCUS — Absolute Silence & Offline Lockdown Pacer Engine
 * Cycle: CYCLE-133 (Mission #133)
 * Architecture: v21 Data Fortress Safe, Digital Sanctuary & Escape-Resistant Pacing
 * Strict Rules:
 *  - 100-Locale Support with Strict English-Only Fallback
 *  - Absolute Hebrew Exclusion (he, iw -> en)
 *  - Strict Western Digits 0123456789
 *  - Zero Medical / Clinical Claims (Digital Wellness & Habit Pacing Only)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.OfflineLockdownPacerEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const LOCKDOWN_LEVELS = {
    ZEN_GENTLE: { id: 'ZEN_GENTLE', escapePenalty: 5, requireOffline: false },
    STRICT_STUDY: { id: 'STRICT_STUDY', escapePenalty: 10, requireOffline: false },
    AIRPLANE_SANCTUARY: { id: 'AIRPLANE_SANCTUARY', escapePenalty: 15, requireOffline: true }
  };

  const DEFAULTS = {
    enabled: true,
    activeLevel: 'STRICT_STUDY',
    gracePeriodSec: 10,
    vibrateOnEscape: true
  };

  const I18N_STRINGS = {
    en: {
      level_zen: "Zen Gentle (Soft Focus Boundary)",
      level_strict: "Strict Study (Full Window Lock)",
      level_airplane: "Airplane Sanctuary (100% Disconnected Immersion)",
      escape_warning: "Focus sanctuary exited! Return to preserve your session discipline.",
      offline_nudge: "Enable Airplane Mode or Do Not Disturb for absolute quiet focus.",
      discipline_score_label: "Lockdown Discipline Score"
    },
    ar: {
      level_zen: "زن الهادئ (تنبيه لطيف عند المغادرة)",
      level_strict: "مدارسة صارمة (تثبيت نافذة التركيز)",
      level_airplane: "ملاذ الطيران (عزلة تامة وانفصال عن الشبكة)",
      escape_warning: "تمت مغادرة محراب التركيز! عُد للجلسة للحفاظ على مؤشر الانضباط.",
      offline_nudge: "فعّل وضع الطيران أو عدم الإزعاج لعزل الإشعارات التام.",
      discipline_score_label: "مؤشر انضباط العزلة التامة"
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

  function validateConfig(config) {
    const cfg = Object.assign({}, DEFAULTS, config || {});
    cfg.enabled = Boolean(cfg.enabled);
    cfg.vibrateOnEscape = Boolean(cfg.vibrateOnEscape);

    if (!LOCKDOWN_LEVELS[cfg.activeLevel]) {
      cfg.activeLevel = DEFAULTS.activeLevel;
    }

    const grace = parseInt(cfg.gracePeriodSec, 10);
    cfg.gracePeriodSec = (!isNaN(grace) && grace >= 3 && grace <= 60) ? grace : DEFAULTS.gracePeriodSec;

    return cfg;
  }

  function logEscapeEvent(currentEscapeList = [], timestampMs = null, reason = 'APP_BLUR') {
    const list = Array.isArray(currentEscapeList) ? currentEscapeList.slice() : [];
    const time = timestampMs ? Number(timestampMs) : Date.now();

    list.push({
      timestamp: time,
      reason: String(reason || 'APP_BLUR')
    });

    return list;
  }

  function calculateDisciplineScore(sessionMinutes, escapeCount = 0, levelKey = 'STRICT_STUDY') {
    const lvl = LOCKDOWN_LEVELS[levelKey] || LOCKDOWN_LEVELS.STRICT_STUDY;
    const escapes = Math.max(0, parseInt(escapeCount, 10) || 0);

    const base = 100;
    const penalty = escapes * lvl.escapePenalty;
    const finalScore = Math.max(10, Math.min(100, base - penalty));

    return {
      score: finalScore,
      scoreFormatted: toWesternDigits(finalScore),
      escapesCount: escapes,
      escapesCountFormatted: toWesternDigits(escapes),
      lockdownLevel: lvl.id
    };
  }

  function evaluateSanctuaryStatus(isOnline = false, levelKey = 'AIRPLANE_SANCTUARY', locale = 'en') {
    const lvl = LOCKDOWN_LEVELS[levelKey] || LOCKDOWN_LEVELS.AIRPLANE_SANCTUARY;
    const t = (k) => getLocalizedText(locale, k);

    const needsOffline = lvl.requireOffline;
    const isViolatingOffline = needsOffline && isOnline;

    return {
      level: lvl.id,
      isCompliant: !isViolatingOffline,
      recommendation: isViolatingOffline ? t('offline_nudge') : null
    };
  }

  return {
    LOCKDOWN_LEVELS,
    DEFAULTS,
    validateConfig,
    logEscapeEvent,
    calculateDisciplineScore,
    evaluateSanctuaryStatus,
    sanitizeLocale,
    toWesternDigits,
    getLocalizedText
  };
}));
