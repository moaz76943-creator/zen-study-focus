/**
 * DEEP FOCUS — Quiet Personalization & Focus Sound Balance Engine
 * Mission #035: Multi-channel volume mixer, gentle fading,
 * ambient soundscape presets, and defensive profile sanitization.
 */
(function (global) {
  'use strict';

  var DEFAULT_CHANNELS = {
    rain: 0.0,
    stream: 0.0,
    wind: 0.0,
    white_noise: 0.0
  };

  var SOUNDSCAPES = {
    pure_zen: {
      nameAr: "تركيز صامت تام",
      nameEn: "Pure Zen",
      channels: { rain: 0.0, stream: 0.0, wind: 0.0, white_noise: 0.0 }
    },
    rainy_library: {
      nameAr: "مكتبة ماطرة",
      nameEn: "Rainy Library",
      channels: { rain: 0.6, stream: 0.0, wind: 0.1, white_noise: 0.2 }
    },
    calm_forest: {
      nameAr: "غابة هادئة",
      nameEn: "Calm Forest",
      channels: { rain: 0.0, stream: 0.5, wind: 0.4, white_noise: 0.0 }
    },
    gentle_flow: {
      nameAr: "انسياب هادئ",
      nameEn: "Gentle Flow",
      channels: { rain: 0.3, stream: 0.4, wind: 0.0, white_noise: 0.1 }
    }
  };

  /**
   * Clamps a value strictly between 0.0 and 1.0.
   */
  function clampVolume(val) {
    if (typeof val !== 'number' || isNaN(val)) return 0.0;
    if (val < 0.0) return 0.0;
    if (val > 1.0) return 1.0;
    return Math.round(val * 100) / 100;
  }

  /**
   * Generates a clean, validated default audio profile.
   */
  function createDefaultProfile() {
    return {
      masterVolume: 0.8,
      muted: false,
      activeSoundscape: "pure_zen",
      channels: Object.assign({}, DEFAULT_CHANNELS),
      fadeDurationMs: 1500
    };
  }

  /**
   * Validates and sanitizes any incoming raw profile defensively.
   */
  function sanitizeProfile(raw) {
    if (!raw || typeof raw !== 'object') {
      return createDefaultProfile();
    }
    var profile = createDefaultProfile();

    if (typeof raw.masterVolume === 'number' && !isNaN(raw.masterVolume)) {
      profile.masterVolume = clampVolume(raw.masterVolume);
    }
    profile.muted = Boolean(raw.muted);
    profile.fadeDurationMs = (typeof raw.fadeDurationMs === 'number' && !isNaN(raw.fadeDurationMs) && raw.fadeDurationMs >= 0) ? raw.fadeDurationMs : 1500;
    
    if (raw.activeSoundscape && SOUNDSCAPES[raw.activeSoundscape]) {
      profile.activeSoundscape = raw.activeSoundscape;
    }

    if (raw.channels && typeof raw.channels === 'object') {
      for (var k in DEFAULT_CHANNELS) {
        if (Object.prototype.hasOwnProperty.call(DEFAULT_CHANNELS, k)) {
          if (typeof raw.channels[k] === 'number' && !isNaN(raw.channels[k])) {
            profile.channels[k] = clampVolume(raw.channels[k]);
          }
        }
      }
    }
    return profile;
  }

  /**
   * Applies an ambient soundscape preset to the profile.
   */
  function applyPreset(profile, presetKey) {
    var p = sanitizeProfile(profile);
    if (!SOUNDSCAPES[presetKey]) {
      return p;
    }
    p.activeSoundscape = presetKey;
    var presetChannels = SOUNDSCAPES[presetKey].channels;
    for (var k in presetChannels) {
      if (Object.prototype.hasOwnProperty.call(presetChannels, k)) {
        p.channels[k] = clampVolume(presetChannels[k]);
      }
    }
    return p;
  }

  /**
   * Adjusts volume for a single channel.
   */
  function setChannelVolume(profile, channelKey, volume) {
    var p = sanitizeProfile(profile);
    if (p.channels[channelKey] !== undefined && typeof volume === 'number' && !isNaN(volume)) {
      p.channels[channelKey] = clampVolume(volume);
      p.activeSoundscape = "custom";
    }
    return p;
  }

  /**
   * Sets master volume level.
   */
  function setMasterVolume(profile, volume) {
    var p = sanitizeProfile(profile);
    if (typeof volume === 'number' && !isNaN(volume)) {
      p.masterVolume = clampVolume(volume);
    }
    return p;
  }

  /**
   * Toggles mute state while preserving all individual channel gains.
   */
  function toggleMute(profile) {
    var p = sanitizeProfile(profile);
    p.muted = !p.muted;
    return p;
  }

  /**
   * Calculates effective output volume for a channel (incorporating master & mute).
   */
  function getEffectiveVolume(profile, channelKey) {
    var p = sanitizeProfile(profile);
    if (p.muted || p.masterVolume === 0.0) return 0.0;
    var chVol = p.channels[channelKey] || 0.0;
    return Math.round(chVol * p.masterVolume * 100) / 100;
  }

  /**
   * Calculates linear fade volume steps for gentle audio transitions.
   */
  function calculateFadeSteps(startVol, targetVol, totalDurationMs, stepIntervalMs) {
    startVol = clampVolume(startVol);
    targetVol = clampVolume(targetVol);
    stepIntervalMs = stepIntervalMs || 50;
    var stepsCount = Math.max(1, Math.floor(totalDurationMs / stepIntervalMs));
    var delta = (targetVol - startVol) / stepsCount;
    var steps = [];

    for (var i = 1; i <= stepsCount; i++) {
      steps.push(clampVolume(startVol + delta * i));
    }
    return steps;
  }

  var engine = {
    SOUNDSCAPES: SOUNDSCAPES,
    clampVolume: clampVolume,
    createDefaultProfile: createDefaultProfile,
    sanitizeProfile: sanitizeProfile,
    applyPreset: applyPreset,
    setChannelVolume: setChannelVolume,
    setMasterVolume: setMasterVolume,
    toggleMute: toggleMute,
    getEffectiveVolume: getEffectiveVolume,
    calculateFadeSteps: calculateFadeSteps
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  } else {
    global.QuietPersonalizationEngine = engine;
  }
})(typeof window !== 'undefined' ? window : this);
