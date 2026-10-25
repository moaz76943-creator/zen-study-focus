/**
 * DEEP FOCUS — generated numeral invariants (not a user-text DOM rewriter).
 * Call the opt-in sanitizer only on system-owned/translated strings.
 */
(function (global) {
  'use strict';
  const TO_LATIN = Object.freeze({
    '٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9',
    '۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9'
  });
  const REPLACE_DIGITS = /[٠-٩۰-۹]/g;
  const HAS_NON_LATIN_DIGITS = /[٠-٩۰-۹]/; // Never use a global regex with test().

  function sanitizeToWesternDigits(value) {
    const text = typeof value === 'string' ? value : String(value);
    return text.replace(REPLACE_DIGITS, char => TO_LATIN[char]);
  }

  // System-generated values only. Do not apply these functions to note/task input.
  function formatSystemNumber(value, options) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '';
    try {
      return new Intl.NumberFormat('en-US-u-nu-latn', options || {}).format(n);
    } catch (_) {
      return '';
    }
  }

  function formatTimerDisplay(totalSeconds) {
    const number = Number(totalSeconds);
    const sec = Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
    const pad = n => String(n).padStart(2, '0');
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const seconds = sec % 60;
    const timer = (hours ? pad(hours) + ':' : '') + pad(minutes) + ':' + pad(seconds);
    return '\u200E' + timer + '\u200E';
  }

  function formatPercentage(value) {
    const n = Number(value);
    const percentage = Number.isFinite(n) ? Math.round(n) : 0;
    return '\u200E' + String(percentage) + '%\u200E';
  }

  function formatDateStamp(value) {
    const d = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(d.getTime())) return '';
    return String(d.getFullYear()).padStart(4, '0') + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function formatAmount(value, currency) {
    const code = String(currency || 'USD').toUpperCase();
    if (!/^[A-Z]{3}$/.test(code)) return '';
    return formatSystemNumber(value, { style: 'currency', currency: code });
  }

  function containsOnlyWesternDigits(value) {
    return typeof value === 'string' && !HAS_NON_LATIN_DIGITS.test(value);
  }

  const api = {
    sanitizeToWesternDigits, formatSystemNumber, formatTimerDisplay,
    formatPercentage, formatDateStamp, formatAmount, containsOnlyWesternDigits
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.ZenNumerals = api;
})(typeof window !== 'undefined' ? window : globalThis);
