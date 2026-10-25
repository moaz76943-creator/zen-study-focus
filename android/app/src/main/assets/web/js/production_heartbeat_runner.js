/**
 * DEEP FOCUS — Production Health Heartbeat Runner & Cumulative Ledger
 * Mission #063: Cumulative hourly ledger, 100-entry rolling rotation,
 * stability score calculation, and test suite existence audit.
 */
(function (global) {
  'use strict';

  var MAX_LEDGER_ENTRIES = 100;

  /**
   * Appends an hourly heartbeat entry into the cumulative ledger with a 100-entry rolling cap.
   */
  function appendHeartbeatEntry(ledger, entry) {
    var list = Array.isArray(ledger) ? ledger.slice() : [];
    if (!entry || typeof entry !== 'object') return list;

    var sanitized = {
      timestamp: entry.timestamp || new Date().toISOString(),
      headSha: String(entry.headSha || 'unknown').substring(0, 10),
      status: entry.status === 'ALL_INVARIANTS_HEALTHY' ? 'ALL_INVARIANTS_HEALTHY' : 'WARNING',
      activeSuitesCount: typeof entry.activeSuitesCount === 'number' ? entry.activeSuitesCount : 57
    };

    list.push(sanitized);

    // Keep only the latest 100 entries
    if (list.length > MAX_LEDGER_ENTRIES) {
      list = list.slice(list.length - MAX_LEDGER_ENTRIES);
    }

    return list;
  }

  /**
   * Calculates the cumulative health percentage from the ledger entries.
   */
  function calculateHealthScore(ledger) {
    var list = Array.isArray(ledger) ? ledger : [];
    if (list.length === 0) return 100;

    var healthyCount = 0;
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].status === 'ALL_INVARIANTS_HEALTHY') {
        healthyCount++;
      }
    }

    return Math.round((healthyCount / list.length) * 100);
  }

  /**
   * Audits that required test files are present on the file list.
   */
  function auditRequiredSuitesPresence(availableFiles, requiredPrefixes) {
    var files = Array.isArray(availableFiles) ? availableFiles : [];
    var reqs = Array.isArray(requiredPrefixes) ? requiredPrefixes : [];
    var missing = [];

    for (var i = 0; i < reqs.length; i++) {
      var prefix = reqs[i];
      var found = files.some(function (f) {
        return f.indexOf(prefix) !== -1;
      });
      if (!found) {
        missing.push(prefix);
      }
    }

    return {
      passed: missing.length === 0,
      missingCount: missing.length,
      missingSuites: missing
    };
  }

  var engine = {
    MAX_LEDGER_ENTRIES: MAX_LEDGER_ENTRIES,
    appendHeartbeatEntry: appendHeartbeatEntry,
    calculateHealthScore: calculateHealthScore,
    auditRequiredSuitesPresence: auditRequiredSuitesPresence
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  } else {
    global.ProductionHeartbeatRunner = engine;
  }
})(typeof window !== 'undefined' ? window : this);
