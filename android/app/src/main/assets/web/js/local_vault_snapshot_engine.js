/**
 * DEEP FOCUS — Local Vault Auto-Snapshot & Session Export Engine
 * Cycle: CYCLE-107 (Mission #107)
 * Architecture: v21 Data Fortress Safe, Offline-First Vault Snapshot & Integrity Verifier
 * Strict Rules:
 *  - 100-Locale Support with Strict English-Only Fallback
 *  - Absolute Hebrew Exclusion (he, iw -> en)
 *  - Strict Western Digits 0123456789
 *  - Zero Outbound Network Calls (Local-First Sandbox)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LocalVaultSnapshotEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const VAULT_MAGIC = 'DEEP_FOCUS_VAULT_V21';
  const SCHEMA_VERSION = 'v21.0';

  const I18N_STRINGS = {
    en: {
      vault_export_success: "Local vault snapshot exported successfully.",
      vault_import_success: "Vault backup restored and verified successfully.",
      vault_err_invalid_magic: "Invalid vault format: Missing Deep Focus v21 header.",
      vault_err_checksum_mismatch: "Integrity check failed: Vault checksum does not match.",
      vault_err_corrupt_data: "Corrupt vault data payload."
    },
    ar: {
      vault_export_success: "تم تصدير اللقطة الاحتياطية للخزنة المحلية بنجاح.",
      vault_import_success: "تمت استعادة والتحقق من سلامة نسخة الخزنة بنجاح.",
      vault_err_invalid_magic: "تنسيق غير صالح للخزنة: ترويسة v21 مفقودة.",
      vault_err_checksum_mismatch: "فشل التحقق من التكامل: رمز الفحص غير متطابق.",
      vault_err_corrupt_data: "بيانات الخزنة تالفة أو غير مكتملة."
    }
  };

  function sanitizeLocale(locale) {
    if (!locale || typeof locale !== 'string') return 'en';
    const clean = locale.toLowerCase().trim().split(/[-_]/)[0];
    if (clean === 'he' || clean === 'iw') {
      return 'en';
    }
    return clean;
  }

  function toWesternDigits(num) {
    const val = Number(num);
    if (isNaN(val)) return '0';
    return Math.round(val).toString();
  }

  function getLocalizedText(locale, key) {
    const clean = sanitizeLocale(locale);
    const dict = (clean === 'ar') ? I18N_STRINGS.ar : I18N_STRINGS.en;
    return dict[key] || I18N_STRINGS.en[key] || '';
  }

  function calculateChecksum(str) {
    let a = 1;
    let b = 0;
    const MOD_ADLER = 65521;
    for (let i = 0; i < str.length; i++) {
      a = (a + str.charCodeAt(i)) % MOD_ADLER;
      b = (b + a) % MOD_ADLER;
    }
    const val = (b << 16) | a;
    return (val >>> 0).toString(16).padStart(8, '0');
  }

  function createVaultSnapshot(appState, metadata = {}) {
    const statePayload = appState || {};
    const serialized = JSON.stringify(statePayload);
    const checksum = calculateChecksum(serialized);
    const timestamp = Date.now();

    const envelope = {
      magic: VAULT_MAGIC,
      schemaVersion: SCHEMA_VERSION,
      createdAt: timestamp,
      timestampFormatted: new Date(timestamp).toISOString(),
      checksum,
      sessionCount: Array.isArray(statePayload.sessions) ? statePayload.sessions.length : 0,
      metadata: Object.assign({}, metadata),
      data: statePayload
    };

    return {
      envelope,
      serialized: JSON.stringify(envelope, null, 2),
      checksum,
      sessionCount: envelope.sessionCount
    };
  }

  function verifyAndRestoreSnapshot(rawInput, locale = 'en') {
    let envelope;
    try {
      envelope = typeof rawInput === 'string' ? JSON.parse(rawInput) : rawInput;
    } catch (e) {
      return {
        success: false,
        error: getLocalizedText(locale, 'vault_err_corrupt_data'),
        data: null
      };
    }

    if (!envelope || envelope.magic !== VAULT_MAGIC) {
      return {
        success: false,
        error: getLocalizedText(locale, 'vault_err_invalid_magic'),
        data: null
      };
    }

    if (!envelope.data || typeof envelope.data !== 'object') {
      return {
        success: false,
        error: getLocalizedText(locale, 'vault_err_corrupt_data'),
        data: null
      };
    }

    const serialized = JSON.stringify(envelope.data);
    const computedChecksum = calculateChecksum(serialized);

    if (computedChecksum !== envelope.checksum) {
      return {
        success: false,
        error: getLocalizedText(locale, 'vault_err_checksum_mismatch'),
        data: null,
        expected: envelope.checksum,
        actual: computedChecksum
      };
    }

    return {
      success: true,
      message: getLocalizedText(locale, 'vault_import_success'),
      data: envelope.data,
      sessionCount: Array.isArray(envelope.data.sessions) ? envelope.data.sessions.length : 0,
      schemaVersion: envelope.schemaVersion
    };
  }

  return {
    VAULT_MAGIC,
    SCHEMA_VERSION,
    calculateChecksum,
    createVaultSnapshot,
    verifyAndRestoreSnapshot,
    sanitizeLocale,
    toWesternDigits,
    getLocalizedText
  };
}));
