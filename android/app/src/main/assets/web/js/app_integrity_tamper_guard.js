/**
 * DEEP FOCUS — App Integrity & Anti-Tamper Guard Engine
 * Mission #076: Repackaging protection, modding detection,
 * storage checksum verification, and seamless developer bypass.
 */
(function (global) {
  'use strict';

  var OFFICIAL_PACKAGE_PREFIX = "com.deepfocus";
  var OFFICIAL_SIGNATURE_HASH = "ZEN_OFFICIAL_SIG_2026";

  /**
   * Generates a tamper-evident checksum for session/goals data.
   */
  function generateDataChecksum(dataString) {
    if (typeof dataString !== 'string') return "0";
    var hash = 0;
    for (var i = 0; i < dataString.length; i++) {
      var char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Evaluates application integrity against modding / tampering.
   * @param {Object} context - { packageName, signatureHash, isDevEnv, dataPayload, providedChecksum }
   * @returns {Object} Integrity audit verdict.
   */
  function evaluateAppIntegrity(context) {
    context = context || {};

    // 1. Developer Bypass: Always permit clean development in Termux/Node.js/AI Agents
    if (context.isDevEnv || typeof window === 'undefined') {
      return {
        status: "PASSED_DEV_ENVIRONMENT",
        isTampered: false,
        reason: "DEVELOPER_FREEDOM_PRESERVED"
      };
    }

    // 2. Package Name Tampering Check (Detects repackaged mods)
    var pkg = String(context.packageName || '');
    if (pkg && pkg.indexOf(OFFICIAL_PACKAGE_PREFIX) !== 0) {
      return {
        status: "TAMPER_DETECTED",
        isTampered: true,
        violation: "UNOFFICIAL_PACKAGE_NAME: " + pkg
      };
    }

    // 3. Signature Verification (Detects re-signed cracked APKs)
    var sig = String(context.signatureHash || '');
    if (sig && sig !== OFFICIAL_SIGNATURE_HASH) {
      return {
        status: "TAMPER_DETECTED",
        isTampered: true,
        violation: "INVALID_SIGNATURE_HASH"
      };
    }

    // 4. Data Checksum Verification (Detects external hex-editing of storage)
    if (context.dataPayload && context.providedChecksum) {
      var computed = generateDataChecksum(context.dataPayload);
      if (computed !== context.providedChecksum) {
        return {
          status: "TAMPER_DETECTED",
          isTampered: true,
          violation: "STORAGE_CHECKSUM_MISMATCH"
        };
      }
    }

    return {
      status: "INTEGRITY_VERIFIED_SECURE",
      isTampered: false,
      reason: "ALL_SECURITY_GATES_PASSED"
    };
  }

  var engine = {
    OFFICIAL_PACKAGE_PREFIX: OFFICIAL_PACKAGE_PREFIX,
    OFFICIAL_SIGNATURE_HASH: OFFICIAL_SIGNATURE_HASH,
    generateDataChecksum: generateDataChecksum,
    evaluateAppIntegrity: evaluateAppIntegrity
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  } else {
    global.AppIntegrityTamperGuard = engine;
  }
})(typeof window !== 'undefined' ? window : this);
