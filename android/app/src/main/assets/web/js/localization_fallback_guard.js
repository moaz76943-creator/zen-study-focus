/**
 * DEEP FOCUS — 20-Locale Parity & Fallback Safety Guard v21
 * Enforces:
 * 1. 3-Tier Fallback: Target Locale -> Base 'en' -> Humanized String (No crashes).
 * 2. 20-Locale Roster: Strictly active 20 languages (Excludes he/iw per policy).
 * 3. Zero User Text Mutation: User notes/tasks remain untouched across language switches.
 */
(function(global) {

    // Verified 20 Supported Locales
    const ACTIVE_20_LOCALES = [
        "ar", "en", "es", "fr", "de", "it", "pt", "ru", "zh", "ja",
        "ko", "hi", "fa", "ur", "tr", "id", "vi", "pl", "nl", "sv"
    ];

    const EXCLUDED_LOCALES = ["he", "iw"];

    function isLocaleAllowed(localeCode) {
        if (!localeCode || typeof localeCode !== 'string') return false;
        const code = localeCode.toLowerCase().trim();
        if (EXCLUDED_LOCALES.includes(code)) return false;
        return ACTIVE_20_LOCALES.includes(code);
    }

    // Safe Translation Resolver with Zero Raw Key Leakage
    function resolveTranslation(key, currentLocale, translationsCatalog = {}) {
        if (!key || typeof key !== 'string') return "";

        const lang = (currentLocale || "en").toLowerCase();
        const baseCatalog = translationsCatalog["en"] || {};
        const targetCatalog = translationsCatalog[lang] || {};

        // Tier 1: Target Locale Match
        if (targetCatalog[key] !== undefined && targetCatalog[key] !== "") {
            return targetCatalog[key];
        }

        // Tier 2: Base English Fallback
        if (baseCatalog[key] !== undefined && baseCatalog[key] !== "") {
            return baseCatalog[key];
        }

        // Tier 3: Humanized Formatter (Converts 'TIMER_START_BUTTON' -> 'Timer Start Button')
        return key
            .toLowerCase()
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    // Switch Language without mutating user data
    function setSystemLanguage(newLocale, currentConfig, storageBackend) {
        if (!isLocaleAllowed(newLocale)) {
            return {
                success: false,
                reason: "LOCALE_NOT_IN_ACTIVE_20_CATALOG_OR_RESTRICTED",
                locale: currentConfig.locale || "en"
            };
        }

        const updatedConfig = {
            ...currentConfig,
            locale: newLocale,
            updatedAt: Date.now()
        };

        if (storageBackend && typeof storageBackend.setItem === 'function') {
            try {
                storageBackend.setItem("zen_fortress_cfg_v21", JSON.stringify(updatedConfig));
            } catch (e) {}
        }

        return {
            success: true,
            status: "LOCALE_UPDATED",
            locale: newLocale,
            isRtl: ["ar", "fa", "ur"].includes(newLocale)
        };
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            resolveTranslation,
            setSystemLanguage,
            isLocaleAllowed,
            ACTIVE_20_LOCALES,
            EXCLUDED_LOCALES
        };
    } else {
        global.ZenLocalization = {
            resolveTranslation,
            setSystemLanguage,
            isLocaleAllowed,
            ACTIVE_20_LOCALES,
            EXCLUDED_LOCALES
        };
    }
})(typeof window !== 'undefined' ? window : globalThis);
