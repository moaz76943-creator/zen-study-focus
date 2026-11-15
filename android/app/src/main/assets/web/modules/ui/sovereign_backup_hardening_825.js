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
    } catch (err) { if (global.__dfRecordError) global.__dfRecordError("backup_825", err); }
    return payload;
  }

  var MAX_BACKUP_CHARS = 4 * 1024 * 1024;
  var ALLOWED_KEY = /^(zen_fortress_(cfg|tasks|notes)_v21(_mirror)?|df_[A-Za-z0-9_]{1,80})$/;

  function validateBackupPayload(rawText) {
    if (!rawText || typeof rawText !== "string") {
      return { ok: false, error: "Empty backup payload" };
    }
    if (rawText.length > MAX_BACKUP_CHARS) {
      return { ok: false, error: "Backup is too large" };
    }
    try {
      var parsed = JSON.parse(rawText);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return { ok: false, error: "Invalid JSON structure" };
      }
      var store = parsed.storage && typeof parsed.storage === "object" ? parsed.storage : parsed;
      var keys = Object.keys(store);
      if (keys.length === 0) {
        return { ok: false, error: "Backup contains no keys" };
      }
      var clean = Object.create(null);
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (k === "__proto__" || !ALLOWED_KEY.test(k)) {
          return { ok: false, error: "Backup contains a key that is not allowed: " + String(k).slice(0, 40) };
        }
        if (typeof store[k] !== "string") {
          return { ok: false, error: "Backup value is not text: " + k };
        }
        clean[k] = store[k];
      }
      return { ok: true, storage: clean, count: keys.length };
    } catch (err) {
      return { ok: false, error: err && err.message ? err.message : "Malformed JSON" };
    }
  }

  var _pendingSafResultCb = null;
  global.dfOnBackupExportResult = function (status) {
    global.__dfLastBackupExportStatus = status;
    if (typeof _pendingSafResultCb === "function") {
      var cb = _pendingSafResultCb;
      _pendingSafResultCb = null;
      try { cb(status); } catch (err) { if (global.__dfRecordError) global.__dfRecordError("backup_825_cb", err); }
    }
  };

  async function exportWebViewSafe(options) {
    var opts = options && typeof options === "object" ? options : {};
    if (opts.allowPlaintext !== true) {
      return { ok: false, status: "blocked_plaintext", error: "Encrypted native export unavailable; explicit plaintext confirmation required." };
    }
    var jsonStr = JSON.stringify(collectLocalBackupObject(), null, 2);
    // 0. Native ZenNative.exportBackupToFile (canonical MainActivity bridge)
    try {
      if (global.ZenNative && typeof global.ZenNative.exportBackupToFile === "function" && typeof global.generateEncryptedBackupCode === "function") {
        var code = global.generateEncryptedBackupCode();
        if (typeof code === "string" && code.indexOf("ZEN21::") === 0) {
          if (typeof opts.onResult === "function") _pendingSafResultCb = opts.onResult;
          global.__dfLastBackupExportStatus = "started";
          global.ZenNative.exportBackupToFile(code);
          return { method: "zen_native_saf", status: "started", ok: true };
        }
      }
    } catch (err) { if (global.__dfRecordError) global.__dfRecordError("backup_825", err); }

    // 1. Native AndroidBridge if available
    try {
      if (global.AndroidBridge && typeof global.AndroidBridge.exportBackup === "function") {
        global.AndroidBridge.exportBackup(jsonStr);
        return { method: "android_bridge", ok: true };
      }
    } catch (err) { if (global.__dfRecordError) global.__dfRecordError("backup_825", err); }

    // 2. Web Share API (works cleanly on Android 15 WebView / Chrome)
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({
          title: "Deep Focus Backup",
          text: jsonStr
        });
        return { method: "web_share", ok: true };
      }
    } catch (err) { if (global.__dfRecordError) global.__dfRecordError("backup_825", err); }

    // 3. Clipboard fallback
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(jsonStr);
        return { method: "clipboard", ok: true };
      }
    } catch (err) { if (global.__dfRecordError) global.__dfRecordError("backup_825", err); }

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
    var keys = Object.keys(res.storage);
    var snapshot = {};
    var written = [];
    try {
      for (var i = 0; i < keys.length; i++) {
        snapshot[keys[i]] = localStorage.getItem(keys[i]);
      }
      for (var j = 0; j < keys.length; j++) {
        var k = keys[j];
        localStorage.setItem(k, res.storage[k]);
        written.push(k);
        if (localStorage.getItem(k) !== res.storage[k]) throw new Error("Write verification failed for " + k);
      }
      return { ok: true, restoredKeys: keys.length };
    } catch (err) {
      // Roll back every key already touched so a partial restore never remains.
      for (var r = 0; r < written.length; r++) {
        try {
          if (snapshot[written[r]] === null) localStorage.removeItem(written[r]);
          else localStorage.setItem(written[r], snapshot[written[r]]);
        } catch (err) { if (global.__dfRecordError) global.__dfRecordError("backup_825", err); }
      }
      return { ok: false, error: err && err.message ? err.message : "Storage write failed", rolledBack: true };
    }
  }

  global.SovereignBackupHardening = {
    collectLocalBackupObject: collectLocalBackupObject,
    validateBackupPayload: validateBackupPayload,
    exportWebViewSafe: exportWebViewSafe,
    restoreValidatedBackup: restoreValidatedBackup
  };
})(typeof window !== "undefined" ? window : globalThis);
