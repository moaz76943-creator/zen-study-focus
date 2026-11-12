/**
 * DEEP FOCUS — Sovereign Modular Data Vault (v563.0.0)
 * 100% Offline, Zero PII, Local AES-GCM Encryption & Quota Immunity.
 * Encapsulates:
 *   - SovereignDeduplicator (Levenshtein distance & similarity detection)
 *   - SovereignStorageVacuum (QuotaExceededError recovery & stale-key cleanup)
 *   - SovereignDeckExchange (Web Crypto PBKDF2 + AES-GCM 256-bit offline vault)
 */
(function (global) {
  'use strict';

  // 1. Levenshtein Deduplicator
  var SovereignDeduplicator = {
    distance: function (a, b) {
      var s1 = String(a || '').trim().toLowerCase();
      var s2 = String(b || '').trim().toLowerCase();
      if (s1 === s2) return 0;
      if (!s1.length) return s2.length;
      if (!s2.length) return s1.length;

      var prev = new Array(s2.length + 1);
      var curr = new Array(s2.length + 1);
      for (var j = 0; j <= s2.length; j++) prev[j] = j;

      for (var i = 1; i <= s1.length; i++) {
        curr[0] = i;
        for (var k = 1; k <= s2.length; k++) {
          var cost = s1.charAt(i - 1) === s2.charAt(k - 1) ? 0 : 1;
          curr[k] = Math.min(
            curr[k - 1] + 1,
            prev[k] + 1,
            prev[k - 1] + cost
          );
        }
        var tmp = prev;
        prev = curr;
        curr = tmp;
      }
      return prev[s2.length];
    },

    similarity: function (a, b) {
      var s1 = String(a || '').trim();
      var s2 = String(b || '').trim();
      var maxLen = Math.max(s1.length, s2.length);
      if (maxLen === 0) return 1;
      return 1 - (this.distance(s1, s2) / maxLen);
    },

    findDuplicates: function (items, threshold) {
      var minSim = typeof threshold === 'number' ? threshold : 0.82;
      var matches = [];
      if (!Array.isArray(items)) return matches;
      for (var i = 0; i < items.length; i++) {
        for (var j = i + 1; j < items.length; j++) {
          var t1 = typeof items[i] === 'string' ? items[i] : (items[i].front || items[i].title || '');
          var t2 = typeof items[j] === 'string' ? items[j] : (items[j].front || items[j].title || '');
          var sim = this.similarity(t1, t2);
          if (sim >= minSim) {
            matches.push({ indexA: i, indexB: j, similarity: Number(sim.toFixed(3)) });
          }
        }
      }
      return matches;
    }
  };

  // 2. Storage Vacuum & QuotaExceededError Immunity
  var memFallback = Object.create(null);
  var SovereignStorageVacuum = {
    runVacuum: function (maxAgeMs) {
      var cutoff = typeof maxAgeMs === 'number' ? maxAgeMs : 604800000; // 7 days
      if (typeof localStorage === 'undefined') return { removed: 0 };
      var removed = 0;
      var keys = [];
      try {
        for (var i = 0; i < localStorage.length; i++) {
          keys.push(localStorage.key(i));
        }
        var now = Date.now();
        for (var j = 0; j < keys.length; j++) {
          var key = keys[j];
          if (!key || key.indexOf('deepfocus_tmp_') !== 0) continue;
          try {
            var parsed = JSON.parse(localStorage.getItem(key) || '{}');
            if (!parsed.savedAt || (now - parsed.savedAt) > cutoff) {
              localStorage.removeItem(key);
              removed++;
            }
          } catch (e) {
            localStorage.removeItem(key);
            removed++;
          }
        }
      } catch (err) {}
      return { removed: removed };
    },

    safeSetItem: function (key, value) {
      var strVal = typeof value === 'string' ? value : JSON.stringify(value);
      if (typeof localStorage === 'undefined') {
        memFallback[key] = strVal;
        return true;
      }
      try {
        localStorage.setItem(key, strVal);
        return true;
      } catch (e) {
        // Attempt vacuum on QuotaExceededError and retry once
        this.runVacuum(86400000);
        try {
          localStorage.setItem(key, strVal);
          return true;
        } catch (retryErr) {
          memFallback[key] = strVal;
          return false;
        }
      }
    },

    safeGetItem: function (key) {
      if (typeof localStorage === 'undefined') return memFallback[key] || null;
      try {
        return localStorage.getItem(key);
      } catch (e) {
        return memFallback[key] || null;
      }
    }
  };

  // 3. Offline AES-GCM 256-bit Deck Exchange Vault
  function toBase64(bytes) {
    if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function fromBase64(b64) {
    if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(b64, 'base64'));
    var bin = atob(b64);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  var SovereignDeckExchange = {
    _deriveKey: async function (passphrase, salt, usages) {
      var subtle = global.crypto && global.crypto.subtle;
      if (!subtle) throw new Error('Web Crypto API unavailable');
      var enc = new TextEncoder();
      var baseKey = await subtle.importKey(
        'raw',
        enc.encode(String(passphrase || 'deepfocus-local')),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );
      return subtle.deriveKey(
        { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        usages
      );
    },

    encryptDeck: async function (deckObj, passphrase) {
      var cryptoObj = global.crypto;
      if (!cryptoObj || !cryptoObj.subtle) throw new Error('Web Crypto API unavailable');
      var salt = cryptoObj.getRandomValues(new Uint8Array(16));
      var iv = cryptoObj.getRandomValues(new Uint8Array(12));
      var key = await this._deriveKey(passphrase, salt, ['encrypt']);
      var plainBytes = new TextEncoder().encode(JSON.stringify(deckObj));
      var cipherBuf = await cryptoObj.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, plainBytes);
      return JSON.stringify({
        v: 1,
        alg: 'AES-GCM-256',
        salt: toBase64(salt),
        iv: toBase64(iv),
        data: toBase64(new Uint8Array(cipherBuf))
      });
    },

    decryptDeck: async function (packedJson, passphrase) {
      var cryptoObj = global.crypto;
      if (!cryptoObj || !cryptoObj.subtle) throw new Error('Web Crypto API unavailable');
      var pkg = typeof packedJson === 'string' ? JSON.parse(packedJson) : packedJson;
      var salt = fromBase64(pkg.salt);
      var iv = fromBase64(pkg.iv);
      var cipher = fromBase64(pkg.data);
      var key = await this._deriveKey(passphrase, salt, ['decrypt']);
      var plainBuf = await cryptoObj.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, cipher);
      return JSON.parse(new TextDecoder().decode(plainBuf));
    }
  };

  var DataVault = {
    version: '563.0.0',
    deduplicator: SovereignDeduplicator,
    vacuum: SovereignStorageVacuum,
    exchange: SovereignDeckExchange
  };

  global.SovereignDataVault = DataVault;
  if (!global.SovereignDeduplicator) global.SovereignDeduplicator = SovereignDeduplicator;
  if (!global.SovereignStorageVacuum) global.SovereignStorageVacuum = SovereignStorageVacuum;
  if (!global.SovereignDeckExchange) global.SovereignDeckExchange = SovereignDeckExchange;

  if (global.SovereignCoreRegistry && typeof global.SovereignCoreRegistry.register === 'function') {
    global.SovereignCoreRegistry.register('sovereign_data_vault', DataVault);
  }
})(typeof window !== 'undefined' ? window : globalThis);
