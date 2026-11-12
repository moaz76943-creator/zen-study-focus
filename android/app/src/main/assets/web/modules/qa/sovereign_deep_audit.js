/**
 * DEEP FOCUS — Comprehensive Pre-Build Deep Audit (v622.0.0)
 */
(function (global) {
  "use strict";

  function extractInlineFunctions(html) {
    var fnNames = [];
    var re = /\bonclick\s*=\s*["']\s*([a-zA-Z_$][\w$.]*)\s*\(/gi;
    var m;
    while ((m = re.exec(html)) !== null) {
      var full = m[1];
      var root = full.split(".")[0];
      if (root !== "window" && root !== "document" && root !== "this" && root !== "event") {
        if (fnNames.indexOf(full) === -1) fnNames.push(full);
      }
    }
    return fnNames;
  }

  function auditOnclickHandlers(html, combinedJs) {
    var fns = extractInlineFunctions(html);
    var missing = [];
    for (var i = 0; i < fns.length; i++) {
      var full = fns[i];
      var leaf = full.split(".").pop();
      var found =
        combinedJs.indexOf("function " + leaf) !== -1 ||
        combinedJs.indexOf(leaf + ":") !== -1 ||
        combinedJs.indexOf(leaf + " =") !== -1 ||
        combinedJs.indexOf(leaf + "=") !== -1;
      if (!found) {
        missing.push(full);
      }
    }
    return { ok: missing.length === 0, checked: fns.length, missing: missing };
  }

  function auditUntranslatedTags(html, hotswapJs) {
    var leafRe = /<(button|h1|h2|h3|h4|label|th|option)\b([^>]*)>([^<]{2,60})<\/\1>/gi;
    var m;
    var unmapped = [];
    var lowerHotswap = (hotswapJs || "").toLowerCase();

    while ((m = leafRe.exec(html)) !== null) {
      var attrs = m[2] || "";
      var text = (m[3] || "").replace(/\s+/g, " ").trim();
      if (!/[A-Za-z]{3,}/.test(text)) continue;
      if (/\bdata-i18n\s*=/.test(attrs)) continue;
      var clean = text.replace(/^[^A-Za-z0-9]+/, "").trim().toLowerCase();
      if (!clean) continue;
      if (lowerHotswap.indexOf('"' + clean + '"') === -1 && lowerHotswap.indexOf("'" + clean + "'") === -1) {
        if (unmapped.indexOf(text) === -1) unmapped.push(text);
      }
    }
    return { unmappedCount: unmapped.length, unmapped: unmapped.slice(0, 30) };
  }

  global.SovereignDeepAudit = {
    version: "622.0.0",
    auditOnclickHandlers: auditOnclickHandlers,
    auditUntranslatedTags: auditUntranslatedTags
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = global.SovereignDeepAudit;
  }
})(typeof window !== "undefined" ? window : globalThis);
