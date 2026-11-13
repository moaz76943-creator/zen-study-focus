/**
 * DEEP FOCUS — generated numeral invariants (not a user-text DOM rewriter).
 * Call the opt-in sanitizer only on system-owned/translated strings.
 */
(function (global) {
  'use strict';
  // Digit blocks (all written as escapes so no text-normalising tool can collapse them):
  // Arabic-Indic U+0660, Persian U+06F0, Devanagari U+0966, Bengali U+09E6.
  const BLOCKS = [0x0660, 0x06F0, 0x0966, 0x09E6];
  const NON_LATIN_CLASS = '\\u0660-\\u0669\\u06F0-\\u06F9\\u0966-\\u096F\\u09E6-\\u09EF';
  const REPLACE_DIGITS = new RegExp('[' + NON_LATIN_CLASS + ']', 'g');
  const HAS_NON_LATIN_DIGITS = new RegExp('[' + NON_LATIN_CLASS + ']'); // Never use a global regex with test().
  function toLatinDigit(char) {
    const code = char.charCodeAt(0);
    for (let i = 0; i < BLOCKS.length; i++) {
      if (code >= BLOCKS[i] && code <= BLOCKS[i] + 9) return String(code - BLOCKS[i]);
    }
    return char;
  }

  function sanitizeToWesternDigits(value) {
    const text = typeof value === 'string' ? value : String(value);
    return text.replace(REPLACE_DIGITS, toLatinDigit);
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
