/**
 * DEEP FOCUS — Advanced Adaptive Haptics & Heartbeat Pulse Engine
 * Cycle: CYCLE-112 (Mission #112)
 * Architecture: v21 Data Fortress Safe, Rhythmic Somatic Anchoring & Power-Aware Tactile Pacer
 * Strict Rules:
 *  - 100-Locale Support with Strict English-Only Fallback
 *  - Absolute Hebrew Exclusion (he, iw -> en)
 *  - Strict Western Digits 0123456789
 *  - Zero Medical / Clinical Claims (Purely Focus Anchoring)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AdaptiveHapticsHeartbeatEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const RHYTHM_PRESETS = {
    CALM_HEARTBEAT: {
      id: 'CALM_HEARTBEAT',
      bpm: 60,
      pattern: [60, 90, 45, 800],
      descriptionKey: 'rhythm_calm_heartbeat'
    },
    FLOW_METRONOME: {
      id: 'FLOW_METRONOME',
      bpm: 50,
      pattern: [40, 1160],
      descriptionKey: 'rhythm_flow_metronome'
    },
    TACTILE_DOUBLE_TAP: {
      id: 'TACTILE_DOUBLE_TAP',
      bpm: 75,
      pattern: [50, 70, 50, 630],
      descriptionKey: 'rhythm_tactile_double_tap'
    }
  };

  const DEFAULTS = {
    enabled: true,
    activeRhythm: 'CALM_HEARTBEAT',
    powerSaverScale: 1.0,
    repeatCycles: 4,
    maxSinglePulseMs: 400
  };

  const I18N_STRINGS = {
    en: {
      rhythm_calm_heartbeat: "Calm Heartbeat Rhythm (60 BPM Lub-Dub)",
      rhythm_flow_metronome: "Flow Metronome (50 BPM Single Pulse)",
      rhythm_tactile_double_tap: "Tactile Double-Tap Anchor (75 BPM)",
      haptics_power_saved: "Haptic pulse reduced for battery conservation."
    },
    ar: {
      rhythm_calm_heartbeat: "إيقاع نبض القلب الهادئ (60 نبضة/د)",
      rhythm_flow_metronome: "بندول التدفق اللمسي (50 نبضة/د)",
      rhythm_tactile_double_tap: "نبض النقر المزدوج للتثبيت (75 نبضة/د)",
      haptics_power_saved: "تم تقليل نبضات الاهتزاز لتوفير البطارية."
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

    if (!RHYTHM_PRESETS[cfg.activeRhythm]) {
      cfg.activeRhythm = DEFAULTS.activeRhythm;
    }

    const scale = parseFloat(cfg.powerSaverScale);
    cfg.powerSaverScale = (!isNaN(scale) && scale >= 0.2 && scale <= 1.0) ? scale : DEFAULTS.powerSaverScale;

    const cycles = parseInt(cfg.repeatCycles, 10);
    cfg.repeatCycles = (!isNaN(cycles) && cycles >= 1 && cycles <= 20) ? cycles : DEFAULTS.repeatCycles;

    return cfg;
  }

  function generateRhythmSequence(rhythmKey, config = {}, isLowBattery = false) {
    const cfg = validateConfig(config);
    if (!cfg.enabled) return [];

    const preset = RHYTHM_PRESETS[rhythmKey] || RHYTHM_PRESETS[cfg.activeRhythm];
    const powerScale = isLowBattery ? 0.5 : cfg.powerSaverScale;

    const baseUnit = preset.pattern.map((val, idx) => {
      if (idx % 2 === 0) {
        return Math.max(10, Math.min(cfg.maxSinglePulseMs, Math.round(val * powerScale)));
      }
      return val;
    });

    const sequence = [];
    const repeat = isLowBattery ? Math.max(1, Math.floor(cfg.repeatCycles / 2)) : cfg.repeatCycles;

    for (let c = 0; c < repeat; c++) {
      baseUnit.forEach(ms => sequence.push(ms));
    }

    return sequence;
  }

  function getMilestoneAlertPattern(remainingMinutes) {
    const rem = parseInt(remainingMinutes, 10);
    if (rem === 10) return [80, 100, 80];
    if (rem === 5) return [100, 120, 100];
    if (rem === 1) return [120, 80, 120, 80, 120];
    if (rem === 0) return [150, 100, 150, 100, 250];
    return [];
  }

  return {
    RHYTHM_PRESETS,
    DEFAULTS,
    validateConfig,
    generateRhythmSequence,
    getMilestoneAlertPattern,
    sanitizeLocale,
    toWesternDigits,
    getLocalizedText
  };
}));
