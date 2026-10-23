/**
 * DEEP FOCUS — Thermal Throttle & CPU Resource Conservator Engine
 * Cycle: CYCLE-128 (Mission #128)
 * Architecture: v21 Data Fortress Safe, Hardware Longevity & Multi-Hour Session Pacer
 * Strict Rules:
 *  - 100-Locale Support with Strict English-Only Fallback
 *  - Absolute Hebrew Exclusion (he, iw -> en)
 *  - Strict Western Digits 0123456789
 *  - Zero Medical / Clinical Claims (Hardware Optimization Only)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ThermalResourceConservatorEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const THERMAL_STATES = {
    NORMAL: {
      id: 'NORMAL',
      fpsLimit: 60,
      canvasRenderMode: 'FULL',
      animationsEnabled: true,
      timerTickIntervalMs: 1000
    },
    WARM_CONSERVE: {
      id: 'WARM_CONSERVE',
      fpsLimit: 30,
      canvasRenderMode: 'LITE',
      animationsEnabled: false,
      timerTickIntervalMs: 1000
    },
    CRITICAL_COOL: {
      id: 'CRITICAL_COOL',
      fpsLimit: 1,
      canvasRenderMode: 'OFF',
      animationsEnabled: false,
      timerTickIntervalMs: 5000
    }
  };

  const DEFAULTS = {
    autoThrottleEnabled: true,
    warmSessionThresholdMinutes: 90,
    criticalBatteryLevelPct: 15,
    chargingExemption: true
  };

  const I18N_STRINGS = {
    en: {
      thermal_normal: "Performance Optimal (60 FPS & Full Visuals)",
      thermal_conserve: "Hardware Conservator Active (30 FPS & Battery Saver)",
      thermal_critical: "Critical Cool Mode (1 FPS & Minimal Power)",
      status_toast: "Hardware resource governor: {state} mode."
    },
    ar: {
      thermal_normal: "الأداء الأمثل (60 إطار/ث ورسوميات كاملة)",
      thermal_conserve: "وضع حفظ الموارد وتبريد العتاد (30 إطار/ث)",
      thermal_critical: "وضع التبريد الأقصى وتوفير الطاقة (إطار/ث وتحديث خفيف)",
      status_toast: "منظّم موارد العتاد: نمط {state}."
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
    cfg.autoThrottleEnabled = Boolean(cfg.autoThrottleEnabled);
    cfg.chargingExemption = Boolean(cfg.chargingExemption);

    const warmMin = parseInt(cfg.warmSessionThresholdMinutes, 10);
    cfg.warmSessionThresholdMinutes = (!isNaN(warmMin) && warmMin >= 30 && warmMin <= 240) ? warmMin : DEFAULTS.warmSessionThresholdMinutes;

    const critBat = parseInt(cfg.criticalBatteryLevelPct, 10);
    cfg.criticalBatteryLevelPct = (!isNaN(critBat) && critBat >= 5 && critBat <= 30) ? critBat : DEFAULTS.criticalBatteryLevelPct;

    return cfg;
  }

  function resolveThermalState(sessionDurationMinutes, batteryLevelPct = null, isCharging = false, config = {}) {
    const cfg = validateConfig(config);
    if (!cfg.autoThrottleEnabled) {
      return THERMAL_STATES.NORMAL;
    }

    const mins = Math.max(0, parseInt(sessionDurationMinutes, 10) || 0);

    if (batteryLevelPct !== null && !isNaN(batteryLevelPct) && !isCharging) {
      if (batteryLevelPct <= cfg.criticalBatteryLevelPct) {
        return THERMAL_STATES.CRITICAL_COOL;
      }
    }

    if (isCharging && cfg.chargingExemption && mins < 180) {
      return THERMAL_STATES.NORMAL;
    }

    if (mins >= (cfg.warmSessionThresholdMinutes * 2)) {
      return THERMAL_STATES.CRITICAL_COOL;
    }
    if (mins >= cfg.warmSessionThresholdMinutes) {
      return THERMAL_STATES.WARM_CONSERVE;
    }

    return THERMAL_STATES.NORMAL;
  }

  function generateGovernorCssVariables(thermalState) {
    const state = thermalState || THERMAL_STATES.NORMAL;
    return {
      '--zen-render-fps': toWesternDigits(state.fpsLimit),
      '--zen-anim-display': state.animationsEnabled ? 'block' : 'none',
      '--zen-canvas-opacity': state.canvasRenderMode === 'OFF' ? '0.0' : (state.canvasRenderMode === 'LITE' ? '0.5' : '1.0'),
      '--zen-tick-interval-ms': toWesternDigits(state.timerTickIntervalMs)
    };
  }

  return {
    THERMAL_STATES,
    DEFAULTS,
    validateConfig,
    resolveThermalState,
    generateGovernorCssVariables,
    sanitizeLocale,
    toWesternDigits,
    getLocalizedText
  };
}));
