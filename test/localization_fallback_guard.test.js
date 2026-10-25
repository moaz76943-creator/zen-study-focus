const assert = require('assert');
const {
    resolveTranslation,
    setSystemLanguage,
    isLocaleAllowed,
    ACTIVE_20_LOCALES
} = require('../android/app/src/main/assets/web/js/localization_fallback_guard.js');

console.log("--- Running 🎯 Mission #018: Localization Guard Tests ---");

// Mock Translations Catalog
const mockCatalog = {
    en: {
        TIMER_TITLE: "Focus Timer",
        START_BTN: "Start Session",
        NOTES_EMPTY: "No notes yet"
    },
    ar: {
        TIMER_TITLE: "مؤقت التركيز",
        START_BTN: "بدء الجلسة"
        // NOTES_EMPTY is intentionally missing in 'ar' to test Tier 2 fallback!
    }
};

// Test 1: Tier 1 Target Match
const resAr = resolveTranslation("TIMER_TITLE", "ar", mockCatalog);
assert.strictEqual(resAr, "مؤقت التركيز");
console.log("✔ Test 1: Tier 1 translation in Arabic resolved accurately.");

// Test 2: Tier 2 Fallback to English when key is missing in active locale
const resFallback = resolveTranslation("NOTES_EMPTY", "ar", mockCatalog);
assert.strictEqual(resFallback, "No notes yet", "Must fall back gracefully to English without error.");
console.log("✔ Test 2: Tier 2 fallback to English verified for missing key.");

// Test 3: Tier 3 Humanized Fallback for completely missing key (No raw screaming caps)
const resMissingAll = resolveTranslation("CUSTOM_ANALYTICS_WIDGET_LABEL", "ar", mockCatalog);
assert.strictEqual(resMissingAll, "Custom Analytics Widget Label");
console.log("✔ Test 3: Tier 3 humanized fallback prevents raw screaming caps in UI.");

// Test 4: Roster & Policy Check (20 active locales allowed, he/iw blocked)
assert.strictEqual(isLocaleAllowed("ar"), true);
assert.strictEqual(isLocaleAllowed("fa"), true);
assert.strictEqual(isLocaleAllowed("ur"), true);
assert.strictEqual(isLocaleAllowed("he"), false, "he must be excluded per Directive Section 19.");
assert.strictEqual(isLocaleAllowed("iw"), false, "iw must be excluded per Directive Section 19.");
assert.strictEqual(ACTIVE_20_LOCALES.length, 20);
console.log("✔ Test 4: 20-locale catalog verified and policy exclusions honored.");

// Test 5: Switch Language preserves config and identifies RTL
const cfg = { theme: "white_premium", locale: "en" };
const mockStorage = { setItem: () => {} };
const switchRes = setSystemLanguage("ar", cfg, mockStorage);
assert.strictEqual(switchRes.success, true);
assert.strictEqual(switchRes.locale, "ar");
assert.strictEqual(switchRes.isRtl, true);
console.log("✔ Test 5: Language switched safely with accurate RTL detection.");

console.log("--- All Mission #018 Localization Tests PASSED (GREEN) ---");
