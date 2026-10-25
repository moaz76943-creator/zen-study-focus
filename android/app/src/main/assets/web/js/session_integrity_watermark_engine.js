/**
 * DEEP FOCUS — Deterministic Session Checksum & Integrity Watermark Engine
 * Cycle: CYCLE-127 (Mission #127)
 * Architecture: v21 Data Fortress Safe, Tamper-Evident Session Watermarking
 * Strict Rules:
 *  - 100-Locale Support with Strict English-Only Fallback
 *  - Absolute Hebrew Exclusion (he, iw -> en)
 *  - Strict Western Digits 0123456789
 *  - 100% Offline (Local Hash & Watermark Generator)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SessionIntegrityWatermarkEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const WATERMARK_PREFIX = 'DF-v21';

  const I18N_STRINGS = {
    en: {
      watermark_valid: "Session integrity verified. Data is authentic and unmodified.",
      watermark_tampered: "Integrity check failed: Session parameters have been modified.",
      watermark_missing: "No integrity watermark found on session record.",
      certificate_badge_title: "Verified Study Accomplishment Badge"
    },
    ar: {
      watermark_valid: "تم التحقق من تكامل الجلسة. البيانات موثوقة وغير معدلة.",
      watermark_tampered: "فشل التحقق: تم التلاعب ببيانات الجلسة أو تعديلها.",
      watermark_missing: "العلامة المائية الموثقة للجلسة مفقودة.",
      certificate_badge_title: "شارة إنجاز مدارسة موثقة"
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
    if (typeof num === 'number') {
      return decimals > 0 ? num.toFixed(decimals) : Math.round(num).toString();
    }
    if (typeof num === 'string') {
      return num
        .replace(/[٠۰]/g, '0')
        .replace(/[١۱]/g, '1')
        .replace(/[٢۲]/g, '2')
        .replace(/[٣۳]/g, '3')
        .replace(/[٤۴]/g, '4')
        .replace(/[٥۵]/g, '5')
        .replace(/[٦۶]/g, '6')
        .replace(/[٧۷]/g, '7')
        .replace(/[٨۸]/g, '8')
        .replace(/[٩۹]/g, '9');
    }
    return '0';
  }

  function getLocalizedText(locale, key) {
    const clean = sanitizeLocale(locale);
    const dict = (clean === 'ar') ? I18N_STRINGS.ar : I18N_STRINGS.en;
    return dict[key] || I18N_STRINGS.en[key] || '';
  }

  function calculateChecksum(payloadStr) {
    let a = 1;
    let b = 0;
    const MOD_ADLER = 65521;
    for (let i = 0; i < payloadStr.length; i++) {
      a = (a + payloadStr.charCodeAt(i)) % MOD_ADLER;
      b = (b + a) % MOD_ADLER;
    }
    const val = (b << 16) | a;
    return (val >>> 0).toString(16).padStart(8, '0');
  }

  function createCanonicalString(session) {
    const s = session || {};
    const id = String(s.id || '0');
    const start = String(s.startTime || '0');
    const dur = String(s.durationSeconds || '0');
    const cat = String(s.category || 'General');
    const score = String(s.qualityScore !== undefined ? s.qualityScore : '80');
    return `${id}|${start}|${dur}|${cat}|${score}`;
  }

  function generateSessionWatermark(session) {
    const canonical = createCanonicalString(session);
    const checksum = calculateChecksum(canonical);
    return `${WATERMARK_PREFIX}-${checksum}`;
  }

  function stampSession(session) {
    const copy = Object.assign({}, session);
    copy.integrityWatermark = generateSessionWatermark(copy);
    return copy;
  }

  function verifySessionIntegrity(session, locale = 'en') {
    if (!session || !session.integrityWatermark) {
      return {
        valid: false,
        error: getLocalizedText(locale, 'watermark_missing'),
        expected: null,
        actual: null
      };
    }

    const expectedWatermark = generateSessionWatermark(session);
    const actualWatermark = session.integrityWatermark;

    if (expectedWatermark !== actualWatermark) {
      return {
        valid: false,
        error: getLocalizedText(locale, 'watermark_tampered'),
        expected: expectedWatermark,
        actual: actualWatermark
      };
    }

    return {
      valid: true,
      message: getLocalizedText(locale, 'watermark_valid'),
      watermark: actualWatermark
    };
  }

  function generateCertificateBadge(totalHours, sessionsCount, streakDays) {
    const hours = toWesternDigits(totalHours, 1);
    const sessions = toWesternDigits(sessionsCount);
    const streak = toWesternDigits(streakDays);

    const canonical = `CERT|${hours}|${sessions}|${streak}`;
    const checksum = calculateChecksum(canonical);
    const badgeId = `DF-CERT-${checksum}`;

    return {
      badgeId,
      totalHours: hours,
      sessionsCount: sessions,
      streakDays: streak,
      checksum,
      timestamp: Date.now()
    };
  }

  return {
    WATERMARK_PREFIX,
    calculateChecksum,
    createCanonicalString,
    generateSessionWatermark,
    stampSession,
    verifySessionIntegrity,
    generateCertificateBadge,
    sanitizeLocale,
    toWesternDigits,
    getLocalizedText
  };
}));
