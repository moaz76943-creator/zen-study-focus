/**
 * DEEP FOCUS — Urban Noise Cancellation & Coffee Shop Filter Engine
 * Cycle: CYCLE-124 (Mission #124)
 * Architecture: v21 Data Fortress Safe, 100% Offline Web Audio Acoustic Masking
 * Strict Rules:
 *  - 100-Locale Support with Strict English-Only Fallback
 *  - Absolute Hebrew Exclusion (he, iw -> en)
 *  - Strict Western Digits 0123456789
 *  - Zero Medical / Clinical Claims (Acoustic Comfort Only)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.UrbanNoiseCancellationEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PROFILES = {
    COFFEE_SHOP_CHATTER: {
      id: 'COFFEE_SHOP_CHATTER',
      filterType: 'bandpass',
      centerFreqHz: 1200,
      qFactor: 0.85,
      gainDb: -6,
      maskingColor: 'BROWN_PINK_HYBRID',
      targetAcoustic: 'Human conversation & clatter masking (300-3400 Hz)'
    },
    TRAFFIC_RUMBLE: {
      id: 'TRAFFIC_RUMBLE',
      filterType: 'highpass',
      centerFreqHz: 280,
      qFactor: 0.70,
      gainDb: -12,
      maskingColor: 'BROWN_DEEP',
      targetAcoustic: 'Low-frequency street rumble & vehicle engine rumble'
    },
    AIRPORT_TRANSIT: {
      id: 'AIRPORT_TRANSIT',
      filterType: 'peaking',
      centerFreqHz: 2400,
      qFactor: 1.2,
      gainDb: -8,
      maskingColor: 'DIFFUSE_WHITE',
      targetAcoustic: 'Public transit hubs & variable chime spikes'
    },
    LIBRARY_WHISPER: {
      id: 'LIBRARY_WHISPER',
      filterType: 'lowpass',
      centerFreqHz: 800,
      qFactor: 0.50,
      gainDb: -3,
      maskingColor: 'SOFT_PINK',
      targetAcoustic: 'Quiet room echo & subtle chair movement masking'
    }
  };

  const DEFAULTS = {
    enabled: true,
    activeProfile: 'COFFEE_SHOP_CHATTER',
    maskingIntensity: 0.7,
    ambientBlend: 0.5
  };

  const I18N_STRINGS = {
    en: {
      profile_coffee: "Coffee Shop Chatter Masking (1200 Hz Bandpass)",
      profile_traffic: "Urban Traffic Rumble Attenuation (280 Hz Highpass)",
      profile_transit: "Public Transit Hub Filter (2400 Hz Peaking)",
      profile_library: "Quiet Library Echo Absorber (800 Hz Lowpass)",
      filter_active_toast: "Acoustic focus masking active."
    },
    ar: {
      profile_coffee: "حجب ثرثرة المقاهي والضوضاء البشرية (1200 هرتز)",
      profile_traffic: "تخفيف هدير الطرق وحركة السير (280 هرتز)",
      profile_transit: "تصفية ضجيج محطات السفر والتنقل (2400 هرتز)",
      profile_library: "امتصاص صدى القاعات الهادئة وحفيف الورق (800 هرتز)",
      filter_active_toast: "تم تفعيل حجب الضوضاء السمعي للتركيز."
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
    if (typeof num === 'number') {
      return decimals > 0 ? num.toFixed(decimals) : Math.round(num).toString();
    }
    if (typeof num === 'string') {
      return num
        .replace(/[٠۰]/g, '0')
        .replace(/[١۱]/g, '1')
        .replace(/[٢۲]/g, '2')
        .replace(/[٣۳]/g, '3')
        .replace(/[٤۴]/g, '4')
        .replace(/[٥۵]/g, '5')
        .replace(/[٦۶]/g, '6')
        .replace(/[٧۷]/g, '7')
        .replace(/[٨۸]/g, '8')
        .replace(/[٩۹]/g, '9');
    }
    return '0';
  }

  function getLocalizedText(locale, key) {
    const clean = sanitizeLocale(locale);
    const dict = (clean === 'ar') ? I18N_STRINGS.ar : I18N_STRINGS.en;
    return dict[key] || I18N_STRINGS.en[key] || '';
  }

  function validateConfig(config) {
    const cfg = Object.assign({}, DEFAULTS, config || {});
    cfg.enabled = Boolean(cfg.enabled);

    if (!PROFILES[cfg.activeProfile]) {
      cfg.activeProfile = DEFAULTS.activeProfile;
    }

    const clamp = (v) => {
      const f = parseFloat(v);
      return (!isNaN(f) && f >= 0 && f <= 1.0) ? f : 0.5;
    };

    cfg.maskingIntensity = clamp(cfg.maskingIntensity);
    cfg.ambientBlend = clamp(cfg.ambientBlend);

    return cfg;
  }

  function calculateFilterParameters(profileKey, config = {}) {
    const cfg = validateConfig(config);
    const p = PROFILES[profileKey] || PROFILES[cfg.activeProfile];

    const effectiveGainDb = Number((p.gainDb * cfg.maskingIntensity).toFixed(1));

    return {
      profileId: p.id,
      filterType: p.filterType,
      frequencyHz: p.centerFreqHz,
      qFactor: p.qFactor,
      gainDb: effectiveGainDb,
      maskingColor: p.maskingColor,
      formattedFrequency: `${toWesternDigits(p.centerFreqHz)} Hz`,
      formattedGain: `${toWesternDigits(effectiveGainDb, 1)} dB`,
      intensityPercent: `${toWesternDigits(cfg.maskingIntensity * 100)}%`
    };
  }

  return {
    PROFILES,
    DEFAULTS,
    validateConfig,
    calculateFilterParameters,
    sanitizeLocale,
    toWesternDigits,
    getLocalizedText
  };
}));
