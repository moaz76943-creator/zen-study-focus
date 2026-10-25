/**
 * DEEP FOCUS — Local LAN & WebRTC Peer Sync Engine
 * Cycle: CYCLE-132 (Mission #132)
 * Architecture: v21 Data Fortress Safe, Zero-Cloud P2P Delta Sync & Pairing Envelope
 * Strict Rules:
 *  - 100-Locale Support with Strict English-Only Fallback
 *  - Absolute Hebrew Exclusion (he, iw -> en)
 *  - Strict Western Digits 0123456789
 *  - Zero Third-Party Cloud Servers (100% Offline Local Network Sync)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.WebRtcLanSyncEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PROTOCOL_VERSION = 'DF-SYNC-P2P-v21';

  const I18N_STRINGS = {
    en: {
      sync_success: "Local P2P synchronization completed successfully ({count} new sessions merged).",
      sync_err_protocol_mismatch: "Protocol mismatch: Peer is running an incompatible sync version.",
      sync_err_tampered: "Authentication failed: Peer payload signature is invalid.",
      pairing_offer_ready: "Pairing token generated. Ready for QR code or LAN transmission."
    },
    ar: {
      sync_success: "اكتملت المزامنة المباشرة عبر الشبكة المحلية بنجاح (تم دمج {count} جلسة جديدة).",
      sync_err_protocol_mismatch: "عدم تطابق في بروتوكول المزامنة: الجهاز الآخر يعمل بنسخة غير متوافقة.",
      sync_err_tampered: "فشلت المصادقة: توقيع البيانات المنقولة غير صالح أو تم التلاعب به.",
      pairing_offer_ready: "تم إنشاء رمز الاقتران. جاهز للمسح عبر رمز الاستجابة السريعة أو الشبكة المحلية."
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

  function calculateAdlerHash(str) {
    let a = 1;
    let b = 0;
    const MOD = 65521;
    for (let i = 0; i < str.length; i++) {
      a = (a + str.charCodeAt(i)) % MOD;
      b = (b + a) % MOD;
    }
    return (((b << 16) | a) >>> 0).toString(16).padStart(8, '0');
  }

  function createSyncEnvelope(deviceId, sessionsList = [], sharedSecret = 'zen_p2p_secret') {
    const dev = String(deviceId || 'device_local');
    const list = Array.isArray(sessionsList) ? sessionsList : [];
    const timestamp = Date.now();
    const payloadSerialized = JSON.stringify(list);

    const canonical = `${PROTOCOL_VERSION}|${dev}|${timestamp}|${payloadSerialized}|${sharedSecret}`;
    const signature = calculateAdlerHash(canonical);

    return {
      protocol: PROTOCOL_VERSION,
      deviceId: dev,
      timestamp,
      timestampFormatted: new Date(timestamp).toISOString(),
      sessionsCount: list.length,
      sessionsCountFormatted: toWesternDigits(list.length),
      payload: list,
      signature
    };
  }

  function mergePeerEnvelope(localSessions = [], incomingEnvelope, sharedSecret = 'zen_p2p_secret', locale = 'en') {
    if (!incomingEnvelope || typeof incomingEnvelope !== 'object') {
      return {
        success: false,
        error: getLocalizedText(locale, 'sync_err_tampered'),
        mergedSessions: localSessions,
        addedCount: 0
      };
    }

    if (incomingEnvelope.protocol !== PROTOCOL_VERSION) {
      return {
        success: false,
        error: getLocalizedText(locale, 'sync_err_protocol_mismatch'),
        mergedSessions: localSessions,
        addedCount: 0
      };
    }

    const payloadSerialized = JSON.stringify(incomingEnvelope.payload || []);
    const canonical = `${PROTOCOL_VERSION}|${incomingEnvelope.deviceId}|${incomingEnvelope.timestamp}|${payloadSerialized}|${sharedSecret}`;
    const computedSignature = calculateAdlerHash(canonical);

    if (computedSignature !== incomingEnvelope.signature) {
      return {
        success: false,
        error: getLocalizedText(locale, 'sync_err_tampered'),
        mergedSessions: localSessions,
        addedCount: 0
      };
    }

    const local = Array.isArray(localSessions) ? localSessions.slice() : [];
    const incoming = Array.isArray(incomingEnvelope.payload) ? incomingEnvelope.payload : [];

    const sessionMap = new Map();
    local.forEach(s => {
      if (s && s.id) sessionMap.set(s.id, s);
    });

    let addedCount = 0;
    incoming.forEach(peerSession => {
      if (!peerSession || !peerSession.id) return;
      if (!sessionMap.has(peerSession.id)) {
        sessionMap.set(peerSession.id, peerSession);
        addedCount++;
      } else {
        const existing = sessionMap.get(peerSession.id);
        const existingDur = existing.durationSeconds || 0;
        const peerDur = peerSession.durationSeconds || 0;
        if (peerDur > existingDur) {
          sessionMap.set(peerSession.id, peerSession);
        }
      }
    });

    const mergedList = Array.from(sessionMap.values());
    const t = (k) => getLocalizedText(locale, k);

    return {
      success: true,
      message: t('sync_success').replace('{count}', toWesternDigits(addedCount)),
      mergedSessions: mergedList,
      totalCount: mergedList.length,
      totalCountFormatted: toWesternDigits(mergedList.length),
      addedCount,
      addedCountFormatted: toWesternDigits(addedCount)
    };
  }

  return {
    PROTOCOL_VERSION,
    calculateAdlerHash,
    createSyncEnvelope,
    mergePeerEnvelope,
    sanitizeLocale,
    toWesternDigits,
    getLocalizedText
  };
}));
