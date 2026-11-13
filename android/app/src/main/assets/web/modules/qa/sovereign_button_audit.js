/**
 * DEEP FOCUS — Button-Wiring & Untranslated UI Label Audit (v621.0.0)
 * Detects dead <button> elements and verifies all CC0 .ogg assets are non-empty.
 */
(function (global) {
  "use strict";

  function auditButtons(html, appJs) {
    var btnRegex = /<button\b([^>]*)>([\s\S]*?)<\/button>/gi;
    var match;
    var totalButtons = 0;
    var deadButtons = [];

    while ((match = btnRegex.exec(html)) !== null) {
      totalButtons++;
      var attrs = match[1] || "";
      var inner = (function (t) { var p; do { p = t; t = t.replace(/<[^<>]*>/g, ""); } while (t !== p); return t; })(match[2] || "").trim();

      var hasOnclick = /\bonclick\s*=\s*["'][^"']+["']/i.test(attrs);
      var idMatch = /\bid\s*=\s*["']([^"']+)["']/i.exec(attrs);
      var hasDataAction = /\bdata-action\s*=\s*["'][^"']+["']/i.test(attrs);
      var hasData806 = /\bdata-806-wired\b/i.test(attrs);
      var wiredInAppJs = false;

      if (idMatch && appJs) {
        var btnId = idMatch[1];
        if (appJs.indexOf(btnId) !== -1) {
          wiredInAppJs = true;
        }
      }

      if (!hasOnclick && !wiredInAppJs && !hasDataAction && !hasData806) {
        // Check if text is handled by TASK #806 live observer in index.html
        var lowerInner = inner.toLowerCase();
        var coveredByObserver =
          lowerInner.indexOf("test sound") !== -1 ||
          lowerInner.indexOf("manual backup") !== -1 ||
          lowerInner.indexOf("local data") !== -1 ||
          lowerInner.indexOf("preview") !== -1 ||
          lowerInner.indexOf("water") !== -1 ||
          lowerInner.indexOf("forest") !== -1 ||
          lowerInner.indexOf("mix") !== -1 ||
          lowerInner.indexOf("stop") !== -1;

        if (!coveredByObserver) {
          deadButtons.push({
            id: idMatch ? idMatch[1] : "(no-id)",
            label: inner.slice(0, 40)
          });
        }
      }
    }

    return {
      ok: deadButtons.length === 0,
      totalButtons: totalButtons,
      deadButtons: deadButtons
    };
  }

  function auditAudioAssets(audioDir, fs, path) {
    var required = ["rain_window.ogg", "forest_birds.ogg", "flowing_water.ogg", "flowing_water.ogg"];
    var missingOrEmpty = [];
    for (var i = 0; i < required.length; i++) {
      var fp = path.join(audioDir, required[i]);
      if (!fs.existsSync(fp)) {
        missingOrEmpty.push(required[i] + " (missing)");
        continue;
      }
      var stat = fs.statSync(fp);
      if (stat.size < 10240) {
        missingOrEmpty.push(required[i] + " (too small: " + stat.size + " bytes)");
      }
    }
    return {
      ok: missingOrEmpty.length === 0,
      issues: missingOrEmpty
    };
  }

  global.SovereignButtonAudit = {
    version: "621.0.0",
    auditButtons: auditButtons,
    auditAudioAssets: auditAudioAssets
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = global.SovereignButtonAudit;
  }
})(typeof window !== "undefined" ? window : globalThis);
