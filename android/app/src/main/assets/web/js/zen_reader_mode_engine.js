/**
 * DEEP FOCUS — Zen Reader Mode Engine
 * Mission #085: Distraction-free study notes reading, e-ink styling,
 * typography scale (16-21px), reading time estimator, and scroll tracking.
 */
(function (global) {
  'use strict';

  var WORDS_PER_MINUTE_AR = 180;
  var WORDS_PER_MINUTE_EN = 200;

  var READER_THEMES = {
    warm_sepia: {
      bg: "#FAF4E8",
      text: "#2C221E",
      accent: "#8C583A"
    },
    oled_dark: {
      bg: "#000000",
      text: "#E0E6E3",
      accent: "#52B788"
    },
    zen_light: {
      bg: "#FFFFFF",
      text: "#1A2421",
      accent: "#3B7A57"
    }
  };

  function createReaderConfig(options) {
    options = options || {};
    var scale = typeof options.fontScale === 'number' && options.fontScale >= 0.8 && options.fontScale <= 1.5
      ? options.fontScale
      : 1.0;

    var themeKey = options.themeKey && READER_THEMES[options.themeKey] ? options.themeKey : 'warm_sepia';

    return {
      active: true,
      fontScale: scale,
      baseFontSizePx: Math.round(18 * scale),
      lineHeight: 1.7,
      maxColumnWidthPx: 680,
      themeKey: themeKey,
      themeTokens: READER_THEMES[themeKey],
      hideDistractions: true
    };
  }

  function estimateReadingMetrics(rawContent, isRtl) {
    if (typeof rawContent !== 'string' || !rawContent.trim()) {
      return { wordCount: 0, estimatedMinutes: 0, formattedEstimateAr: "\u200E0 دقيقة", formattedEstimateEn: "\u200E0 mins" };
    }

    var cleanText = rawContent.replace(/<[^>]*>/g, ' ').trim();
    var words = cleanText.split(/\s+/).filter(function (w) { return w.length > 0; });
    var count = words.length;

    var wpm = (isRtl !== false) ? WORDS_PER_MINUTE_AR : WORDS_PER_MINUTE_EN;
    var mins = Math.max(1, Math.ceil(count / wpm));

    return {
      wordCount: count,
      estimatedMinutes: mins,
      formattedEstimateAr: "\u200E" + mins + " دقيقة قراءة",
      formattedEstimateEn: "\u200E" + mins + " min read"
    };
  }

  function calculateScrollProgress(scrollTop, scrollHeight, clientHeight) {
    var top = typeof scrollTop === 'number' && scrollTop >= 0 ? scrollTop : 0;
    var totalHeight = typeof scrollHeight === 'number' && scrollHeight > 0 ? scrollHeight : 1;
    var viewHeight = typeof clientHeight === 'number' && clientHeight > 0 ? clientHeight : 1;

    var maxScroll = Math.max(1, totalHeight - viewHeight);
    var ratio = Math.min(1.0, Math.max(0.0, top / maxScroll));
    var percent = Math.round(ratio * 100);

    return {
      percent: percent,
      formattedPercent: '\u200E' + percent + '%',
      isCompleted: percent >= 98
    };
  }

  var engine = {
    READER_THEMES: READER_THEMES,
    createReaderConfig: createReaderConfig,
    estimateReadingMetrics: estimateReadingMetrics,
    calculateScrollProgress: calculateScrollProgress
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  } else {
    global.ZenReaderModeEngine = engine;
  }
})(typeof window !== 'undefined' ? window : this);
