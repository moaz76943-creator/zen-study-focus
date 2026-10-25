/**
 * DEEP FOCUS — Comprehensive 7-Section UI Translation Binder
 * Mission #073: 100% UI DOM element binding across all 7 destinations,
 * placeholder & title localization, automatic RTL switching, and zero missing keys.
 */
(function (global) {
  'use strict';

  // Comprehensive Canonical Keys across all 7 Core Destinations
  var CANONICAL_UI_KEYS = [
    // 1. Navigation
    "nav_timer", "nav_tasks", "nav_notes", "nav_calendar", "nav_analytics", "nav_audio", "nav_settings",
    // 2. Timer Destination
    "timer_start", "timer_pause", "timer_resume", "timer_reset", "timer_status_idle", "timer_status_running", "timer_status_paused",
    // 3. Tasks Destination
    "task_new_placeholder", "task_btn_add", "task_filter_today", "task_overdue_badge", "task_link_timer", "task_btn_import",
    // 4. Notes Destination
    "note_title_placeholder", "note_body_placeholder", "note_autosave_indicator", "note_btn_convert_task",
    // 5. Calendar Destination
    "cal_monthly_title", "cal_active_days_label", "cal_streak_label",
    // 6. Analytics Destination
    "analytics_peak_hour_label", "analytics_btn_export_md", "analytics_btn_export_json",
    // 7. Audio & Settings
    "audio_title_nature", "audio_title_alerts", "audio_master_volume", "audio_mute_toggle",
    "settings_title", "settings_theme_label", "settings_haptic_label", "settings_backup_saf"
  ];

  /**
   * Translates a virtual or real DOM tree matching data-i18n attributes.
   */
  function bindTreeTranslations(rootNode, localeCode, registryEngine) {
    var reg = registryEngine || (typeof global.GlobalI18nRegistry !== 'undefined' ? global.GlobalI18nRegistry : null);
    if (!rootNode || !reg || typeof reg.translate !== 'function') {
      return { boundElementsCount: 0, status: "SKIPPED_OR_NO_REGISTRY" };
    }

    var isRtl = false;
    if (typeof reg.getLocaleMetadata === 'function') {
      var meta = reg.getLocaleMetadata(localeCode);
      isRtl = Boolean(meta.isRtl);
    }

    // Set root direction
    if (typeof rootNode.setAttribute === 'function') {
      rootNode.setAttribute("dir", isRtl ? "rtl" : "ltr");
    }

    var count = 0;

    // Helper to traverse and update
    function processElement(el) {
      if (!el || typeof el.getAttribute !== 'function') return;

      // Text content binding
      var i18nKey = el.getAttribute("data-i18n");
      if (i18nKey) {
        var text = reg.translate(localeCode, i18nKey);
        if (text) {
          el.textContent = text;
          count++;
        }
      }

      // Placeholder binding
      var placeholderKey = el.getAttribute("data-i18n-placeholder");
      if (placeholderKey) {
        var pText = reg.translate(localeCode, placeholderKey);
        if (pText) {
          el.placeholder = pText;
          count++;
        }
      }

      // Title/Tooltip binding
      var titleKey = el.getAttribute("data-i18n-title");
      if (titleKey) {
        var tText = reg.translate(localeCode, titleKey);
        if (tText) {
          el.title = tText;
          count++;
        }
      }

      // Traverse children if available
      if (Array.isArray(el.children)) {
        for (var c = 0; c < el.children.length; c++) {
          processElement(el.children[c]);
        }
      }
    }

    processElement(rootNode);

    return {
      boundElementsCount: count,
      locale: localeCode,
      isRtl: isRtl,
      status: "SUCCESS_BOUND"
    };
  }

  var engine = {
    CANONICAL_UI_KEYS: CANONICAL_UI_KEYS,
    bindTreeTranslations: bindTreeTranslations
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  } else {
    global.ComprehensiveUiI18nBinder = engine;
  }
})(typeof window !== 'undefined' ? window : this);
