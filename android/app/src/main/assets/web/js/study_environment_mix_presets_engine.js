/**
 * DEEP FOCUS — Study Environment Mix Presets Engine (M089 / M092 Updated)
 * File: android/app/src/main/assets/web/js/study_environment_mix_presets_engine.js
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    var Bridge = require('./universal_i18n_bridge.js');
    module.exports = factory(Bridge);
  } else {
    root.StudyEnvironmentMixPresetsEngine = factory(root.UniversalI18nBridge);
  }
}(typeof self !== 'undefined' ? self : this, function (I18n) {
  'use strict';

  var VALID_SOUND_IDS = [
    'gentle_rain', 'heavy_rain', 'rain_on_leaves', 'rain_on_window',
    'rain_on_tent', 'forest_stream', 'ocean_waves', 'waterfall_mist',
    'pine_breeze', 'autumn_leaves_wind', 'morning_forest_birds',
    'night_crickets', 'bamboo_grove_rustle', 'wilderness_wind',
    'campfire_crackle', 'rainy_library', 'coffee_shop_murmur',
    'clock_pendulum', 'turning_book_pages', 'keyboard_mechanical_typing',
    'pure_white_noise', 'soft_pink_noise', 'deep_brown_noise',
    'fan_hum', 'train_gentle_rhythm', 'airplane_cabin_hum',
    'zen_tibetan_bowl_drone', 'wind_chimes_breeze',
    'zen_garden_water_basin', 'deep_meditation_drone'
  ];

  var VALID_SOUND_MAP = {};
  for (var i = 0; i < VALID_SOUND_IDS.length; i++) {
    VALID_SOUND_MAP[VALID_SOUND_IDS[i]] = true;
  }

  var MASTER_HEADROOM_CEILING = 0.85;

  var PRESETS = [
    {
      id: 'quiet_library',
      i18n_name: 'preset.quiet_library.name',
      i18n_desc: 'preset.quiet_library.desc',
      category: 'academic',
      i18n_category: 'category.academic',
      recommended_focus: 'reading_and_comprehension',
      accent_color: '#4A6FA5',
      secondary_color: '#1E293B',
      channels: [
        { soundId: 'rainy_library', volume: 0.50 },
        { soundId: 'turning_book_pages', volume: 0.20 },
        { soundId: 'soft_pink_noise', volume: 0.20 },
        { soundId: 'clock_pendulum', volume: 0.10 }
      ]
    },
    {
      id: 'study_cafe',
      i18n_name: 'preset.study_cafe.name',
      i18n_desc: 'preset.study_cafe.desc',
      category: 'productivity',
      i18n_category: 'category.productivity',
      recommended_focus: 'writing_and_coding',
      accent_color: '#C084FC',
      secondary_color: '#2E1065',
      channels: [
        { soundId: 'coffee_shop_murmur', volume: 0.40 },
        { soundId: 'gentle_rain', volume: 0.30 },
        { soundId: 'deep_brown_noise', volume: 0.20 },
        { soundId: 'keyboard_mechanical_typing', volume: 0.10 }
      ]
    },
    {
      id: 'forest_cabin',
      i18n_name: 'preset.forest_cabin.name',
      i18n_desc: 'preset.forest_cabin.desc',
      category: 'calm',
      i18n_category: 'category.calm',
      recommended_focus: 'evening_review',
      accent_color: '#F97316',
      secondary_color: '#431407',
      channels: [
        { soundId: 'campfire_crackle', volume: 0.40 },
        { soundId: 'pine_breeze', volume: 0.25 },
        { soundId: 'forest_stream', volume: 0.25 },
        { soundId: 'rain_on_window', volume: 0.10 }
      ]
    },
    {
      id: 'deep_noise_isolation',
      i18n_name: 'preset.deep_noise_isolation.name',
      i18n_desc: 'preset.deep_noise_isolation.desc',
      category: 'shield',
      i18n_category: 'category.shield',
      recommended_focus: 'intense_cramming',
      accent_color: '#06B6D4',
      secondary_color: '#083344',
      channels: [
        { soundId: 'deep_brown_noise', volume: 0.45 },
        { soundId: 'pure_white_noise', volume: 0.25 },
        { soundId: 'fan_hum', volume: 0.20 },
        { soundId: 'airplane_cabin_hum', volume: 0.10 }
      ]
    },
    {
      id: 'zen_sanctuary',
      i18n_name: 'preset.zen_sanctuary.name',
      i18n_desc: 'preset.zen_sanctuary.desc',
      category: 'mindfulness',
      i18n_category: 'category.mindfulness',
      recommended_focus: 'mindful_breathing_reset',
      accent_color: '#10B981',
      secondary_color: '#064E3B',
      channels: [
        { soundId: 'bamboo_grove_rustle', volume: 0.35 },
        { soundId: 'zen_garden_water_basin', volume: 0.30 },
        { soundId: 'deep_meditation_drone', volume: 0.20 },
        { soundId: 'wind_chimes_breeze', volume: 0.15 }
      ]
    },
    {
      id: 'midnight_study_train',
      i18n_name: 'preset.midnight_study_train.name',
      i18n_desc: 'preset.midnight_study_train.desc',
      category: 'rhythm',
      i18n_category: 'category.rhythm',
      recommended_focus: 'problem_solving_sprints',
      accent_color: '#3B82F6',
      secondary_color: '#172554',
      channels: [
        { soundId: 'train_gentle_rhythm', volume: 0.40 },
        { soundId: 'heavy_rain', volume: 0.30 },
        { soundId: 'rain_on_window', volume: 0.20 },
        { soundId: 'soft_pink_noise', volume: 0.10 }
      ]
    },
    {
      id: 'autumn_wilderness',
      i18n_name: 'preset.autumn_wilderness.name',
      i18n_desc: 'preset.autumn_wilderness.desc',
      category: 'fresh',
      i18n_category: 'category.fresh',
      recommended_focus: 'morning_deep_work',
      accent_color: '#EAB308',
      secondary_color: '#422006',
      channels: [
        { soundId: 'autumn_leaves_wind', volume: 0.35 },
        { soundId: 'morning_forest_birds', volume: 0.30 },
        { soundId: 'forest_stream', volume: 0.20 },
        { soundId: 'wilderness_wind', volume: 0.15 }
      ]
    },
    {
      id: 'coastal_deep_flow',
      i18n_name: 'preset.coastal_deep_flow.name',
      i18n_desc: 'preset.coastal_deep_flow.desc',
      category: 'expansive',
      i18n_category: 'category.expansive',
      recommended_focus: 'conceptual_thinking',
      accent_color: '#14B8A6',
      secondary_color: '#134E4A',
      channels: [
        { soundId: 'ocean_waves', volume: 0.45 },
        { soundId: 'waterfall_mist', volume: 0.25 },
        { soundId: 'soft_pink_noise', volume: 0.15 },
        { soundId: 'zen_tibetan_bowl_drone', volume: 0.15 }
      ]
    }
  ];

  function translate(key, locale) {
    if (I18n && typeof I18n.t === 'function') {
      return I18n.t(key, locale);
    }
    return key;
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function getPresets(locale) {
    var list = clone(PRESETS);
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      p.name = translate(p.i18n_name, locale);
      p.description = translate(p.i18n_desc, locale);
      p.category_localized = translate(p.i18n_category, locale);
      p.name_en = translate(p.i18n_name, 'en');
      p.name_ar = translate(p.i18n_name, 'ar');
      p.description_en = translate(p.i18n_desc, 'en');
      p.description_ar = translate(p.i18n_desc, 'ar');
    }
    return list;
  }

  function getPresetById(id, locale) {
    var all = getPresets(locale);
    if (!id || typeof id !== 'string') {
      return all[0];
    }
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === id) {
        return all[i];
      }
    }
    return all[0];
  }

  function calculateNormalizedGains(channels, masterVolume) {
    if (typeof masterVolume !== 'number' || isNaN(masterVolume)) {
      masterVolume = 1.0;
    }
    masterVolume = Math.max(0.0, Math.min(1.0, masterVolume));

    if (!Array.isArray(channels) || channels.length === 0) {
      return {
        masterVolume: masterVolume,
        headroomLimit: MASTER_HEADROOM_CEILING,
        totalRawVolume: 0.0,
        scalingFactor: 1.0,
        channels: []
      };
    }

    var totalSum = 0.0;
    var sanitized = [];

    for (var i = 0; i < channels.length; i++) {
      var ch = channels[i];
      if (!ch || typeof ch.soundId !== 'string') continue;

      var rawVol = (typeof ch.volume === 'number' && !isNaN(ch.volume)) ? ch.volume : 0.5;
      rawVol = Math.max(0.0, Math.min(1.0, rawVol));

      sanitized.push({
        soundId: ch.soundId,
        rawVolume: rawVol,
        isValidSound: !!VALID_SOUND_MAP[ch.soundId]
      });
      totalSum += rawVol;
    }

    var scalingFactor = 1.0;
    if (totalSum > MASTER_HEADROOM_CEILING) {
      scalingFactor = MASTER_HEADROOM_CEILING / totalSum;
    }

    var normalizedChannels = [];
    var totalNormalizedSum = 0.0;

    for (var j = 0; j < sanitized.length; j++) {
      var item = sanitized[j];
      var safeGain = item.rawVolume * scalingFactor * masterVolume;
      safeGain = Math.round(safeGain * 10000) / 10000;
      totalNormalizedSum += safeGain;

      normalizedChannels.push({
        soundId: item.soundId,
        rawVolume: item.rawVolume,
        normalizedGain: safeGain,
        isValidSound: item.isValidSound
      });
    }

    return {
      masterVolume: masterVolume,
      headroomLimit: MASTER_HEADROOM_CEILING,
      totalRawVolume: Math.round(totalSum * 10000) / 10000,
      totalNormalizedSum: Math.round(totalNormalizedSum * 10000) / 10000,
      scalingFactor: Math.round(scalingFactor * 10000) / 10000,
      channels: normalizedChannels
    };
  }

  function applyPreset(presetId, masterVolume, locale) {
    var preset = getPresetById(presetId, locale);
    var calculation = calculateNormalizedGains(preset.channels, masterVolume);

    return {
      presetId: preset.id,
      name: preset.name,
      name_en: preset.name_en,
      name_ar: preset.name_ar,
      category: preset.category,
      category_localized: preset.category_localized,
      recommended_focus: preset.recommended_focus,
      accent_color: preset.accent_color,
      masterVolume: calculation.masterVolume,
      headroomLimit: calculation.headroomLimit,
      scalingFactor: calculation.scalingFactor,
      activeChannels: calculation.channels,
      timestamp: new Date().toISOString()
    };
  }

  function customizePreset(presetId, channelModifications) {
    var base = getPresetById(presetId);
    var modified = clone(base);

    if (Array.isArray(channelModifications)) {
      var modMap = {};
      for (var i = 0; i < channelModifications.length; i++) {
        var mod = channelModifications[i];
        if (mod && mod.soundId) {
          modMap[mod.soundId] = mod.volume;
        }
      }

      for (var j = 0; j < modified.channels.length; j++) {
        var ch = modified.channels[j];
        if (typeof modMap[ch.soundId] === 'number') {
          ch.volume = Math.max(0.0, Math.min(1.0, modMap[ch.soundId]));
        }
      }
    }

    return modified;
  }

  function renderPresetCardSVG(presetId, options) {
    var opts = options || {};
    var locale = opts.locale || opts.lang || 'en';
    var preset = getPresetById(presetId, locale);
    var width = opts.width || 400;
    var height = opts.height || 250;

    var title = translate(preset.i18n_name, locale);
    var desc = translate(preset.i18n_desc, locale);
    var catText = translate(preset.i18n_category, locale);
    var channelsLabel = translate('common.channels', locale);

    var accent = preset.accent_color || '#4A6FA5';
    var bgDark = preset.secondary_color || '#0F172A';
    var channelCount = preset.channels.length;
    var channelItemsSvg = '';

    for (var i = 0; i < preset.channels.length; i++) {
      var ch = preset.channels[i];
      var yOffset = 150 + (i * 22);
      var barWidth = Math.round(ch.volume * 120);
      var soundName = ch.soundId.replace(/_/g, ' ');

      channelItemsSvg += '' +
        '<g transform="translate(24, ' + yOffset + ')">' +
          '<text x="0" y="12" fill="#94A3B8" font-size="11" font-family="system-ui, sans-serif">' + soundName + '</text>' +
          '<rect x="180" y="3" width="130" height="9" rx="4.5" fill="#1E293B"/>' +
          '<rect x="180" y="3" width="' + barWidth + '" height="9" rx="4.5" fill="' + accent + '"/>' +
          '<text x="325" y="11" fill="#E2E8F0" font-size="10" font-family="system-ui, sans-serif" font-weight="600">' +
            Math.round(ch.volume * 100) + '%' +
          '</text>' +
        '</g>';
    }

    var svg = '' +
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height + '" width="' + width + '" height="' + height + '">' +
        '<defs>' +
          '<linearGradient id="bgGrad_' + preset.id + '" x1="0%" y1="0%" x2="100%" y2="100%">' +
            '<stop offset="0%" stop-color="' + bgDark + '"/>' +
            '<stop offset="100%" stop-color="#020617"/>' +
          '</linearGradient>' +
        '</defs>' +
        '<rect width="' + width + '" height="' + height + '" rx="16" fill="url(#bgGrad_' + preset.id + ')" stroke="#334155" stroke-width="1.5"/>' +
        '<rect x="24" y="20" width="48" height="4" rx="2" fill="' + accent + '"/>' +
        '<rect x="270" y="18" width="106" height="22" rx="11" fill="#1E293B" stroke="#334155" stroke-width="1"/>' +
        '<text x="323" y="33" fill="' + accent + '" font-size="10" font-family="system-ui, sans-serif" font-weight="bold" text-anchor="middle">' +
          catText.toUpperCase() +
        '</text>' +
        '<text x="24" y="58" fill="#F8FAFC" font-size="20" font-family="system-ui, sans-serif" font-weight="700">' +
          title +
        '</text>' +
        '<text x="24" y="80" fill="#94A3B8" font-size="12" font-family="system-ui, sans-serif">' +
          preset.id.replace(/_/g, ' ') +
        '</text>' +
        '<text x="24" y="106" fill="#CBD5E1" font-size="11" font-family="system-ui, sans-serif">' +
          desc.substring(0, 75) + '...' +
        '</text>' +
        '<text x="24" y="136" fill="' + accent + '" font-size="10" font-family="system-ui, sans-serif" font-weight="bold" letter-spacing="1">' +
          'NATURE SOUND BLENDS (' + channelCount + ' ' + channelsLabel.toUpperCase() + ')' +
        '</text>' +
        channelItemsSvg +
      '</svg>';

    return svg;
  }

  function validatePreset(preset) {
    if (!preset || typeof preset !== 'object') {
      return { valid: false, error: 'Preset must be an object' };
    }
    if (!preset.id || typeof preset.id !== 'string') {
      return { valid: false, error: 'Preset ID is required' };
    }
    if (!preset.i18n_name && !preset.name_en && !preset.name_ar) {
      return { valid: false, error: 'Preset localized names are required' };
    }
    if (!Array.isArray(preset.channels) || preset.channels.length === 0) {
      return { valid: false, error: 'Preset must contain at least one sound channel' };
    }

    for (var i = 0; i < preset.channels.length; i++) {
      var ch = preset.channels[i];
      if (!ch || !ch.soundId || typeof ch.soundId !== 'string') {
        return { valid: false, error: 'Invalid channel soundId at index ' + i };
      }
      if (!VALID_SOUND_MAP[ch.soundId]) {
        return { valid: false, error: 'Sound ID "' + ch.soundId + '" is not recognized in Nature Sounds Sanctuary' };
      }
      if (typeof ch.volume !== 'number' || isNaN(ch.volume) || ch.volume < 0 || ch.volume > 1) {
        return { valid: false, error: 'Volume for "' + ch.soundId + '" must be a number between 0.0 and 1.0' };
      }
    }

    return { valid: true };
  }

  return {
    VALID_SOUND_IDS: VALID_SOUND_IDS,
    MASTER_HEADROOM_CEILING: MASTER_HEADROOM_CEILING,
    getPresets: getPresets,
    getPresetById: getPresetById,
    calculateNormalizedGains: calculateNormalizedGains,
    applyPreset: applyPreset,
    customizePreset: customizePreset,
    renderPresetCardSVG: renderPresetCardSVG,
    validatePreset: validatePreset
  };
}));
