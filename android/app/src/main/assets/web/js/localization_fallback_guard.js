/**
 * DEEP FOCUS — locale fallback, direction and safe language-state boundary.
 * Catalog aligned with the authoritative 99-entry app.js LANG_CATALOG (not legacy registry).
 * This guard never traverses text nodes or rewrites content entered by a user.
 */
(function (global) {
  'use strict';
  const SUPPORTED_LOCALES = Object.freeze(["ar","en","es","zh","hi","fr","de","ru","pt","ja","id","tr","ko","vi","it","bn","ur","fa","pl","nl","th","sv","el","cs","ro","hu","da","fi","no","sk","uk","bg","hr","sr","sl","lt","lv","et","sw","fil","ta","te","mr","gu","kn","ml","pa","am","az","uz","kk","ka","hy","ne","si","my","km","lo","mn","af","sq","eu","ca","gl","is","ga","mk","mt","cy","be","bs","ky","tg","tk","ps","ku","so","ha","yo","ig","zu","xh","sn","st","tn","rw","mg","ny","eo","la","gd","yi","co","fy","haw","hmn","sm","su","jw"]);
  const SUPPORTED = new Set(SUPPORTED_LOCALES);
  const RTL_LOCALES = Object.freeze(["ar","ur","fa","ps","yi"]);
  const RTL = new Set(RTL_LOCALES);
  const EXCLUDED_LOCALES = Object.freeze(['he', 'iw']);
  const EXCLUDED = new Set(EXCLUDED_LOCALES);

  function normalizeLocale(locale) {
    if (typeof locale !== 'string') return '';
    return locale.trim().toLowerCase().split(/[-_]/, 1)[0];
  }

  function isLocaleAllowed(locale) {
    const code = normalizeLocale(locale);
    return !!code && !EXCLUDED.has(code) && SUPPORTED.has(code);
  }

  function isRtlLocale(locale) {
    const code = normalizeLocale(locale);
    return isLocaleAllowed(code) && RTL.has(code);
  }

  function resolveTranslation(key, locale, dictionaries) {
    if (!key || typeof key !== 'string') return '';
    const catalog = dictionaries && typeof dictionaries === 'object' ? dictionaries : {};
    const code = isLocaleAllowed(locale) ? normalizeLocale(locale) : 'en';
    const own = catalog[code] || {};
    const english = catalog.en || {};
    if (typeof own[key] === 'string' && own[key] !== '') return own[key];
    if (typeof english[key] === 'string' && english[key] !== '') return english[key];
    return key.toLowerCase().split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

  // Returns proposed config but never mutates original config, notes or tasks.
  // The production app is responsible for its own v21 atomic save protocol.
  function setSystemLanguage(newLocale, currentConfig, storageBackend) {
    const cfg = currentConfig && typeof currentConfig === 'object' ? currentConfig : {};
    const code = normalizeLocale(newLocale);
    if (!isLocaleAllowed(code)) {
      return { success: false, reason: 'LOCALE_NOT_IN_CATALOG_OR_RESTRICTED',
        locale: cfg.lang || cfg.locale || 'en' };
    }
    const updatedConfig = Object.assign({}, cfg);
    // app.js stores 'lang'; retain legacy 'locale' only when already used.
    if (Object.prototype.hasOwnProperty.call(cfg, 'lang') || !Object.prototype.hasOwnProperty.call(cfg, 'locale')) {
      updatedConfig.lang = code;
    }
    if (Object.prototype.hasOwnProperty.call(cfg, 'locale')) updatedConfig.locale = code;
    // Never write raw JSON to the v21 fortress key: the app uses a durable envelope.
    // Lane 03 must inject its existing acknowledged/atomic saveFortressData adapter.
    let persisted = false;
    if (storageBackend) {
      if (typeof storageBackend.saveFortressData !== 'function') {
        return { success: false, reason: 'ATOMIC_STORAGE_REQUIRED',
          locale: cfg.lang || cfg.locale || 'en' };
      }
      try {
        if (storageBackend.saveFortressData('zen_fortress_cfg_v21', updatedConfig) !== true) {
          return { success: false, reason: 'LANGUAGE_SAVE_FAILED',
            locale: cfg.lang || cfg.locale || 'en' };
        }
        persisted = true;
      } catch (_) {
        return { success: false, reason: 'LANGUAGE_SAVE_FAILED',
          locale: cfg.lang || cfg.locale || 'en' };
      }
    }
    return { success: true, status: persisted ? 'LOCALE_SAVED' : 'LOCALE_PREVIEW',
      locale: code, isRtl: isRtlLocale(code), config: updatedConfig, persisted };
  }

  const api = { resolveTranslation, setSystemLanguage, isLocaleAllowed,
    isRtlLocale, normalizeLocale, SUPPORTED_LOCALES, RTL_LOCALES, EXCLUDED_LOCALES,
    ACTIVE_20_LOCALES: Object.freeze(['ar','en','es','fr','de','it','pt','ru','zh','ja','ko','hi','fa','ur','tr','id','vi','pl','nl','sv']) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.ZenLocalization = api;
})(typeof window !== 'undefined' ? window : globalThis);
