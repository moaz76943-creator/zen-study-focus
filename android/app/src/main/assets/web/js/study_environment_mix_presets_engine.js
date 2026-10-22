/**
 * DEEP FOCUS — Study Environment Mix Presets Engine (M089)
 * File: android/app/src/main/assets/web/js/study_environment_mix_presets_engine.js
 *
 * Provides curated, multi-channel procedural nature mixes tailored for specific
 * study environments and cognitive focus states.
 *
 * Core Directives & Standards:
 * - 100% Pure Organic Nature & Ambient Acoustics (Zero Melodies, Zero Songs, Music-Free)
 * - 100% Royalty-Free Procedural Visuals (Zero External Bitmaps, Pure Vector SVGs)
 * - Anti-Clipping Headroom Protection (Headroom <= 0.85, Normalization Limiter)
 * - Strict Western Arabic Digits (0123456789)
 * - Strict Hebrew Exclusion (No 'he' / 'iw' locales)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.StudyEnvironmentMixPresetsEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VALID_SOUND_IDS = [
    // Water (8)
    'gentle_rain', 'heavy_rain', 'rain_on_leaves', 'rain_on_window',
    'rain_on_tent', 'forest_stream', 'ocean_waves', 'waterfall_mist',
    // Forest (6)
    'pine_breeze', 'autumn_leaves_wind', 'morning_forest_birds',
    'night_crickets', 'bamboo_grove_rustle', 'wilderness_wind',
    // Cozy (6)
    'campfire_crackle', 'rainy_library', 'coffee_shop_murmur',
    'clock_pendulum', 'turning_book_pages', 'keyboard_mechanical_typing',
    // White Noise (6)
    'pure_white_noise', 'soft_pink_noise', 'deep_brown_noise',
    'fan_hum', 'train_gentle_rhythm', 'airplane_cabin_hum',
    // Zen (4)
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
      name_ar: 'المكتبة الهادئة',
      name_en: 'Quiet Library',
      category: 'academic',
      description_ar: 'أجواء صامتة مع تقليب أوراق الكتب وبندول ساعة كلاسيكية ومطر ناعم على النوافذ لغمرك في القراءة الأكاديمية.',
      description_en: 'Serene academic quietude with gentle page turns, soft pendulum clock ticks, and distant rain.',
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
      name_ar: 'المقهى الدراسي الدافئ',
      name_en: 'Cozy Study Cafe',
      category: 'productivity',
      description_ar: 'همهمة حيوية لمقهى دراسي بعيد مع مطر رقيق ونقرات كتابة خفيفة لتحفيز الإنجاز السريع والكتابة.',
      description_en: 'Warm background chatter blend with rain on glass and soft typing clicks for creative momentum.',
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
      name_ar: 'كوخ الغابة والموقد',
      name_en: 'Forest Cabin & Hearth',
      category: 'calm',
      description_ar: 'طقطقة موقد الحطب الدافئ مع نسيم أشجار الصنوبر ومطر يلامس النوافذ لتهدئة القلق أثناء المذاكرة المسائية.',
      description_en: 'Crackling fireside warmth wrapped in pine breezes and forest streams for soothing evening study.',
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
      name_ar: 'عزل الضوضاء التام',
      name_en: 'Deep Noise Isolation',
      category: 'shield',
      description_ar: 'مزيج هندسي محكم من الضوضاء البنية والبيضاء وأزيز مروحة هوائية لإخفاء الأصوات المشتتة المحيطة تماماً.',
      description_en: 'Dense multi-frequency acoustic barrier cutting through household chatter and loud street distractions.',
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
      name_ar: 'واحة التأمل والسكينة',
      name_en: 'Zen Temple Sanctuary',
      category: 'mindfulness',
      description_ar: 'حفيف غابة الخيزران مع قطرات حوض الماء الياباني ورنين الأجراس الخشبية لتصفية الذهن وخفض التوتر.',
      description_en: 'Bamboo rustle, Japanese bamboo water fountain drops, and meditative drone for resetting mental fatigue.',
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
      name_ar: 'قطار المذاكرة الليلي',
      name_en: 'Midnight Study Train',
      category: 'rhythm',
      description_ar: 'حركة إيقاعية رتيبة لقطار سفر عبر الليل مع أمطار غزيرة تضرب النوافذ للحفاظ على وتيرة تركيز ثابتة ومستمرة.',
      description_en: 'Steady rhythmic railway hum through heavy night rain, creating an uninterrupted trance of focus.',
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
      name_ar: 'برية الخريف الهادئة',
      name_en: 'Autumn Breeze Wilderness',
      category: 'fresh',
      description_ar: 'نسيم رياح الخريف بين الأوراق مع زقزقة طيور الصباح في الغابة وجريان جدول الماء لبداية يوم دراسي نشطة.',
      description_en: 'Crisp autumn foliage winds, morning forest birds, and clear mountain stream for fresh dawn sessions.',
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
      name_ar: 'شاطئ الأفكار والتفكير العميق',
      name_en: 'Coastal Deep Flow',
      category: 'expansive',
      description_ar: 'أمواج محيط متلاطمة بانتظام مع رذاذ الماء ورنين الوعاء التبتي لدعم التفكير التجريدي وكتابة الأبحاث.',
      description_en: 'Rhythmic ocean surf pulses combined with water mist and soft drone for big-picture thesis writing.',
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

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function getPresets() {
    return clone(PRESETS);
  }

  function getPresetById(id) {
    if (!id || typeof id !== 'string') {
      return clone(PRESETS[0]);
    }
    for (var i = 0; i < PRESETS.length; i++) {
      if (PRESETS[i].id === id) {
        return clone(PRESETS[i]);
      }
    }
    return clone(PRESETS[0]);
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

  function applyPreset(presetId, masterVolume) {
    var preset = getPresetById(presetId);
    var calculation = calculateNormalizedGains(preset.channels, masterVolume);

    return {
      presetId: preset.id,
      name_ar: preset.name_ar,
      name_en: preset.name_en,
      category: preset.category,
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
    var preset = getPresetById(presetId);
    var width = (options && options.width) || 400;
    var height = (options && options.height) || 250;
    var lang = (options && options.lang === 'ar') ? 'ar' : 'en';

    var title = lang === 'ar' ? preset.name_ar : preset.name_en;
    var desc = lang === 'ar' ? preset.description_ar : preset.description_en;
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
        '<rect x="280" y="18" width="96" height="22" rx="11" fill="#1E293B" stroke="#334155" stroke-width="1"/>' +
        '<text x="328" y="33" fill="' + accent + '" font-size="10" font-family="system-ui, sans-serif" font-weight="bold" text-anchor="middle">' +
          preset.category.toUpperCase() +
        '</text>' +
        '<text x="24" y="58" fill="#F8FAFC" font-size="20" font-family="system-ui, sans-serif" font-weight="700">' +
          title +
        '</text>' +
        '<text x="24" y="80" fill="#94A3B8" font-size="12" font-family="system-ui, sans-serif">' +
          (lang === 'ar' ? preset.name_en : preset.name_ar) +
        '</text>' +
        '<text x="24" y="106" fill="#CBD5E1" font-size="11" font-family="system-ui, sans-serif">' +
          desc.substring(0, 75) + '...' +
        '</text>' +
        '<text x="24" y="136" fill="' + accent + '" font-size="10" font-family="system-ui, sans-serif" font-weight="bold" letter-spacing="1">' +
          'NATURE SOUND BLENDS (' + channelCount + ' CHANNELS)' +
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
    if (!preset.name_ar || !preset.name_en) {
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
