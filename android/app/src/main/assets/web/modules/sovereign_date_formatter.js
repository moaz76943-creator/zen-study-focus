/**
 * DEEP FOCUS — SovereignDateFormatter (v591.0.0)
 * Unified regional date, clock, duration, and relative time formatter.
 * Enforces numberingSystem: 'latn' (0123456789) across all Arabic & global locales.
 */
(function (global) {
  'use strict';

  var currentLocale = 'en';

  var SovereignDateFormatter = {
    version: '591.0.0',

    setLocale: function (loc) {
      if (loc && typeof loc === 'string') {
        currentLocale = loc;
      }
      return currentLocale;
    },

    getLocale: function () {
      return currentLocale;
    },

    /**
     * Formats duration in seconds into clean MM:SS or HH:MM:SS
     * Always uses Western Arabic numerals (0123456789)
     * @param {number} totalSec
     */
    formatDuration: function (totalSec) {
      var s = Math.max(0, parseInt(totalSec || 0, 10));
      var hrs = Math.floor(s / 3600);
      var rem = s % 3600;
      var mins = Math.floor(rem / 60);
      var secs = rem % 60;

      var pad = function (n) { return (n < 10 ? '0' : '') + n; };

      if (hrs > 0) {
        return pad(hrs) + ':' + pad(mins) + ':' + pad(secs);
      }
      return pad(mins) + ':' + pad(secs);
    },

    /**
     * Formats timestamp into localized date with strict Western numbering
     * @param {number|Date} timestamp
     * @param {string} locale
     */
    formatDate: function (timestamp, locale) {
      var loc = locale || currentLocale;
      var date = timestamp instanceof Date ? timestamp : new Date(timestamp || Date.now());

      try {
        if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
          // Explicitly request Latin numerals (0-9) even in Arabic locales
          var dtf = new Intl.DateTimeFormat(loc + '-u-nu-latn', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
          return dtf.format(date);
        }
      } catch (e) {}

      // Fallback
      return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
    },

    /**
     * Formats wall clock time (e.g. 14:30 or 2:30 PM)
     */
    formatTime: function (timestamp, locale, use24Hour) {
      var loc = locale || currentLocale;
      var date = timestamp instanceof Date ? timestamp : new Date(timestamp || Date.now());

      try {
        if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
          var dtf = new Intl.DateTimeFormat(loc + '-u-nu-latn', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: !Boolean(use24Hour)
          });
          return dtf.format(date);
        }
      } catch (e) {}

      var pad = function (n) { return (n < 10 ? '0' : '') + n; };
      return pad(date.getHours()) + ':' + pad(date.getMinutes());
    },

    /**
     * Formats relative time (e.g. "Just now", "5m ago", "Yesterday")
     */
    formatRelativeTime: function (timestamp) {
      var now = Date.now();
      var ts = timestamp instanceof Date ? timestamp.getTime() : parseInt(timestamp, 10);
      var diffSec = Math.floor((now - ts) / 1000);

      if (diffSec < 60) return 'Just now';
      var diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return diffMin + 'm ago';
      var diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return diffHours + 'h ago';
      var diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return 'Yesterday';
      return diffDays + 'd ago';
    }
  };

  // Sync with SovereignEventBus on locale changes
  if (typeof global !== 'undefined') {
    if (global.SovereignEventBus && typeof global.SovereignEventBus.on === 'function') {
      global.SovereignEventBus.on('locale:changed', function (data) {
        if (data && data.lang) {
          SovereignDateFormatter.setLocale(data.lang);
        }
      });
    }
  }

  global.SovereignDateFormatter = SovereignDateFormatter;
  if (global.SovereignCoreRegistry && typeof global.SovereignCoreRegistry.register === 'function') {
    global.SovereignCoreRegistry.register('sovereign_date_formatter', SovereignDateFormatter);
  }
})(typeof window !== 'undefined' ? window : globalThis);
