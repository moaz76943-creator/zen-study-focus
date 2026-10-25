/**
 * DEEP FOCUS — Eye-Friendly Visual Theme & Night Contrast Engine
 * Mission #046: Calm color palettes (Zen Light, OLED Dark, Warm Sepia,
 * High Contrast), CSS custom variable generation, and auto night shift.
 */
(function (global) {
  'use strict';

  var THEMES = {
    zen_light: {
      id: "zen_light",
      nameAr: "نهاري هادئ",
      bg: "#F7F9F7",
      surface: "#FFFFFF",
      textPrimary: "#1A2421",
      textSecondary: "#4A5D54",
      accent: "#3B7A57",
      isDark: false
    },
    oled_dark: {
      id: "oled_dark",
      nameAr: "ليلي داكن OLED",
      bg: "#000000",
      surface: "#121615",
      textPrimary: "#E8F0EC",
      textSecondary: "#9AA8A1",
      accent: "#52B788",
      isDark: true
    },
    warm_sepia: {
      id: "warm_sepia",
      nameAr: "ورقي دافئ للقراءة",
      bg: "#F4ECD8",
      surface: "#FAF4E8",
      textPrimary: "#2C221E",
      textSecondary: "#5C4B43",
      accent: "#8C583A",
      isDark: false
    },
    high_contrast: {
      id: "high_contrast",
      nameAr: "تباين عالٍ للوضوح",
      bg: "#000000",
      surface: "#0A0A0A",
      textPrimary: "#FFFFFF",
      textSecondary: "#FFD60A",
      accent: "#00F5D4",
      isDark: true
    }
  };

  function getThemeTokens(themeKey) {
    if (themeKey && THEMES[themeKey]) {
      return Object.assign({}, THEMES[themeKey]);
    }
    return Object.assign({}, THEMES.zen_light);
  }

  function generateCssVariables(themeKey) {
    var t = getThemeTokens(themeKey);
    return [
      "--zen-bg: " + t.bg + ";",
      "--zen-surface: " + t.surface + ";",
      "--zen-text-primary: " + t.textPrimary + ";",
      "--zen-text-secondary: " + t.textSecondary + ";",
      "--zen-accent: " + t.accent + ";"
    ].join(" ");
  }

  function resolveAutoTheme(hour24, preferOledAtNight) {
    if (!preferOledAtNight) return "zen_light";
    var h = typeof hour24 === 'number' && !isNaN(hour24) ? hour24 : 12;
    if (h >= 20 || h < 6) {
      return "oled_dark";
    }
    return "zen_light";
  }

  var engine = {
    THEMES: THEMES,
    getThemeTokens: getThemeTokens,
    generateCssVariables: generateCssVariables,
    resolveAutoTheme: resolveAutoTheme
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  } else {
    global.VisualThemeContrastEngine = engine;
  }
})(typeof window !== 'undefined' ? window : this);
