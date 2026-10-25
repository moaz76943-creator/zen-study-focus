/**
 * DEEP FOCUS — locale fallback, direction and safe language-state boundary.
 * Catalog synced with global_i18n_registry.js (100 entries excluding Hebrew).
 * This guard never traverses text nodes or rewrites content entered by a user.
 */
(function (global) {
  'use strict';
  const SUPPORTED_LOCALES = Object.freeze(["ar","en","es","fr","de","it","pt","ru","zh","ja","ko","tr","fa","ur","hi","id","ms","bn","pl","sv","nl","el","cs","da","fi","no","hu","ro","uk","vi","th","sw","af","am","az","bg","ca","hr","et","fil","ka","gu","is","kn","kk","km","lo","lv","lt","mk","ml","mr","mn","my","ne","pa","si","sk","sl","ta","te","uz","zu","eu","gl","hy","sq","bs","sr","be","cy","ga","gd","lb","mt","so","yo","ig","ha","xh","st","tn","sn","rw","mg","kmr","ckb","ps","sd","ug","tg","ky","tk","tt","ba","cv","ceb","jv","su","eo"]);
  const SUPPORTED = new Set(SUPPORTED_LOCALES);
  const RTL_LOCALES = Object.freeze(['ar', 'fa', 'ur', 'ckb', 'ps', 'sd', 'ug']);
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
