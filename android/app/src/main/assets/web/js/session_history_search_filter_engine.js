/**
 * DEEP FOCUS — Quick Session History Search & Filter Engine (M101)
 * File: android/app/src/main/assets/web/js/session_history_search_filter_engine.js
 *
 * Provides high-speed multi-facet search, date range filtering, tag categorization,
 * duration thresholding, and paginated sorting for historical study sessions
 * adhering to the v21 Data Fortress schema.
 *
 * Core Directives & Standards:
 * - Decoupled 100-locale support with strict English-only fallback (UniversalI18nBridge)
 * - Strict Western Arabic Digits (0123456789)
 * - Strict Hebrew Exclusion (No 'he' / 'iw' locales)
 * - Regex-safe case-insensitive text search (supports Arabic, Latin, and CJK)
 * - Zero external dependencies, pure lightweight JS
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    var Bridge = require('./universal_i18n_bridge.js');
    module.exports = factory(Bridge);
  } else {
    root.SessionHistorySearchFilterEngine = factory(root.UniversalI18nBridge);
  }
}(typeof self !== 'undefined' ? self : this, function (I18n) {
  'use strict';

  function translate(key, locale) {
    if (I18n && typeof I18n.t === 'function') {
      return I18n.t(key, locale);
    }
    return key;
  }

  function searchSessions(sessions, filterCriteria, options) {
    var list = Array.isArray(sessions) ? sessions : [];
    var criteria = filterCriteria || {};
    var opts = options || {};
    var locale = opts.locale || opts.lang || 'en';

    var query = (criteria.query || '').trim().toLowerCase();
    var tag = (criteria.tag || '').trim();
    var mode = (criteria.mode || '').trim();
    var soundEnvironment = (criteria.soundEnvironment || '').trim();
    var startDate = (criteria.startDate || '').trim();
    var endDate = (criteria.endDate || '').trim();
    var minDuration = typeof criteria.minDuration === 'number' ? criteria.minDuration : null;
    var maxDuration = typeof criteria.maxDuration === 'number' ? criteria.maxDuration : null;
    var interruptedOnly = criteria.interruptedOnly === true;
    var uninterruptedOnly = criteria.uninterruptedOnly === true;

    var filtered = [];
    var aggregatedMinutes = 0;

    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      if (!s) continue;

      var sDate = s.date || (s.timestamp ? String(s.timestamp).split('T')[0] : '');
      var sDuration = (typeof s.duration_minutes === 'number' && !isNaN(s.duration_minutes)) ? s.duration_minutes : 0;
      var sTag = s.tag || 'General';
      var sTask = s.task_name || '';
      var sNotes = s.reflection_notes || '';
      var sMode = s.mode || 'standard_pomodoro';
      var sEnv = s.sound_environment || 'none';
      var sInterrupted = !!s.interrupted;

      if (query.length > 0) {
        var combinedText = (sTask + ' ' + sTag + ' ' + sNotes).toLowerCase();
        if (combinedText.indexOf(query) === -1) {
          continue;
        }
      }

      if (tag && tag !== 'all' && tag !== 'ALL') {
        if (sTag.toLowerCase() !== tag.toLowerCase()) {
          continue;
        }
      }

      if (mode && mode !== 'all' && mode !== 'ALL') {
        if (sMode.toLowerCase() !== mode.toLowerCase()) {
          continue;
        }
      }

      if (soundEnvironment && soundEnvironment !== 'all' && soundEnvironment !== 'ALL') {
        if (sEnv.toLowerCase() !== soundEnvironment.toLowerCase()) {
          continue;
        }
      }

      if (startDate && sDate && sDate < startDate) {
        continue;
      }
      if (endDate && sDate && sDate > endDate) {
        continue;
      }

      if (minDuration !== null && sDuration < minDuration) {
        continue;
      }
      if (maxDuration !== null && sDuration > maxDuration) {
        continue;
      }

      if (interruptedOnly && !sInterrupted) {
        continue;
      }
      if (uninterruptedOnly && sInterrupted) {
        continue;
      }

      filtered.push(s);
      aggregatedMinutes += sDuration;
    }

    var sortBy = opts.sortBy || 'timestamp';
    var sortOrder = opts.sortOrder || 'desc';
    var orderMultiplier = sortOrder === 'asc' ? 1 : -1;

    filtered.sort(function (a, b) {
      if (sortBy === 'duration') {
        var durA = a.duration_minutes || 0;
        var durB = b.duration_minutes || 0;
        return (durA - durB) * orderMultiplier;
      }
      var timeA = a.timestamp || a.date || '';
      var timeB = b.timestamp || b.date || '';
      if (timeA < timeB) return -1 * orderMultiplier;
      if (timeA > timeB) return 1 * orderMultiplier;
      return 0;
    });

    var page = (typeof opts.page === 'number' && opts.page > 0) ? Math.floor(opts.page) : 1;
    var pageSize = (typeof opts.pageSize === 'number' && opts.pageSize > 0) ? Math.floor(opts.pageSize) : 10;
    var totalCount = filtered.length;
    var totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    if (page > totalPages) page = totalPages;

    var startIndex = (page - 1) * pageSize;
    var paginatedItems = filtered.slice(startIndex, startIndex + pageSize);

    return {
      items: paginatedItems,
      totalCount: totalCount,
      totalPages: totalPages,
      currentPage: page,
      pageSize: pageSize,
      aggregatedMinutes: aggregatedMinutes,
      aggregatedHours: Math.round((aggregatedMinutes / 60) * 10) / 10,
      filterApplied: {
        query: query,
        tag: tag || 'all',
        startDate: startDate,
        endDate: endDate,
        sortBy: sortBy,
        sortOrder: sortOrder
      },
      locale: locale
    };
  }

  function extractFilterFacets(sessions) {
    var list = Array.isArray(sessions) ? sessions : [];
    var tagMap = {};
    var envMap = {};
    var modeMap = {};

    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      if (!s) continue;
      if (s.tag) tagMap[s.tag] = true;
      if (s.sound_environment) envMap[s.sound_environment] = true;
      if (s.mode) modeMap[s.mode] = true;
    }

    return {
      tags: Object.keys(tagMap).sort(),
      environments: Object.keys(envMap).sort(),
      modes: Object.keys(modeMap).sort()
    };
  }

  return {
    searchSessions: searchSessions,
    extractFilterFacets: extractFilterFacets
  };
}));
