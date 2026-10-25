/**
 * DEEP FOCUS — Zen Shareable Accomplishment Card Engine
 * Mission #079: High-res 1080x1080 SVG accomplishment cards,
 * 100% offline, zero-tracking, XML sanitization, and dual theme palettes.
 */
(function (global) {
  'use strict';

  var THEME_PALETTES = {
    oled_dark: {
      bg: "#0A0D0C",
      cardSurface: "#141A18",
      border: "#23302B",
      accent: "#52B788",
      textPrimary: "#E8F0EC",
      textSecondary: "#8A9A92"
    },
    warm_sepia: {
      bg: "#F4ECD8",
      cardSurface: "#FAF4E8",
      border: "#E2D3B8",
      accent: "#8C583A",
      textPrimary: "#2C221E",
      textSecondary: "#6E5B51"
    }
  };

  /**
   * Sanitizes text strings defensively for SVG XML embedding.
   */
  function escapeXml(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Generates a high-resolution 1080x1080 SVG accomplishment card.
   * @param {Object} sessionMetrics - { durationMinutes, taskTitle, category, streakDays, dateStr }
   * @param {Object} options - { themeKey: 'oled_dark'|'warm_sepia', isRtl: boolean }
   * @returns {string} Clean SVG markup string.
   */
  function generateAccomplishmentCardSvg(sessionMetrics, options) {
    sessionMetrics = sessionMetrics || {};
    options = options || {};

    var theme = THEME_PALETTES[options.themeKey] || THEME_PALETTES.oled_dark;
    var isRtl = options.isRtl !== false; // Default Arabic RTL

    var durationMins = typeof sessionMetrics.durationMinutes === 'number' && sessionMetrics.durationMinutes > 0
      ? sessionMetrics.durationMinutes
      : 25;

    var title = escapeXml(sessionMetrics.taskTitle || (isRtl ? "جلسة تركيز عميق" : "Deep Focus Session"));
    var category = escapeXml(sessionMetrics.category || (isRtl ? "دراسة عامة" : "General Study"));
    var dateStr = escapeXml(sessionMetrics.dateStr || new Date().toISOString().split('T')[0]);
    var streakDays = typeof sessionMetrics.streakDays === 'number' ? Math.max(0, sessionMetrics.streakDays) : 1;

    var minsDigits = '\u200E' + durationMins;
    var streakDigits = '\u200E' + streakDays;

    var quoteAr = "خطوة صغيرة هادئة كل يوم تصنع إتقاناً عظيماً.";
    var quoteEn = "Quiet consistency every day creates lasting mastery.";
    var quote = escapeXml(isRtl ? quoteAr : quoteEn);

    var labelMins = isRtl ? "دقيقة تركيز" : "Minutes of Focus";
    var labelStreak = isRtl ? (streakDigits + " أيام استمرارية") : (streakDigits + " Day Streak");

    return [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080" dir="' + (isRtl ? 'rtl' : 'ltr') + '" class="zen-accomplishment-card">',
      '  <rect width="1080" height="1080" fill="' + theme.bg + '"/>',
      '  <rect x="80" y="80" width="920" height="920" rx="40" fill="' + theme.cardSurface + '" stroke="' + theme.border + '" stroke-width="3"/>',
      '  <!-- Brand Header -->',
      '  <text x="540" y="180" text-anchor="middle" fill="' + theme.accent + '" font-family="sans-serif" font-size="32" font-weight="bold" letter-spacing="4">DEEP FOCUS</text>',
      '  <!-- Focus Duration Metric -->',
      '  <text x="540" y="380" text-anchor="middle" fill="' + theme.textPrimary + '" font-family="sans-serif" font-size="120" font-weight="bold">' + minsDigits + '</text>',
      '  <text x="540" y="440" text-anchor="middle" fill="' + theme.textSecondary + '" font-family="sans-serif" font-size="36">' + escapeXml(labelMins) + '</text>',
      '  <!-- Task & Category Divider -->',
      '  <line x1="240" y1="520" x2="840" y2="520" stroke="' + theme.border + '" stroke-width="2"/>',
      '  <text x="540" y="600" text-anchor="middle" fill="' + theme.textPrimary + '" font-family="sans-serif" font-size="44" font-weight="600">' + title + '</text>',
      '  <text x="540" y="660" text-anchor="middle" fill="' + theme.accent + '" font-family="sans-serif" font-size="28">' + category + ' • ' + dateStr + '</text>',
      '  <!-- Streak Badge -->',
      '  <rect x="360" y="720" width="360" height="64" rx="32" fill="' + theme.bg + '" stroke="' + theme.border + '" stroke-width="1.5"/>',
      '  <text x="540" y="762" text-anchor="middle" fill="' + theme.textPrimary + '" font-family="sans-serif" font-size="26" font-weight="bold">🔥 ' + escapeXml(labelStreak) + '</text>',
      '  <!-- Zen Quote Footer -->',
      '  <text x="540" y="890" text-anchor="middle" fill="' + theme.textSecondary + '" font-family="sans-serif" font-size="28" font-style="italic">"' + quote + '"</text>',
      '</svg>'
    ].join('\n');
  }

  var engine = {
    THEME_PALETTES: THEME_PALETTES,
    escapeXml: escapeXml,
    generateAccomplishmentCardSvg: generateAccomplishmentCardSvg
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  } else {
    global.ZenShareableCardEngine = engine;
  }
})(typeof window !== 'undefined' ? window : this);
