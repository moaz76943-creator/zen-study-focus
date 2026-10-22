/**
 * DEEP FOCUS — Mindful Hydration & Ergonomic Prompt Engine
 * Cycle: CYCLE-104 (Mission #104)
 * Architecture: v21 Data Fortress Safe, Zero Medical Claims, Purely Mindful & Ergonomic
 * Strict Rules:
 *  - 100-Locale Support with Strict English-Only Fallback
 *  - Absolute Hebrew Exclusion (he, iw -> en)
 *  - Strict Western Digits 0123456789
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MindfulHydrationPromptEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DEFAULTS = {
    enabled: true,
    intervalMinutes: 45,        // Trigger prompt every 45 minutes of focus
    promptAmountMl: 250,        // Standard gentle cup size
    dailyTargetMl: 2000,        // Mindful baseline goal
    preferredUnit: 'ml',        // 'ml' or 'fl_oz'
    postureReminder: true       // Include ergonomic posture nudge
  };

  const I18N_STRINGS = {
    en: {
      hydration_title: "Mindful Hydration & Ergonomics",
      hydration_body: "Take a calm breath, roll your shoulders back, and drink a refreshing glass of water ({amount} {unit}).",
      hydration_toast: "{amount} {unit} logged. Keep your focus fresh and clear!",
      hydration_goal_met: "Mindful daily hydration target reached ({total} {unit})! Excellent balance.",
      unit_ml: "ml",
      unit_fl_oz: "fl oz"
    },
    ar: {
      hydration_title: "شرب الماء بروية وتعديل الجلسة",
      hydration_body: "خذ نفساً هادئاً، وحرك كتفيك للخلف بلطف، واشرب كوباً منعشاً من الماء ({amount} {unit}).",
      hydration_toast: "تم تسجيل {amount} {unit}. حافظ على صفاء ذهنك وانتعاشك!",
      hydration_goal_met: "تم تحقيق الهدف اليومي لشرب الماء بوعي ({total} {unit})! توازن ممتاز.",
      unit_ml: "مل",
      unit_fl_oz: "أونصة"
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

  function getDefaultConfig() {
    return Object.assign({}, DEFAULTS);
  }

  function validateConfig(config) {
    const cfg = Object.assign({}, DEFAULTS, config || {});

    cfg.enabled = Boolean(cfg.enabled);
    cfg.postureReminder = Boolean(cfg.postureReminder);

    const interval = parseInt(cfg.intervalMinutes, 10);
    cfg.intervalMinutes = (!isNaN(interval) && interval >= 15 && interval <= 180) ? interval : DEFAULTS.intervalMinutes;

    const amount = parseInt(cfg.promptAmountMl, 10);
    cfg.promptAmountMl = (!isNaN(amount) && amount >= 50 && amount <= 1000) ? amount : DEFAULTS.promptAmountMl;

    const target = parseInt(cfg.dailyTargetMl, 10);
    cfg.dailyTargetMl = (!isNaN(target) && target >= 500 && target <= 6000) ? target : DEFAULTS.dailyTargetMl;

    cfg.preferredUnit = (cfg.preferredUnit === 'fl_oz') ? 'fl_oz' : 'ml';

    return cfg;
  }

  function convertVolume(amountMl, targetUnit = 'ml') {
    const ml = Number(amountMl) || 0;
    if (targetUnit === 'fl_oz') {
      const oz = ml * 0.033814;
      return {
        value: Number(oz.toFixed(1)),
        formatted: toWesternDigits(oz, 1),
        unit: 'fl oz'
      };
    }
    return {
      value: Math.round(ml),
      formatted: toWesternDigits(ml, 0),
      unit: 'ml'
    };
  }

  function shouldTriggerPrompt(sessionElapsedSeconds, lastPromptSessionSeconds, config) {
    const cfg = validateConfig(config);
    if (!cfg.enabled) return false;

    const intervalSec = cfg.intervalMinutes * 60;
    const elapsed = Math.max(0, parseInt(sessionElapsedSeconds, 10) || 0);
    const lastPrompt = Math.max(0, parseInt(lastPromptSessionSeconds, 10) || 0);

    return (elapsed - lastPrompt) >= intervalSec;
  }

  function generatePromptContent(locale, config) {
    const cfg = validateConfig(config);
    const cleanLocale = sanitizeLocale(locale);
    const dict = (cleanLocale === 'ar') ? I18N_STRINGS.ar : I18N_STRINGS.en;

    const volume = convertVolume(cfg.promptAmountMl, cfg.preferredUnit);
    const unitLabel = (cfg.preferredUnit === 'fl_oz') ? dict.unit_fl_oz : dict.unit_ml;

    const title = dict.hydration_title;
    const body = dict.hydration_body
      .replace('{amount}', volume.formatted)
      .replace('{unit}', unitLabel);

    return {
      title,
      body,
      amount: volume.value,
      unit: cfg.preferredUnit,
      unitLabel,
      westernAmount: volume.formatted,
      timestamp: Date.now()
    };
  }

  function logIntake(dailyState, amountMl, timestampMs) {
    const now = timestampMs ? new Date(timestampMs) : new Date();
    const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const state = Object.assign({
      date: dateKey,
      totalMl: 0,
      logs: []
    }, dailyState);

    if (state.date !== dateKey) {
      state.date = dateKey;
      state.totalMl = 0;
      state.logs = [];
    }

    const intake = Math.max(0, parseInt(amountMl, 10) || 0);
    state.totalMl += intake;
    state.logs.push({
      amountMl: intake,
      timestamp: now.getTime(),
      timeFormatted: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    });

    return state;
  }

  function getDailyProgress(dailyState, config) {
    const cfg = validateConfig(config);
    const totalMl = Math.max(0, parseInt(dailyState && dailyState.totalMl, 10) || 0);
    const targetMl = cfg.dailyTargetMl;

    const percentage = Math.min(100, Math.round((totalMl / targetMl) * 100));
    const remainingMl = Math.max(0, targetMl - totalMl);
    const isTargetReached = totalMl >= targetMl;

    return {
      totalMl,
      targetMl,
      percentage,
      remainingMl,
      isTargetReached,
      totalFormatted: toWesternDigits(totalMl),
      targetFormatted: toWesternDigits(targetMl),
      percentageFormatted: `${toWesternDigits(percentage)}%`
    };
  }

  return {
    getDefaultConfig,
    validateConfig,
    convertVolume,
    shouldTriggerPrompt,
    generatePromptContent,
    logIntake,
    getDailyProgress,
    sanitizeLocale,
    toWesternDigits
  };
}));
