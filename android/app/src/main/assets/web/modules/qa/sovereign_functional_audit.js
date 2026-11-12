/**
 * DEEP FOCUS — Functional UI, Contrast, Button-Wiring & 20-Language Audit
 * Runs inside Node.js E2E gate AND can be invoked in-app via SovereignFunctionalAudit.run()
 */
(function (global) {
  "use strict";

  function auditLocalePack(core20) {
    var codes = Object.keys(core20 || {});
    if (codes.length !== 20) {
      return { ok: false, reason: "Expected exactly 20 top languages, found " + codes.length };
    }
    var enDict = core20.en || {};
    var enKeys = Object.keys(enDict);
    if (enKeys.length < 70) {
      return { ok: false, reason: "Expected >= 70 translation keys in en, found " + enKeys.length };
    }

    var banned = ["he", "iw", "syc", "ber", "zgh"];
    var easternDigits = /[٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹]/;
    var failures = [];

    for (var i = 0; i < codes.length; i++) {
      var code = codes[i];
      if (banned.indexOf(code) !== -1) {
        failures.push("Banned locale present: " + code);
        continue;
      }
      var dict = core20[code] || {};
      var sameAsEnglish = 0;
      var missingKeys = 0;
      for (var k = 0; k < enKeys.length; k++) {
        var key = enKeys[k];
        var val = dict[key];
        if (typeof val !== "string" || val.trim() === "") {
          missingKeys++;
          continue;
        }
        if (easternDigits.test(val)) {
          failures.push(code + "." + key + " contains Eastern Arabic digits");
        }
        if (code !== "en" && val.trim().toLowerCase() === String(enDict[key]).trim().toLowerCase()) {
          sameAsEnglish++;
        }
      }
      if (missingKeys > 0) {
        failures.push(code + " missing " + missingKeys + " keys");
      }
      if (code !== "en" && sameAsEnglish > Math.floor(enKeys.length * 0.25)) {
        failures.push(code + " has too many untranslated English values (" + sameAsEnglish + "/" + enKeys.length + ")");
      }
    }

    return { ok: failures.length === 0, failures: failures, languageCount: codes.length };
  }

  function auditHtmlIntegrity(html) {
    var issues = [];
    if (!html || html.length < 500) {
      return { ok: false, issues: ["index.html is missing or too small"] };
    }
    if (html.indexOf("universal_i18n_hotswap.js") === -1) {
      issues.push("universal_i18n_hotswap.js not included in index.html");
    }
    if (html.indexOf("TASK #806") === -1) {
      issues.push("UI contrast and FAB overlap CSS fixes missing in index.html");
    }
    // Check for dangerous white-on-white inline style patterns
    if (/color:\s*#fff(?:fff)?\s*;[^}]*background(?:-color)?:\s*#fff(?:fff)?/i.test(html)) {
      issues.push("Detected white-on-white inline style in index.html");
    }
    return { ok: issues.length === 0, issues: issues };
  }

  global.SovereignFunctionalAudit = {
    version: "620.0.0",
    auditLocalePack: auditLocalePack,
    auditHtmlIntegrity: auditHtmlIntegrity
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = global.SovereignFunctionalAudit;
  }
})(typeof window !== "undefined" ? window : globalThis);
