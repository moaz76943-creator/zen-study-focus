/**
 * DEEP FOCUS — Session Completion Audio-Visual Curtain Engine
 * Cycle: CYCLE-129 (Mission #129)
 * Architecture: v21 Data Fortress Safe, Sensory Completion Sequence & Post-Session Transition
 * Strict Rules:
 *  - 100-Locale Support with Strict English-Only Fallback
 *  - Absolute Hebrew Exclusion (he, iw -> en)
 *  - Strict Western Digits 0123456789
 *  - Zero Medical / Clinical Claims (Mindful Pacing Only)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SessionCompletionCurtainEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SEQUENCE_STAGES = {
    CHIME: 'CHIME',
    HAPTIC: 'HAPTIC',
    CURTAIN_DROP: 'CURTAIN_DROP',
    REFLECTION_MODAL: 'REFLECTION_MODAL'
  };

  const DEFAULTS = {
    soundEnabled: true,
    hapticsEnabled: true,
    curtainTransitionMs: 800,
    modalDelayMs: 1500,
    celebrationChimeFreqHz: 528
  };

  const I18N_STRINGS = {
    en: {
      completion_title: "Session Completed with Calm Focus",
      completion_subtitle: "Take a deep breath and acknowledge your accomplishment.",
      duration_label: "Focused Time: {minutes} min",
      streak_label: "Consistency Streak: {days} days",
      reflect_cta: "Rate Session Quality",
      dismiss_cta: "Continue to Rest"
    },
    ar: {
      completion_title: "اكتملت جلسة التركيز بنجاح وهدوء",
      completion_subtitle: "تنفّس بعمق واستحضر ما حصّلته من مدارسة وبناء.",
      duration_label: "وقت التركيز: {minutes} دقيقة",
      streak_label: "سلسلة الاستمرار: {days} أيام",
      reflect_cta: "تقييم جودة الجلسة",
      dismiss_cta: "الانتقال للاستراحة"
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
    cfg.soundEnabled = Boolean(cfg.soundEnabled);
    cfg.hapticsEnabled = Boolean(cfg.hapticsEnabled);

    const trans = parseInt(cfg.curtainTransitionMs, 10);
    cfg.curtainTransitionMs = (!isNaN(trans) && trans >= 200 && trans <= 3000) ? trans : DEFAULTS.curtainTransitionMs;

    const delay = parseInt(cfg.modalDelayMs, 10);
    cfg.modalDelayMs = (!isNaN(delay) && delay >= 500 && delay <= 5000) ? delay : DEFAULTS.modalDelayMs;

    return cfg;
  }

  function prepareCompletionSequence(sessionData = {}, config = {}) {
    const cfg = validateConfig(config);
    const s = sessionData || {};
    const durationMinutes = Math.max(1, Math.round((parseInt(s.durationSeconds, 10) || 1500) / 60));
    const streakDays = Math.max(1, parseInt(s.streakDays, 10) || 1);

    const hapticPattern = cfg.hapticsEnabled ? [120, 80, 120, 80, 260] : [];
    const chimeParams = cfg.soundEnabled ? {
      frequencyHz: cfg.celebrationChimeFreqHz,
      decaySeconds: 3.2,
      harmonics: [cfg.celebrationChimeFreqHz, cfg.celebrationChimeFreqHz * 2.01]
    } : null;

    return {
      durationMinutes,
      durationFormatted: toWesternDigits(durationMinutes),
      streakDays,
      streakFormatted: toWesternDigits(streakDays),
      hapticPattern,
      chimeParams,
      curtainTransitionMs: cfg.curtainTransitionMs,
      modalDelayMs: cfg.modalDelayMs,
      timestamp: Date.now()
    };
  }

  function generateCurtainCssVariables(isOpen) {
    return {
      '--zen-curtain-opacity': isOpen ? '0.92' : '0.0',
      '--zen-curtain-backdrop-blur': isOpen ? '16px' : '0px',
      '--zen-curtain-pointer-events': isOpen ? 'all' : 'none',
      '--zen-curtain-display': isOpen ? 'flex' : 'none'
    };
  }

  function generateModalContent(sessionData, locale = 'en') {
    const cleanLocale = sanitizeLocale(locale);
    const t = (k) => getLocalizedText(cleanLocale, k);
    const s = sessionData || {};
    const durationMins = Math.max(1, Math.round((parseInt(s.durationSeconds, 10) || 1500) / 60));
    const streak = Math.max(1, parseInt(s.streakDays, 10) || 1);

    return {
      title: t('completion_title'),
      subtitle: t('completion_subtitle'),
      durationText: t('duration_label').replace('{minutes}', toWesternDigits(durationMins)),
      streakText: t('streak_label').replace('{days}', toWesternDigits(streak)),
      reflectButtonLabel: t('reflect_cta'),
      dismissButtonLabel: t('dismiss_cta')
    };
  }

  return {
    SEQUENCE_STAGES,
    DEFAULTS,
    validateConfig,
    prepareCompletionSequence,
    generateCurtainCssVariables,
    generateModalContent,
    sanitizeLocale,
    toWesternDigits,
    getLocalizedText
  };
}));
