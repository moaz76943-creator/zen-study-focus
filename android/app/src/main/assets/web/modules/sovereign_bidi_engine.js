/**
 * DEEP FOCUS — SovereignBidiEngine (v590.0.0)
 * Bi-directional RTL (Right-to-Left) and LTR layout management and number isolation.
 * Guarantees zero text-inversion bugs for Arabic and perfect Western digit alignment.
 */
(function (global) {
  'use strict';

  var RTL_LANGUAGES = ['ar', 'fa', 'ur', 'he_disabled'];
  var currentDir = 'ltr';

  var SovereignBidiEngine = {
    version: '590.0.0',

    isRtlLanguage: function (langCode) {
      if (!langCode || typeof langCode !== 'string') return false;
      var clean = langCode.toLowerCase().split('-')[0].split('_')[0];
      return RTL_LANGUAGES.indexOf(clean) !== -1;
    },

    setDirection: function (langCode) {
      var isRTL = this.isRtlLanguage(langCode);
      currentDir = isRTL ? 'rtl' : 'ltr';

      if (typeof document !== 'undefined') {
        if (document.documentElement) {
          document.documentElement.setAttribute('dir', currentDir);
          document.documentElement.setAttribute('lang', langCode || 'en');
        }
        if (document.body) {
          document.body.setAttribute('dir', currentDir);
          if (isRTL) {
            document.body.classList.add('df-rtl-mode');
            document.body.classList.remove('df-ltr-mode');
          } else {
            document.body.classList.add('df-ltr-mode');
            document.body.classList.remove('df-rtl-mode');
          }
        }
      }

      if (global.SovereignEventBus && typeof global.SovereignEventBus.emit === 'function') {
        global.SovereignEventBus.emit('direction:changed', { direction: currentDir, isRTL: isRTL });
      }
      return currentDir;
    },

    getDirection: function () {
      return currentDir;
    },

    isRTL: function () {
      return currentDir === 'rtl';
    },

    /**
     * Isolates numbers using Unicode Left-to-Right Embedding (U+202A ... U+202C)
     * Prevents timer strings (e.g. "25:00") from inverting in Arabic contexts.
     * @param {string|number} numStr
     */
    isolateNumber: function (numStr) {
      if (typeof numStr === 'undefined' || numStr === null) return '';
      var s = String(numStr);
      // Unicode Left-to-Right Isolate (U+2066) and Pop Directional Isolate (U+2069)
      return '\u2066' + s + '\u2069';
    }
  };

  // Wire automatic direction update on locale changes
  if (typeof global !== 'undefined') {
    if (global.SovereignEventBus && typeof global.SovereignEventBus.on === 'function') {
      global.SovereignEventBus.on('locale:changed', function (data) {
        var lang = data && data.lang ? data.lang : 'en';
        SovereignBidiEngine.setDirection(lang);
      });
    }
  }

  global.SovereignBidiEngine = SovereignBidiEngine;
  if (global.SovereignCoreRegistry && typeof global.SovereignCoreRegistry.register === 'function') {
    global.SovereignCoreRegistry.register('sovereign_bidi_engine', SovereignBidiEngine);
  }
})(typeof window !== 'undefined' ? window : globalThis);
