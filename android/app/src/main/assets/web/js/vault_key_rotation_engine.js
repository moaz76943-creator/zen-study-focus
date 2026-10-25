/**
 * DEEP FOCUS — Local Key Rotation & Vault Cryptographic Hardening Engine
 * Cycle: CYCLE-121 (Mission #121)
 * Architecture: v21 Data Fortress Safe, P0 Offline-First Vault Re-Keying & Stream Cipher
 * Strict Rules:
 *  - 100-Locale Support with Strict English-Only Fallback
 *  - Absolute Hebrew Exclusion (he, iw -> en)
 *  - Strict Western Digits 0123456789
 *  - 100% Offline (Local Key Management)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.VaultKeyRotationEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const CIPHER_VERSION = 'v21.1-crypto';

  const I18N_STRINGS = {
    en: {
      key_rotation_success: "Vault encryption key rotated and re-sealed successfully.",
      decrypt_success: "Vault payload decrypted and verified successfully.",
      decrypt_err_auth_fail: "Authentication failed: Invalid key or tampered cipher payload.",
      decrypt_err_corrupt: "Corrupted cipher envelope."
    },
    ar: {
      key_rotation_success: "تم تدوير مفتاح تشفير الخزنة وإعادة ختم البيانات بنجاح.",
      decrypt_success: "تم فك تشفير والتحقق من صحة بيانات الخزنة بنجاح.",
      decrypt_err_auth_fail: "فشلت المصادقة: المفتاح غير صالح أو تم التلاعب بالنص المشفر.",
      decrypt_err_corrupt: "غلاف التشفير تالف أو غير صالح."
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

  function toWesternDigits(num, decimals = 0) {
    const val = Number(num);
    if (isNaN(val)) return '0';
    return decimals > 0 ? val.toFixed(decimals) : Math.round(val).toString();
  }

  function getLocalizedText(locale, key) {
    const clean = sanitizeLocale(locale);
    const dict = (clean === 'ar') ? I18N_STRINGS.ar : I18N_STRINGS.en;
    return dict[key] || I18N_STRINGS.en[key] || '';
  }

  function hashString(str, seed = 1) {
    let a = seed & 0xffff;
    let b = (seed >> 16) & 0xffff;
    const MOD_ADLER = 65521;
    for (let i = 0; i < str.length; i++) {
      a = (a + str.charCodeAt(i)) % MOD_ADLER;
      b = (b + a) % MOD_ADLER;
    }
    const val = (b << 16) | a;
    return (val >>> 0).toString(16).padStart(8, '0');
  }

  function xorStream(inputStr, keyStr) {
    const s = new Uint8Array(256);
    for (let i = 0; i < 256; i++) s[i] = i;

    let j = 0;
    for (let i = 0; i < 256; i++) {
      j = (j + s[i] + keyStr.charCodeAt(i % keyStr.length)) % 256;
      const tmp = s[i];
      s[i] = s[j];
      s[j] = tmp;
    }

    let i = 0;
    j = 0;
    let output = '';
    for (let k = 0; k < inputStr.length; k++) {
      i = (i + 1) % 256;
      j = (j + s[i]) % 256;
      const tmp = s[i];
      s[i] = s[j];
      s[j] = tmp;
      const keyByte = s[(s[i] + s[j]) % 256];
      const charCode = inputStr.charCodeAt(k) ^ keyByte;
      output += String.fromCharCode(charCode);
    }
    return output;
  }

  function encryptPayload(data, secretKey, keyId = 'key_v1') {
    const payloadStr = typeof data === 'string' ? data : JSON.stringify(data);
    const key = String(secretKey || 'zen_default_secret');
    const salt = hashString(key + Date.now(), 5381);
    const effectiveKey = key + salt;

    const cipherRaw = xorStream(payloadStr, effectiveKey);
    const cipherBase64 = (typeof Buffer !== 'undefined')
      ? Buffer.from(cipherRaw, 'binary').toString('base64')
      : btoa(cipherRaw);

    const mac = hashString(cipherBase64 + effectiveKey, 1779033703);
    const timestamp = Date.now();

    return {
      version: CIPHER_VERSION,
      keyId: String(keyId),
      salt,
      mac,
      ciphertext: cipherBase64,
      createdAt: timestamp,
      timestampFormatted: new Date(timestamp).toISOString()
    };
  }

  function decryptPayload(envelope, secretKey, locale = 'en') {
    if (!envelope || !envelope.ciphertext || !envelope.mac || !envelope.salt) {
      return {
        success: false,
        error: getLocalizedText(locale, 'decrypt_err_corrupt'),
        data: null
      };
    }

    const key = String(secretKey || 'zen_default_secret');
    const effectiveKey = key + envelope.salt;

    const computedMac = hashString(envelope.ciphertext + effectiveKey, 1779033703);
    if (computedMac !== envelope.mac) {
      return {
        success: false,
        error: getLocalizedText(locale, 'decrypt_err_auth_fail'),
        data: null
      };
    }

    const cipherRaw = (typeof Buffer !== 'undefined')
      ? Buffer.from(envelope.ciphertext, 'base64').toString('binary')
      : atob(envelope.ciphertext);

    const decryptedStr = xorStream(cipherRaw, effectiveKey);

    let parsedData;
    try {
      parsedData = JSON.parse(decryptedStr);
    } catch (e) {
      parsedData = decryptedStr;
    }

    return {
      success: true,
      message: getLocalizedText(locale, 'decrypt_success'),
      data: parsedData,
      keyId: envelope.keyId
    };
  }

  function rotateKey(envelope, oldSecret, newSecret, newKeyId = 'key_v2', locale = 'en') {
    const decryptResult = decryptPayload(envelope, oldSecret, locale);
    if (!decryptResult.success) {
      return {
        success: false,
        error: decryptResult.error,
        envelope: null
      };
    }

    const newEnvelope = encryptPayload(decryptResult.data, newSecret, newKeyId);
    return {
      success: true,
      message: getLocalizedText(locale, 'key_rotation_success'),
      envelope: newEnvelope,
      oldKeyId: envelope.keyId,
      newKeyId: newEnvelope.keyId
    };
  }

  return {
    CIPHER_VERSION,
    hashString,
    encryptPayload,
    decryptPayload,
    rotateKey,
    sanitizeLocale,
    toWesternDigits,
    getLocalizedText
  };
}));
