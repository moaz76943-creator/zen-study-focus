(function (global) {
  "use strict";

  function collectLocalBackupObject() {
    var payload = {
      schema: "deep-focus-backup-v1",
      exportedAt: new Date().toISOString(),
      storage: {}
    };
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k) payload.storage[k] = localStorage.getItem(k);
      }
    } catch (_) {}
    return payload;
  }

  function validateBackupPayload(rawText) {
    if (!rawText || typeof rawText !== "string") {
      return { ok: false, error: "Empty backup payload" };
    }
    try {
      var parsed = JSON.parse(rawText);
      if (!parsed || typeof parsed !== "object") {
        return { ok: false, error: "Invalid JSON structure" };
      }
      var store = parsed.storage && typeof parsed.storage === "object" ? parsed.storage : parsed;
      var keys = Object.keys(store);
      if (keys.length === 0) {
        return { ok: false, error: "Backup contains no keys" };
      }
      return { ok: true, storage: store, count: keys.length };
    } catch (err) {
      return { ok: false, error: err && err.message ? err.message : "Malformed JSON" };
    }
  }

  async function exportWebViewSafe() {
    var jsonStr = JSON.stringify(collectLocalBackupObject(), null, 2);
    // 1. Native AndroidBridge if available
    try {
      if (global.AndroidBridge && typeof global.AndroidBridge.exportBackup === "function") {
        global.AndroidBridge.exportBackup(jsonStr);
        return { method: "android_bridge", ok: true };
      }
    } catch (_) {}

    // 2. Web Share API (works cleanly on Android 15 WebView / Chrome)
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({
          title: "Deep Focus Backup",
          text: jsonStr
        });
        return { method: "web_share", ok: true };
      }
    } catch (_) {}

    // 3. Clipboard fallback
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(jsonStr);
        return { method: "clipboard", ok: true };
      }
    } catch (_) {}

    // 4. Standard Blob Download
    try {
      var blob = new Blob([jsonStr], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "deep-focus-backup-" + (function(d){return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);})(new Date()) + ".json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      return { method: "blob", ok: true };
    } catch (err) {
      return { method: "none", ok: false, error: String(err) };
    }
  }

  function restoreValidatedBackup(rawText) {
    var res = validateBackupPayload(rawText);
    if (!res.ok) return res;
    try {
      var keys = Object.keys(res.storage);
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        var v = res.storage[k];
        if (typeof v === "string") localStorage.setItem(k, v);
      }
      return { ok: true, restoredKeys: keys.length };
    } catch (err) {
      return { ok: false, error: err && err.message ? err.message : "Storage write failed" };
    }
  }

  global.SovereignBackupHardening = {
    collectLocalBackupObject: collectLocalBackupObject,
    validateBackupPayload: validateBackupPayload,
    exportWebViewSafe: exportWebViewSafe,
    restoreValidatedBackup: restoreValidatedBackup
  };
})(typeof window !== "undefined" ? window : globalThis);
