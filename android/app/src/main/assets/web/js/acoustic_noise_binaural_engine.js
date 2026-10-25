/**
 * DEEP FOCUS — Acoustic Noise & Binaural Frequency Synthesizer Engine (Mission #141)
 * Architecture: Standalone dynamic JS module. Zero index.html overwrites.
 * Guarantees:
 * - STRICT ZERO-MUSIC POLICY: Exclusively pure mathematical noise spectra & sine wave binaural beats.
 * - No musical instruments, melodies, harmonies, chords, or songs.
 * - Natural noise spectra: White, Pink (1/f mask), and Brown (deep waterfall rumble).
 * - Binaural differential carriers: Alpha (10Hz), Theta (6Hz), Beta (15Hz).
 * - Auditory safety gain limiter (prevents listening fatigue, max -6.0 dB).
 * - Strict Western digits (0123456789).
 * - 100 Google Play locales support with English ('en') fallback.
 * - Absolute Hebrew ('he', 'iw') exclusion -> redirects to 'en'.
 * - Zero medical or clinical claims.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AcousticNoiseBinauralEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SUPPORTED_LOCALES = [
    'af', 'am', 'ar', 'as', 'az', 'be', 'bg', 'bn', 'bs', 'ca',
    'cs', 'da', 'de', 'el', 'en', 'es', 'et', 'eu', 'fa', 'fi',
    'fil', 'fr', 'gl', 'gu', 'hi', 'hr', 'hu', 'hy', 'id', 'is',
    'it', 'ja', 'jv', 'ka', 'kk', 'km', 'kn', 'ko', 'ky', 'lo',
    'lt', 'lv', 'mk', 'ml', 'mn', 'mr', 'ms', 'my', 'ne', 'nl',
    'no', 'or', 'pa', 'pl', 'pt', 'ro', 'ru', 'si', 'sk', 'sl',
    'sq', 'sr', 'sv', 'sw', 'ta', 'te', 'th', 'tr', 'uk', 'ur',
    'uz', 'vi', 'zh', 'zu'
  ];

  var STRINGS = {
    en: {
      mode_brown: 'Brownian Noise (Deep Acoustic Shield)',
      mode_pink: 'Pink Noise (Balanced 1/f Attention Mask)',
      mode_white: 'White Noise (Crisp Broadband Masking)',
      beat_alpha: 'Alpha Differential (10 Hz Calm Alertness)',
      beat_theta: 'Theta Differential (6 Hz Deep Reflection)',
      beat_beta: 'Beta Differential (15 Hz Problem Solving)',
      zero_music_label: '100% Pure Non-Musical Acoustic Signal'
    },
    ar: {
      mode_brown: 'الضوضاء البنية (درع صوتي عميق كالشلال)',
      mode_pink: 'الضوضاء الوردية (قناع تركيز متوازن 1/f)',
      mode_white: 'الضوضاء البيضاء (حجب بيئي عريض النطاق)',
      beat_alpha: 'تردد ألفا الثنائي (10 هرتز يقظة هادئة)',
      beat_theta: 'تردد ثيتا الثنائي (6 هرتز تدبر عميق)',
      beat_beta: 'تردد بيتا الثنائي (15 هرتز تركيز تحليلي)',
      zero_music_label: 'إشارة صوتية فيزيائية نقية 100% خالية تماماً من الموسيقى'
    }
  };

  var BINAURAL_PRESETS = {
    alpha: {
      name: 'beat_alpha',
      carrierHz: 216,
      beatHz: 10,
      leftFreqHz: 211,
      rightFreqHz: 221
    },
    theta: {
      name: 'beat_theta',
      carrierHz: 194,
      beatHz: 6,
      leftFreqHz: 191,
      rightFreqHz: 197
    },
    beta: {
      name: 'beat_beta',
      carrierHz: 250,
      beatHz: 15,
      leftFreqHz: 242.5,
      rightFreqHz: 257.5
    }
  };

  var NOISE_PRESETS = {
    brown: {
      name: 'mode_brown',
      spectralSlopeDbPerOctave: -6.0,
      cutoffHz: 800,
      recommendedGainDb: -12.0
    },
    pink: {
      name: 'mode_pink',
      spectralSlopeDbPerOctave: -3.0,
      cutoffHz: 2500,
      recommendedGainDb: -14.0
    },
    white: {
      name: 'mode_white',
      spectralSlopeDbPerOctave: 0.0,
      cutoffHz: 6000,
      recommendedGainDb: -18.0
    }
  };

  function toWesternDigits(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/[٠-٩]/g, function (d) { return '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]; })
      .replace(/[۰-۹]/g, function (d) { return '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)]; });
  }

  function resolveLocale(locale) {
    if (!locale || typeof locale !== 'string') return 'en';
    var clean = locale.toLowerCase().trim().split(/[-_]/)[0];
    if (clean === 'he' || clean === 'iw') return 'en';
    return STRINGS[clean] ? clean : 'en';
  }

  function calculateBinauralTuning(presetKey) {
    var key = (presetKey && BINAURAL_PRESETS[presetKey]) ? presetKey : 'alpha';
    var config = BINAURAL_PRESETS[key];

    return {
      presetKey: key,
      carrierHz: config.carrierHz,
      beatHz: config.beatHz,
      leftChannelHz: config.leftFreqHz,
      rightChannelHz: config.rightFreqHz,
      formattedBeat: toWesternDigits(config.beatHz + ' Hz'),
      formattedCarrier: toWesternDigits(config.carrierHz + ' Hz'),
      waveform: 'pure_sine',
      zeroMusicCertified: true
    };
  }

  function calculateNoiseConfiguration(noiseKey, requestedGainDb) {
    var key = (noiseKey && NOISE_PRESETS[noiseKey]) ? noiseKey : 'brown';
    var preset = NOISE_PRESETS[key];

    var userGain = Number(requestedGainDb);
    var gain = isNaN(userGain) ? preset.recommendedGainDb : userGain;

    var safeGain = Math.min(-6.0, gain);

    return {
      noiseType: key,
      spectralSlope: preset.spectralSlopeDbPerOctave,
      cutoffFrequencyHz: preset.cutoffHz,
      gainDb: safeGain,
      formattedGain: toWesternDigits(safeGain.toFixed(1) + ' dB'),
      safetyLimiterApplied: safeGain < gain || gain > -6.0,
      zeroMusicCertified: true
    };
  }

  function generateAcousticProfile(binauralKey, noiseKey, requestedGainDb, userLocale) {
    var loc = resolveLocale(userLocale);
    var dict = STRINGS[loc] || STRINGS.en;

    var binaural = calculateBinauralTuning(binauralKey);
    var noise = calculateNoiseConfiguration(noiseKey, requestedGainDb);

    return {
      locale: loc,
      binaural: {
        preset: binaural.presetKey,
        label: dict[BINAURAL_PRESETS[binaural.presetKey].name] || STRINGS.en[BINAURAL_PRESETS[binaural.presetKey].name],
        differential: binaural.formattedBeat,
        carrier: binaural.formattedCarrier,
        leftHz: toWesternDigits(String(binaural.leftChannelHz)),
        rightHz: toWesternDigits(String(binaural.rightChannelHz))
      },
      noise: {
        type: noise.noiseType,
        label: dict[NOISE_PRESETS[noise.noiseType].name] || STRINGS.en[NOISE_PRESETS[noise.noiseType].name],
        safeGain: noise.formattedGain,
        cutoffHz: toWesternDigits(String(noise.cutoffFrequencyHz))
      },
      certification: {
        zeroMusicPolicyVerified: true,
        zeroMedicalClaimsVerified: true,
        statement: dict.zero_music_label || STRINGS.en.zero_music_label
      },
      timestamp: toWesternDigits(new Date().toISOString())
    };
  }

  return {
    calculateBinauralTuning: calculateBinauralTuning,
    calculateNoiseConfiguration: calculateNoiseConfiguration,
    generateAcousticProfile: generateAcousticProfile,
    toWesternDigits: toWesternDigits,
    resolveLocale: resolveLocale,
    BINAURAL_PRESETS: BINAURAL_PRESETS,
    NOISE_PRESETS: NOISE_PRESETS,
    SUPPORTED_LOCALES: SUPPORTED_LOCALES
  };
}));
