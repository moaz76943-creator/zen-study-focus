/**
 * DEEP FOCUS — Binaural Beat & Nature Sanctuary Synthesizer Engine
 * Cycle: CYCLE-122 (Mission #122)
 * Architecture: v21 Data Fortress Safe, 100% Offline Procedural Web Audio Engine
 * Strict Rules:
 *  - 100-Locale Support with Strict English-Only Fallback
 *  - Absolute Hebrew Exclusion (he, iw -> en)
 *  - Strict Western Digits 0123456789
 *  - Zero Medical / Clinical Claims (Acoustic Masking Only)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BinauralNatureSynthesizerEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const BINAURAL_MODES = {
    ALPHA_RELAX: {
      id: 'ALPHA_RELAX',
      carrierHz: 216,
      beatOffsetHz: 10,
      targetBand: 'Alpha (10 Hz)',
      bestFor: 'Relaxed focus, textbook reading, and calm consolidation'
    },
    BETA_SOLVE: {
      id: 'BETA_SOLVE',
      carrierHz: 250,
      beatOffsetHz: 18,
      targetBand: 'Beta (18 Hz)',
      bestFor: 'Active problem solving, mathematics, and intense coding'
    },
    THETA_INSIGHT: {
      id: 'THETA_INSIGHT',
      carrierHz: 194,
      beatOffsetHz: 6,
      targetBand: 'Theta (6 Hz)',
      bestFor: 'Creative ideation, memorization, and mental review'
    },
    GAMMA_PEAK: {
      id: 'GAMMA_PEAK',
      carrierHz: 200,
      beatOffsetHz: 40,
      targetBand: 'Gamma (40 Hz)',
      bestFor: 'High-speed data synthesis and peak cognitive absorption'
    }
  };

  const NOISE_COLORS = {
    PINK: { id: 'PINK', description: 'Gentle steady rainfall filter' },
    BROWN: { id: 'BROWN', description: 'Deep soothing waterfall & forest stream' },
    WHITE: { id: 'WHITE', description: 'Crisp uniform acoustic masking' }
  };

  const DEFAULTS = {
    enabled: true,
    activeMode: 'ALPHA_RELAX',
    noiseColor: 'BROWN',
    binauralVolume: 0.6,
    natureVolume: 0.5,
    masterVolume: 0.7
  };

  const I18N_STRINGS = {
    en: {
      mode_alpha: "Alpha Focus (10 Hz) — Calm Reading & Steady Pace",
      mode_beta: "Beta Problem Solver (18 Hz) — Active Analytical Focus",
      mode_theta: "Theta Insight (6 Hz) — Memorization & Creative Flow",
      mode_gamma: "Gamma Peak (40 Hz) — High-Capacity Information Processing",
      noise_pink: "Pink Noise (Rainfall Masking)",
      noise_brown: "Brown Noise (Deep Waterfall & Stream)",
      noise_white: "White Noise (Crisp Air Flow)"
    },
    ar: {
      mode_alpha: "موجات ألفا (10 هرتز) — قراءة هادئة وتركيز مستمر",
      mode_beta: "موجات بيتا (18 هرتز) — حل المسائل والتركيز التحليلي",
      mode_theta: "موجات ثيتا (6 هرتز) — الحفظ والاسترجاع والاستبصار الذهني",
      mode_gamma: "موجات غاما (40 هرتز) — الاستيعاب الفائق وسرعة المعالجة",
      noise_pink: "ضوضاء وردية (صوت المطر الهادئ)",
      noise_brown: "ضوضاء بنية (هدير الشلال وجريان النهر)",
      noise_white: "ضوضاء بيضاء (حجب سمعي متجانس)"
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

    if (!BINAURAL_MODES[cfg.activeMode]) {
      cfg.activeMode = DEFAULTS.activeMode;
    }

    if (!NOISE_COLORS[cfg.noiseColor]) {
      cfg.noiseColor = DEFAULTS.noiseColor;
    }

    const clampVol = (v) => {
      const f = parseFloat(v);
      return (!isNaN(f) && f >= 0 && f <= 1.0) ? f : 0.5;
    };

    cfg.binauralVolume = clampVol(cfg.binauralVolume);
    cfg.natureVolume = clampVol(cfg.natureVolume);
    cfg.masterVolume = clampVol(cfg.masterVolume);

    return cfg;
  }

  function calculateStereoParameters(modeKey, config = {}) {
    const cfg = validateConfig(config);
    const mode = BINAURAL_MODES[modeKey] || BINAURAL_MODES[cfg.activeMode];

    const leftFreq = mode.carrierHz;
    const rightFreq = mode.carrierHz + mode.beatOffsetHz;

    return {
      mode: mode.id,
      targetBand: mode.targetBand,
      carrierHz: leftFreq,
      leftFrequencyHz: leftFreq,
      rightFrequencyHz: rightFreq,
      beatFrequencyHz: mode.beatOffsetHz,
      binauralGain: Number((cfg.binauralVolume * cfg.masterVolume).toFixed(2)),
      natureGain: Number((cfg.natureVolume * cfg.masterVolume).toFixed(2)),
      noiseColor: cfg.noiseColor,
      formattedLeftHz: `${toWesternDigits(leftFreq)} Hz`,
      formattedRightHz: `${toWesternDigits(rightFreq)} Hz`,
      formattedBeatHz: `${toWesternDigits(mode.beatOffsetHz)} Hz`
    };
  }

  return {
    BINAURAL_MODES,
    NOISE_COLORS,
    DEFAULTS,
    validateConfig,
    calculateStereoParameters,
    sanitizeLocale,
    toWesternDigits,
    getLocalizedText
  };
}));
