(function (global) {
  "use strict";

  var EASTERN_ARABIC = /[\u0660-\u0669\u06F0-\u06F9]/g;
  function toWesternDigits(input) {
    if (input === null || input === undefined) return "";
    return String(input).replace(EASTERN_ARABIC, function (ch) {
      var code = ch.charCodeAt(0);
      if (code >= 0x0660 && code <= 0x0669) return String(code - 0x0660);
      if (code >= 0x06F0 && code <= 0x06F9) return String(code - 0x06F0);
      return ch;
    });
  }

  function getActiveLocale() {
    var lang = "en";
    try {
      lang = (global.UniversalI18nHotSwap && global.UniversalI18nHotSwap.currentLang) ||
             (typeof localStorage !== "undefined" && (localStorage.getItem("zen_lang") || localStorage.getItem("app_lang"))) ||
             (typeof document !== "undefined" && document.documentElement && document.documentElement.lang) ||
             "en";
    } catch (_) {}
    return String(lang || "en").split(/[-_]/)[0].toLowerCase();
  }

  function formatDate(dateInput, options) {
    var d = dateInput instanceof Date ? dateInput : new Date(dateInput || Date.now());
    if (isNaN(d.getTime())) d = new Date();
    var loc = getActiveLocale() + "-u-nu-latn";
    try {
      return toWesternDigits(new Intl.DateTimeFormat(loc, options || { year: "numeric", month: "long", day: "numeric" }).format(d));
    } catch (_) {
      return toWesternDigits(d.toISOString().slice(0, 10));
    }
  }

  function formatMonthYear(dateInput) {
    return formatDate(dateInput, { year: "numeric", month: "long" });
  }

  function t(key, fallback) {
    try {
      if (global.UniversalI18nHotSwap && typeof global.UniversalI18nHotSwap.t === "function") {
        var res = global.UniversalI18nHotSwap.t(key);
        if (res && res !== key) return toWesternDigits(res);
      }
    } catch (_) {}
    return toWesternDigits(fallback || key);
  }

  global.SovereignI18nFormat = {
    getActiveLocale: getActiveLocale,
    toWesternDigits: toWesternDigits,
    formatDate: formatDate,
    formatMonthYear: formatMonthYear,
    t: t
  };
  if (typeof global.t !== "function") {
    global.t = t;
  }
})(typeof window !== "undefined" ? window : globalThis);
