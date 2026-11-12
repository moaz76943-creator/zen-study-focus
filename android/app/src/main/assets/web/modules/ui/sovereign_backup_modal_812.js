/**
 * DEEP FOCUS — WebView-Safe Manual Backup & Restore Modal (v625.0.0)
 * Works 100% offline in Android WebView even when <a download> or Clipboard API is blocked.
 */
(function (global) {
  "use strict";

  function collectAllLocalData() {
    var data = { exportedAt: new Date().toISOString(), version: "625.0.0", storage: {} };
    try {
      if (typeof localStorage !== "undefined") {
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k) data.storage[k] = localStorage.getItem(k);
        }
      }
    } catch (e) {}
    return JSON.stringify(data, null, 2);
  }

  function restoreFromJson(rawJson) {
    try {
      var parsed = JSON.parse(rawJson);
      if (!parsed || typeof parsed.storage !== "object") {
        return { ok: false, error: "Invalid backup format" };
      }
      var keys = Object.keys(parsed.storage);
      for (var i = 0; i < keys.length; i++) {
        localStorage.setItem(keys[i], String(parsed.storage[keys[i]]));
      }
      return { ok: true, restoredKeys: keys.length };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  function openBackupModal() {
    if (typeof document === "undefined" || !document.body) return false;
    var existing = document.getElementById("sovereignBackupModal812");
    if (existing) existing.remove();

    var jsonText = collectAllLocalData();
    var modal = document.createElement("div");
    modal.id = "sovereignBackupModal812";
    modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;";
    modal.innerHTML =
      '<div style="background:#111827;color:#F9FAFB;border:1px solid #374151;border-radius:16px;padding:18px;max-width:420px;width:100%;font-family:sans-serif;">' +
        '<h3 style="margin:0 0 8px 0;font-size:17px;">Manual Backup (Offline JSON)</h3>' +
        '<textarea id="backupJsonArea812" rows="7" style="width:100%;background:#0B0F19;color:#E5E7EB;border:1px solid #374151;border-radius:10px;padding:10px;font-size:12px;font-family:monospace;"></textarea>' +
        '<div id="backupStatus812" style="font-size:12px;color:#34D399;margin-top:6px;min-height:18px;"></div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;margin-top:12px;">' +
          '<button type="button" id="copyBackupBtn812" style="padding:10px 14px;border-radius:10px;border:none;background:#2563EB;color:#fff;font-weight:600;">Copy JSON</button>' +
          '<button type="button" id="restoreBackupBtn812" style="padding:10px 14px;border-radius:10px;border:1px solid #10B981;background:transparent;color:#34D399;font-weight:600;">Restore</button>' +
          '<button type="button" id="closeBackupBtn812" style="padding:10px 14px;border-radius:10px;border:1px solid #4B5563;background:transparent;color:#E5E7EB;">Close</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);

    var area = document.getElementById("backupJsonArea812");
    var status = document.getElementById("backupStatus812");
    area.value = jsonText;

    document.getElementById("copyBackupBtn812").onclick = function () {
      area.select();
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(area.value).catch(function () {});
        }
        document.execCommand("copy");
        status.textContent = "Backup JSON copied!";
      } catch (e) {
        status.textContent = "Select & copy manually above.";
      }
    };

    document.getElementById("restoreBackupBtn812").onclick = function () {
      var res = restoreFromJson(area.value);
      if (res.ok) {
        status.textContent = "Restored " + res.restoredKeys + " records. Reloading...";
        setTimeout(function () { if (global.location) global.location.reload(); }, 600);
      } else {
        status.style.color = "#F87171";
        status.textContent = "Error: " + res.error;
      }
    };

    document.getElementById("closeBackupBtn812").onclick = function () {
      modal.remove();
    };
    return true;
  }

  global.SovereignBackupModal = {
    version: "625.0.0",
    collectAllLocalData: collectAllLocalData,
    restoreFromJson: restoreFromJson,
    openBackupModal: openBackupModal
  };

  // Override exportToClipboard fallback if needed so Manual Backup always shows UI feedback
  if (global.SovereignDataVault) {
    global.SovereignDataVault.openBackupModal = openBackupModal;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = global.SovereignBackupModal;
  }
})(typeof window !== "undefined" ? window : globalThis);
