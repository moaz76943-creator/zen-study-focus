(function (global) {
  "use strict";

  var STORAGE_KEY = "zen_active_timer_anchor_v1";

  function pad2(n) {
    var v = Math.max(0, Math.floor(Number(n) || 0));
    return v < 10 ? "0" + v : String(v);
  }

  function formatMMSS(totalSeconds) {
    var sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    var mins = Math.floor(sec / 60);
    var rem = sec % 60;
    return pad2(mins) + ":" + pad2(rem);
  }

  function saveAnchor(durationSec, isRunning) {
    try {
      var now = Date.now();
      var payload = {
        isRunning: !!isRunning,
        durationSec: Math.max(0, Math.floor(Number(durationSec) || 0)),
        endTimestampMs: isRunning ? now + Math.max(0, Math.floor(Number(durationSec) || 0)) * 1000 : 0,
        savedAtMs: now
      };
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      }
      return payload;
    } catch (_) {
      return null;
    }
  }

  function clearAnchor() {
    try {
      if (typeof localStorage !== "undefined") localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
  }

  function computeRemainingSeconds() {
    try {
      if (typeof localStorage === "undefined") return null;
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || !data.isRunning || !data.endTimestampMs) return null;
      var diffSec = Math.ceil((data.endTimestampMs - Date.now()) / 1000);
      return Math.max(0, diffSec);
    } catch (_) {
      return null;
    }
  }

  function resyncIfVisible() {
    var rem = computeRemainingSeconds();
    if (rem === null) return;
    try {
      if (typeof global.dispatchEvent === "function" && typeof CustomEvent === "function") {
        global.dispatchEvent(new CustomEvent("zen:timer-resync", { detail: { remainingSeconds: rem } }));
      }
    } catch (_) {}
  }

  if (typeof document !== "undefined" && !global.__ZEN_DRIFT_GUARD_BOUND__) {
    global.__ZEN_DRIFT_GUARD_BOUND__ = true;
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") {
        resyncIfVisible();
      }
    });
    global.addEventListener("focus", resyncIfVisible);
  }

  global.SovereignDriftGuard = {
    formatMMSS: formatMMSS,
    saveAnchor: saveAnchor,
    clearAnchor: clearAnchor,
    computeRemainingSeconds: computeRemainingSeconds,
    resyncIfVisible: resyncIfVisible
  };
})(typeof window !== "undefined" ? window : globalThis);
