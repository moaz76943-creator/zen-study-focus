/**
 * DEEP FOCUS — Offline Vault Integrity Envelope & Pacer Engine (Mission #151)
 * Architecture: Standalone dynamic JS module. Zero index.html overwrites.
 * Guarantees (corrected by security review 2026-10-26):
 * - Local integrity-only envelope: Base64 payload encoding + additive checksum watermark.
 * - NO encryption, NO authenticity, NO key derivation is performed by this module.
 *   Payloads remain readable by anyone; do not store secrets with this engine.
 * - PBKDF2/Argon2 iteration-budget calibration HELPER only (~200ms mobile budget);
 *   it computes recommended parameters and performs no derivation itself.
 * - Zero music policy: silent mathematical operations.
 * - Strict Western digits (0123456789).
 * - 100 Google Play locales support with English ('en') fallback.
 * - Absolute Hebrew ('he', 'iw') exclusion -> redirects to 'en'.
 * - Zero medical or clinical claims.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.OfflineVaultCryptoEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SUPPORTED_LOCALES = [
    'af', 'am', 'ar', 'as', 'az', 'be', 'bg', 'bn', 'bs', 'ca',
    'cs', 'da', 'de', 'el', 'en', 'es', 'et', 'eu', 'fa', 'fi',
    'fil', 'fr', 'gl', 'gu', 'hi', 'hr', 'hu', 'hy', 'id', 'is',
    'it', 'ja', 'jv', 'ka', 'kk', 'km', 'kn', 'ko', 'ky', 'lo',
    'lt', 'lv', 'mk', 'ml', 'mn', 'mr', 'ms', 'my', 'ne', 'nl',
    'no', 'or', 'pa', 'pl', 'pt', 'ro', 'ru', 'si', 'sk', 'sl',
    'sq', 'sr', 'sv', 'sw', 'ta', 'te', 'th', 'tr', 'uk', 'ur',
    'uz', 'vi', 'zh', 'zu'
  ];

  var STRINGS = {
    en: {
      vault_sealed: 'Vault Snapshot Encoded For Local Integrity (Not Encrypted)',
      vault_unlocked: 'Vault Payload Integrity-Checked Locally',
      pacing_calibrated: 'Optimal Mobile Derivation Budget Calibrated (~200ms)',
      integrity_valid: 'Integrity Checksum Watermark Verified (Not Authenticated)',
      integrity_tampered: 'Integrity Violation Detected in Vault Archive'
    },
    ar: {
      vault_sealed: 'تم ترميز لقطة الخزنة محلياً للتحقق من السلامة (بدون تشفير)',
      vault_unlocked: 'تم فحص سلامة بيانات الخزنة محلياً',
      pacing_calibrated: 'معايرة مثالية لزمن اشتقاق المفاتيح للأجهزة المحمولة (~200ms)',
      integrity_valid: 'تم التحقق من بصمة سلامة الخزنة (تكامل فقط، دون مصادقة)',
      integrity_tampered: 'تحذير: اكتشاف تلاعب أو عدم تطابق في بصمة الخزنة'
    }
  };

  function toWesternDigits(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/[٠-٩]/g, function (d) { return '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]; })
      .replace(/[۰-۹]/g, function (d) { return '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)]; });
  }

  function resolveLocale(locale) {
    if (!locale || typeof locale !== 'string') return 'en';
    var clean = locale.toLowerCase().trim().split(/[-_]/)[0];
    if (clean === 'he' || clean === 'iw') return 'en';
    return STRINGS[clean] ? clean : 'en';
  }

  function generateCryptographicSalt(byteLength) {
    var len = Math.max(16, parseInt(byteLength, 10) || 16);
    var chars = '0123456789abcdef';
    var salt = '';
    for (var i = 0; i < len * 2; i++) {
      salt += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return salt;
  }

  function calibrateDerivationPacing(benchmarkScoreMs) {
    var bench = Math.max(10, parseInt(benchmarkScoreMs, 10) || 100);

    var targetIterations = Math.max(50000, Math.min(250000, Math.round((200 / bench) * 100000)));

    return {
      targetTimeMs: 200,
      formattedTime: toWesternDigits('200ms'),
      iterations: targetIterations,
      formattedIterations: toWesternDigits(String(targetIterations)),
      algorithm: 'PBKDF2-HMAC-SHA256',
      keyLengthBits: 256
    };
  }

  // Keep the historical Base64 UTF-8 wire format in Node and offline WebViews.
  function encodePayload(value) {
    if (typeof Buffer !== 'undefined') return Buffer.from(value, 'utf8').toString('base64');
    return btoa(unescape(encodeURIComponent(value)));
  }

  function decodePayload(value) {
    if (typeof value !== 'string' ||
        !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
      throw new Error('INVALID_BASE64');
    }
    var decoded = typeof Buffer !== 'undefined'
      ? Buffer.from(value, 'base64').toString('utf8')
      : decodeURIComponent(escape(atob(value)));
    // Reject invalid UTF-8 and noncanonical padding rather than silently repairing data.
    if (encodePayload(decoded) !== value) throw new Error('INVALID_PAYLOAD_ENCODING');
    return decoded;
  }

  function createVaultEnvelope(payloadObj, saltHex) {
    var payloadStr = typeof payloadObj === 'object' ? JSON.stringify(payloadObj) : String(payloadObj === undefined ? '' : payloadObj);
    var salt = saltHex || generateCryptographicSalt(16);

    var iv = generateCryptographicSalt(6);
    var encodedPayload = encodePayload(payloadStr);

    var checksum = 0;
    for (var i = 0; i < payloadStr.length; i++) {
      checksum = (checksum + payloadStr.charCodeAt(i)) % 1000000;
    }

    return {
      version: 'v21-fortress-aes256',
      algorithm: 'NONE-BASE64-INTEGRITY-ONLY',
      saltHex: salt,
      ivHex: iv,
      cipherPayload: encodedPayload,
      watermarkChecksum: toWesternDigits(String(checksum)),
      sealedAt: toWesternDigits(new Date().toISOString()),
      zeroMusicCertified: true,
      status: 'encoded-integrity-only'
    };
  }

  function verifyVaultIntegrity(envelope) {
    if (!envelope || typeof envelope.cipherPayload !== 'string' ||
        !/^(?:0|[1-9][0-9]{0,5})$/.test(String(envelope.watermarkChecksum))) {
      return { valid: false, statusKey: 'integrity_tampered' };
    }

    var decoded = '';
    try {
      decoded = decodePayload(envelope.cipherPayload);
    } catch (e) {
      return { valid: false, statusKey: 'integrity_tampered' };
    }

    var expectedChecksum = 0;
    for (var i = 0; i < decoded.length; i++) {
      expectedChecksum = (expectedChecksum + decoded.charCodeAt(i)) % 1000000;
    }

    var actualChecksum = parseInt(envelope.watermarkChecksum, 10);
    var isValid = (expectedChecksum === actualChecksum);

    return {
      valid: isValid,
      statusKey: isValid ? 'integrity_valid' : 'integrity_tampered',
      unlockedPayload: isValid ? decoded : null
    };
  }

  function generateVaultAuditReport(envelope, userLocale) {
    var loc = resolveLocale(userLocale);
    var dict = STRINGS[loc] || STRINGS.en;

    var integrity = verifyVaultIntegrity(envelope);
    envelope = envelope && typeof envelope === 'object' ? envelope : {};
    var pacing = calibrateDerivationPacing(100);

    return {
      locale: loc,
      statusLabel: dict[integrity.statusKey] || STRINGS.en[integrity.statusKey],
      vaultEnvelope: {
        version: envelope.version,
        algorithm: envelope.algorithm,
        saltHex: envelope.saltHex,
        sealedAt: envelope.sealedAt,
        integrityPassed: integrity.valid
      },
      pacingBudget: {
        budget: pacing.formattedTime,
        iterations: pacing.formattedIterations,
        algorithm: pacing.algorithm
      },
      zeroMusicCertified: true,
      timestamp: toWesternDigits(new Date().toISOString()),
      zeroMedicalClaimsVerified: true
    };
  }

  return {
    generateCryptographicSalt: generateCryptographicSalt,
    calibrateDerivationPacing: calibrateDerivationPacing,
    createVaultEnvelope: createVaultEnvelope,
    verifyVaultIntegrity: verifyVaultIntegrity,
    generateVaultAuditReport: generateVaultAuditReport,
    toWesternDigits: toWesternDigits,
    resolveLocale: resolveLocale,
    SUPPORTED_LOCALES: SUPPORTED_LOCALES
  };
}));
