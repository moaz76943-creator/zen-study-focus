/**
 * DEEP FOCUS — Ambient Light & Night Vision Auto-Dim Engine
 * Cycle: CYCLE-109 (Mission #109)
 * Architecture: v21 Data Fortress Safe, Sensor & Circadian Ergonomic Eye Protection
 * Strict Rules:
 *  - 100-Locale Support with Strict English-Only Fallback
 *  - Absolute Hebrew Exclusion (he, iw -> en)
 *  - Strict Western Digits 0123456789
 *  - Zero Medical / Clinical Claims (Purely Ergonomic Comfort)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AmbientLightNightVisionEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PROFILES = {
    DAY_BRIGHT: {
      id: 'DAY_BRIGHT',
      minLux: 200,
      brightnessScale: 1.0,
      contrastScale: 1.0,
      colorTempK: 6500,
      blueReductionPct: 0
    },
    INDOOR_BALANCED: {
      id: 'INDOOR_BALANCED',
      minLux: 50,
      brightnessScale: 0.90,
      contrastScale: 1.0,
      colorTempK: 5500,
      blueReductionPct: 15
    },
    DIM_EVENING: {
      id: 'DIM_EVENING',
      minLux: 10,
      brightnessScale: 0.75,
      contrastScale: 1.05,
      colorTempK: 4000,
      blueReductionPct: 45
    },
    NIGHT_VISION_MONO: {
      id: 'NIGHT_VISION_MONO',
      minLux: 0,
      brightnessScale: 0.55,
      contrastScale: 1.15,
      colorTempK: 2200,
      blueReductionPct: 90
    }
  };

  const DEFAULTS = {
    autoDimEnabled: true,
    nightVisionEnabled: true,
    sensorActive: false,
    manualOverride: null,
    nightStartHour: 22,
    nightEndHour: 6
  };

  const I18N_STRINGS = {
    en: {
      profile_day_bright: "Daytime Bright (Neutral 6500K)",
      profile_indoor_balanced: "Indoor Balanced (Gentle 5500K)",
      profile_dim_evening: "Dim Evening (Warm Amber 4000K)",
      profile_night_vision_mono: "Night Vision (Deep Red/Amber Mono 2200K)",
      dim_auto_active: "Ergonomic lighting adaptation active."
    },
    ar: {
      profile_day_bright: "نهاري ساطع (محايد 6500K)",
      profile_indoor_balanced: "داخلي متوازن (مريح 5500K)",
      profile_dim_evening: "مسائي خافت (عنبري دافئ 4000K)",
      profile_night_vision_mono: "رؤية ليلية أحادية (أحمر/عنبري عميق 2200K)",
      dim_auto_active: "التكيف التلقائي لإراحة العين مفعل."
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
    cfg.autoDimEnabled = Boolean(cfg.autoDimEnabled);
    cfg.nightVisionEnabled = Boolean(cfg.nightVisionEnabled);

    if (cfg.manualOverride && !PROFILES[cfg.manualOverride]) {
      cfg.manualOverride = null;
    }

    const start = parseInt(cfg.nightStartHour, 10);
    cfg.nightStartHour = (!isNaN(start) && start >= 0 && start <= 23) ? start : DEFAULTS.nightStartHour;

    const end = parseInt(cfg.nightEndHour, 10);
    cfg.nightEndHour = (!isNaN(end) && end >= 0 && end <= 23) ? end : DEFAULTS.nightEndHour;

    return cfg;
  }

  function isNightHours(currentHour, startHour = 22, endHour = 6) {
    const h = parseInt(currentHour, 10);
    if (isNaN(h)) return false;
    if (startHour > endHour) {
      return h >= startHour || h < endHour;
    }
    return h >= startHour && h < endHour;
  }

  function resolveProfile(lux = null, currentHour = 12, config = {}) {
    const cfg = validateConfig(config);

    if (!cfg.autoDimEnabled) {
      return PROFILES.DAY_BRIGHT;
    }

    if (cfg.manualOverride) {
      return PROFILES[cfg.manualOverride];
    }

    if (lux !== null && !isNaN(lux) && lux >= 0) {
      const luxVal = Number(lux);
      if (luxVal >= PROFILES.DAY_BRIGHT.minLux) return PROFILES.DAY_BRIGHT;
      if (luxVal >= PROFILES.INDOOR_BALANCED.minLux) return PROFILES.INDOOR_BALANCED;
      if (luxVal >= PROFILES.DIM_EVENING.minLux) return PROFILES.DIM_EVENING;
      return PROFILES.NIGHT_VISION_MONO;
    }

    if (cfg.nightVisionEnabled && isNightHours(currentHour, cfg.nightStartHour, cfg.nightEndHour)) {
      return PROFILES.NIGHT_VISION_MONO;
    }

    const h = parseInt(currentHour, 10) || 12;
    if (h >= 18 && h < 22) {
      return PROFILES.DIM_EVENING;
    }
    if (h >= 7 && h < 18) {
      return PROFILES.DAY_BRIGHT;
    }
    return PROFILES.INDOOR_BALANCED;
  }

  function generateCssVariables(profile) {
    const p = profile || PROFILES.DAY_BRIGHT;
    return {
      '--zen-dim-brightness': toWesternDigits(p.brightnessScale, 2),
      '--zen-dim-contrast': toWesternDigits(p.contrastScale, 2),
      '--zen-color-temperature': `${toWesternDigits(p.colorTempK)}K`,
      '--zen-blue-reduction': `${toWesternDigits(p.blueReductionPct)}%`,
      '--zen-night-mono-active': (p.id === 'NIGHT_VISION_MONO') ? '1' : '0'
    };
  }

  return {
    PROFILES,
    DEFAULTS,
    validateConfig,
    isNightHours,
    resolveProfile,
    generateCssVariables,
    sanitizeLocale,
    toWesternDigits,
    getLocalizedText
  };
}));
