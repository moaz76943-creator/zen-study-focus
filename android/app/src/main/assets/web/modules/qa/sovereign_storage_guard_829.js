(function (global) {
  "use strict";

  function safeGetJSON(key, fallback) {
    try {
      if (typeof localStorage === "undefined") return fallback;
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  }

  function safeSetJSON(key, value) {
    try {
      if (typeof localStorage === "undefined") return false;
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_) {
      return false;
    }
  }

  global.SovereignStorageGuard = {
    safeGetJSON: safeGetJSON,
    safeSetJSON: safeSetJSON
  };
})(typeof window !== "undefined" ? window : globalThis);
