/**
 * DEEP FOCUS — Silent Haptic Breath & Audio Chime Coordinator
 * Cycle: CYCLE-108 (Mission #108)
 * Architecture: v21 Data Fortress Safe, Web Audio Synthesizer & Tactile Haptic Patterns
 * Strict Rules:
 *  - 100-Locale Support with Strict English-Only Fallback
 *  - Absolute Hebrew Exclusion (he, iw -> en)
 *  - Strict Western Digits 0123456789
 *  - Zero External Audio Assets (100% Offline Synthetic Audio)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SilentHapticBreathChimeCoordinator = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const CUE_EVENTS = {
    SESSION_START: 'SESSION_START',
    PHASE_TRANSITION: 'PHASE_TRANSITION',
    SESSION_COMPLETE: 'SESSION_COMPLETE',
    BREATH_INHALE: 'BREATH_INHALE',
    BREATH_HOLD: 'BREATH_HOLD',
    BREATH_EXHALE: 'BREATH_EXHALE',
    HYDRATION_CHECKIN: 'HYDRATION_CHECKIN'
  };

  const CHIME_VOICES = {
    SINGING_BOWL: { id: 'SINGING_BOWL', baseFreq: 216, decaySeconds: 3.5 },
    ZEN_BELL: { id: 'ZEN_BELL', baseFreq: 528, decaySeconds: 2.2 },
    WOODBLOCK: { id: 'WOODBLOCK', baseFreq: 320, decaySeconds: 0.3 }
  };

  const HAPTIC_PATTERNS = {
    [CUE_EVENTS.SESSION_START]: [120],
    [CUE_EVENTS.PHASE_TRANSITION]: [80, 100, 80],
    [CUE_EVENTS.SESSION_COMPLETE]: [100, 80, 100, 80, 220],
    [CUE_EVENTS.BREATH_INHALE]: [60, 40, 60],
    [CUE_EVENTS.BREATH_HOLD]: [40],
    [CUE_EVENTS.BREATH_EXHALE]: [90],
    [CUE_EVENTS.HYDRATION_CHECKIN]: [70, 70, 70]
  };

  const DEFAULTS = {
    hapticsEnabled: true,
    soundEnabled: true,
    preferredVoice: 'ZEN_BELL',
    volume: 0.7,
    vibrationScale: 1.0
  };

  const I18N_STRINGS = {
    en: {
      voice_singing_bowl: "Tibetan Singing Bowl (Deep Resonance)",
      voice_zen_bell: "Zen Bell (Crisp Clarity)",
      voice_woodblock: "Organic Woodblock (Soft Tap)",
      cue_triggered_toast: "Sensory cue triggered."
    },
    ar: {
      voice_singing_bowl: "وعاء الغناء التبتي (رنين عميق)",
      voice_zen_bell: "جرس الزن (صفاء ونقاء)",
      voice_woodblock: "طرق خشبي طبيعي (نقرة ناعمة)",
      cue_triggered_toast: "تم تفعيل التنبيه الحسي."
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
    cfg.hapticsEnabled = Boolean(cfg.hapticsEnabled);
    cfg.soundEnabled = Boolean(cfg.soundEnabled);

    if (!CHIME_VOICES[cfg.preferredVoice]) {
      cfg.preferredVoice = DEFAULTS.preferredVoice;
    }

    const vol = parseFloat(cfg.volume);
    cfg.volume = (!isNaN(vol) && vol >= 0 && vol <= 1.0) ? vol : DEFAULTS.volume;

    const scale = parseFloat(cfg.vibrationScale);
    cfg.vibrationScale = (!isNaN(scale) && scale >= 0.5 && scale <= 2.0) ? scale : DEFAULTS.vibrationScale;

    return cfg;
  }

  function getVibrationPattern(cueEvent, config) {
    const cfg = validateConfig(config);
    if (!cfg.hapticsEnabled) return [];

    const basePattern = HAPTIC_PATTERNS[cueEvent] || [100];
    return basePattern.map(ms => Math.max(10, Math.round(ms * cfg.vibrationScale)));
  }

  function getAudioParameters(cueEvent, config) {
    const cfg = validateConfig(config);
    if (!cfg.soundEnabled) return null;

    const voice = CHIME_VOICES[cfg.preferredVoice] || CHIME_VOICES.ZEN_BELL;
    const baseFreq = voice.baseFreq;
    const harmonics = [
      { freq: baseFreq, gain: cfg.volume },
      { freq: baseFreq * 2.02, gain: cfg.volume * 0.4 },
      { freq: baseFreq * 3.01, gain: cfg.volume * 0.15 }
    ];

    return {
      voice: voice.id,
      baseFrequencyHz: baseFreq,
      decaySeconds: voice.decaySeconds,
      harmonics,
      volume: cfg.volume,
      volumeFormatted: toWesternDigits(cfg.volume * 100) + '%'
    };
  }

  function prepareCue(cueEvent, config) {
    const cfg = validateConfig(config);
    const vibration = getVibrationPattern(cueEvent, cfg);
    const audio = getAudioParameters(cueEvent, cfg);

    return {
      event: cueEvent,
      vibrationPattern: vibration,
      audioParams: audio,
      timestamp: Date.now()
    };
  }

  return {
    CUE_EVENTS,
    CHIME_VOICES,
    DEFAULTS,
    validateConfig,
    getVibrationPattern,
    getAudioParameters,
    prepareCue,
    sanitizeLocale,
    toWesternDigits,
    getLocalizedText
  };
}));
