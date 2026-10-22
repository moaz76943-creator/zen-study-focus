/**
 * DEEP FOCUS — Zen Privacy Mask & Biometric Blur Engine
 * Cycle: CYCLE-119 (Mission #119)
 * Architecture: v21 Data Fortress Safe, Screen Shielding & Shoulder-Surfing Defense
 * Strict Rules:
 *  - 100-Locale Support with Strict English-Only Fallback
 *  - Absolute Hebrew Exclusion (he, iw -> en)
 *  - Strict Western Digits 0123456789
 *  - 100% Offline (Local View Protection)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ZenPrivacyMaskEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MASK_MODES = {
    NONE: 'NONE',
    BLUR: 'BLUR',
    OBFUSCATE: 'OBFUSCATE',
    SHIELD: 'SHIELD'
  };

  const DEFAULTS = {
    enabled: true,
    activeMode: 'BLUR',
    blurRadiusPx: 12,
    autoLockTimeoutSec: 120,
    lockOnBackground: true
  };

  const I18N_STRINGS = {
    en: {
      privacy_shield_title: "Privacy Shield Active",
      privacy_shield_desc: "Tap or authenticate to unmask your study session.",
      privacy_mode_blur: "Lens Blur (Obscures text in public)",
      privacy_mode_obfuscate: "Text Obfuscation (Masks characters)",
      privacy_mode_shield: "Full Screen Shield (Blackout overlay)",
      tap_to_unmask: "Tap to Reveal"
    },
    ar: {
      privacy_shield_title: "درع الخصوصية نشط",
      privacy_shield_desc: "المس الشاشة أو قم بالمصادقة لإظهار بيانات الجلسة.",
      privacy_mode_blur: "تمويه بصري (إخفاء النصوص في الأماكن العامة)",
      privacy_mode_obfuscate: "حجب الحروف (إظهار رموز بديلة)",
      privacy_mode_shield: "درع الشاشة الكامل (حجاب داكن شامل)",
      tap_to_unmask: "انقر للإظهار"
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
    cfg.lockOnBackground = Boolean(cfg.lockOnBackground);

    if (!MASK_MODES[cfg.activeMode]) {
      cfg.activeMode = DEFAULTS.activeMode;
    }

    const blur = parseInt(cfg.blurRadiusPx, 10);
    cfg.blurRadiusPx = (!isNaN(blur) && blur >= 4 && blur <= 40) ? blur : DEFAULTS.blurRadiusPx;

    const timeout = parseInt(cfg.autoLockTimeoutSec, 10);
    cfg.autoLockTimeoutSec = (!isNaN(timeout) && timeout >= 15 && timeout <= 1800) ? timeout : DEFAULTS.autoLockTimeoutSec;

    return cfg;
  }

  function obfuscateString(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/[^\s\n\r]/g, '•');
  }

  function generatePrivacyCssVariables(isLocked, config = {}) {
    const cfg = validateConfig(config);
    if (!isLocked || !cfg.enabled) {
      return {
        '--zen-privacy-blur': '0px',
        '--zen-privacy-opacity': '1.0',
        '--zen-privacy-shield-display': 'none',
        '--zen-privacy-pointer-events': 'auto'
      };
    }

    if (cfg.activeMode === MASK_MODES.BLUR) {
      return {
        '--zen-privacy-blur': `${toWesternDigits(cfg.blurRadiusPx)}px`,
        '--zen-privacy-opacity': '0.7',
        '--zen-privacy-shield-display': 'none',
        '--zen-privacy-pointer-events': 'auto'
      };
    }

    if (cfg.activeMode === MASK_MODES.SHIELD) {
      return {
        '--zen-privacy-blur': '20px',
        '--zen-privacy-opacity': '0.0',
        '--zen-privacy-shield-display': 'flex',
        '--zen-privacy-pointer-events': 'none'
      };
    }

    return {
      '--zen-privacy-blur': '6px',
      '--zen-privacy-opacity': '0.85',
      '--zen-privacy-shield-display': 'none',
      '--zen-privacy-pointer-events': 'auto'
    };
  }

  function shouldAutoLock(idleSeconds, config = {}) {
    const cfg = validateConfig(config);
    if (!cfg.enabled) return false;
    const idle = Math.max(0, parseInt(idleSeconds, 10) || 0);
    return idle >= cfg.autoLockTimeoutSec;
  }

  return {
    MASK_MODES,
    DEFAULTS,
    validateConfig,
    obfuscateString,
    generatePrivacyCssVariables,
    shouldAutoLock,
    sanitizeLocale,
    toWesternDigits,
    getLocalizedText
  };
}));
