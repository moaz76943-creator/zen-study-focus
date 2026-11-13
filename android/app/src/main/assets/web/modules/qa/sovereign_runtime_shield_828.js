(function (global) {
  "use strict";

  var MAX_LOGS = 15;
  var logs = [];

  function record(kind, msg) {
    logs.push({
      kind: kind,
      message: String(msg || "unknown").slice(0, 160),
      at: new Date().toISOString()
    });
    if (logs.length > MAX_LOGS) logs.shift();
  }

  if (typeof global.addEventListener === "function" && !global.__ZEN_RUNTIME_SHIELD_BOUND__) {
    global.__ZEN_RUNTIME_SHIELD_BOUND__ = true;
    global.addEventListener("error", function (ev) {
      record("error", ev && ev.message ? ev.message : "Script error");
    });
    global.addEventListener("unhandledrejection", function (ev) {
      var reason = ev && ev.reason ? (ev.reason.message || String(ev.reason)) : "Unhandled rejection";
      record("rejection", reason);
    });
  }

  global.SovereignRuntimeShield = {
    getLogs: function () { return logs.slice(); },
    clearLogs: function () { logs.length = 0; },
    safeRun: function (fn, fallback) {
      try {
        return fn();
      } catch (err) {
        record("safeRun", err && err.message ? err.message : String(err));
        return fallback;
      }
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
