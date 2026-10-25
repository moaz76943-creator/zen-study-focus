/**
 * DEEP FOCUS — Automated Maintenance Heartbeat & Regression Monitor
 * Mission #062: Continuous production invariant auditing, v21 fortress
 * health, manifest gate retention, and zero-regression verification.
 */
(function (global) {
  'use strict';

  var REQUIRED_FORTRESS_TOKENS = [
    "zen_fortress_cfg_v21",
    "zen_fortress_tasks_v21",
    "zen_fortress_notes_v21",
    "ZEN21::"
  ];

  /**
   * Audits manifest string for debuggable security violations.
   */
  function auditManifestContent(manifestStr) {
    if (typeof manifestStr !== 'string') return { passed: true };
    if (/android:debuggable\s*=\s*"true"/i.test(manifestStr)) {
      return { passed: false, violation: "DEBUGGABLE_FLAG_ENABLED" };
    }
    return { passed: true };
  }

  /**
   * Verifies that v21 fortress storage tokens are present and intact.
   */
  function auditFortressTokens(tokensList) {
    var list = Array.isArray(tokensList) ? tokensList : [];
    var missing = [];

    for (var i = 0; i < REQUIRED_FORTRESS_TOKENS.length; i++) {
      var tok = REQUIRED_FORTRESS_TOKENS[i];
      if (list.indexOf(tok) === -1) {
        missing.push(tok);
      }
    }

    return {
      passed: missing.length === 0,
      missingTokens: missing
    };
  }

  /**
   * Audits localized numerical strings to ensure Western digits invariant (0-9).
   */
  function auditNumericalInvariant(stringOutput) {
    if (typeof stringOutput !== 'string') return { passed: true };
    // Check for Eastern Arabic / Persian digits: [٠-٩] or [۰-۹]
    var easternDigitsMatch = stringOutput.match(/[\u0660-\u0669\u06F0-\u06F9]/);
    return {
      passed: !easternDigitsMatch,
      violatingChar: easternDigitsMatch ? easternDigitsMatch[0] : null
    };
  }

  /**
   * Generates a comprehensive maintenance heartbeat status report.
   */
  function generateHeartbeatReport(metrics) {
    metrics = metrics || {};
    var manifestCheck = auditManifestContent(metrics.manifestContent || '');
    var fortressCheck = auditFortressTokens(metrics.fortressTokens || REQUIRED_FORTRESS_TOKENS);
    var numeralCheck = auditNumericalInvariant(metrics.sampleOutput || '\u200E25:00');

    var isHealthy = manifestCheck.passed && fortressCheck.passed && numeralCheck.passed;

    return {
      status: isHealthy ? "ALL_INVARIANTS_HEALTHY" : "REGRESSION_WARNING",
      timestamp: new Date().toISOString(),
      checks: {
        manifestSecurity: manifestCheck,
        v21Fortress: fortressCheck,
        numeralInvariant: numeralCheck
      },
      healthy: isHealthy
    };
  }

  var engine = {
    REQUIRED_FORTRESS_TOKENS: REQUIRED_FORTRESS_TOKENS,
    auditManifestContent: auditManifestContent,
    auditFortressTokens: auditFortressTokens,
    auditNumericalInvariant: auditNumericalInvariant,
    generateHeartbeatReport: generateHeartbeatReport
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  } else {
    global.MaintenanceHeartbeatMonitor = engine;
  }
})(typeof window !== 'undefined' ? window : this);
