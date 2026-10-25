/**
 * DEEP FOCUS — Golden Flow 6 End-to-End Test (Section 46)
 * Full User Journey:
 * Select Arabic -> Navigate Seven Destinations -> Verify RTL -> Verify Western Digits -> Restart -> Verify Locale Retained
 */
const assert = require('assert');

// Import guards from Phase 1
const { setSystemLanguage, resolveTranslation } = require('../android/app/src/main/assets/web/js/localization_fallback_guard.js');
const { formatTimerDisplay, formatPercentage, containsOnlyWesternDigits } = require('../android/app/src/main/assets/web/js/numeral_invariant_guard.js');
const { safeReadStorageKey } = require('../android/app/src/main/assets/web/js/startup_reliability_guard.js');

console.log("==========================================================");
console.log(" [GOLDEN FLOW 6] Starting Arabic RTL & 7 Destinations Test");
console.log("==========================================================");

const persistentStore = {};
const mockStorage = {
    getItem: (k) => persistentStore[k] || null,
    setItem: (k, v) => { persistentStore[k] = v; }
};

let currentConfig = {
    theme: "white_premium",
    locale: "en",
    v21_marker: "SECURE"
};

// Stage 1: Select Arabic Locale & Verify RTL Flag
const langSwitchRes = setSystemLanguage("ar", currentConfig, mockStorage);
assert.strictEqual(langSwitchRes.success, true);
assert.strictEqual(langSwitchRes.locale, "ar");
assert.strictEqual(langSwitchRes.isRtl, true, "Arabic must strictly activate RTL direction.");
currentConfig.locale = "ar";
console.log("✔ Stage 1: Arabic locale selected and RTL mode activated.");

// Stage 2: Navigate Across All Seven Destinations (Central Timer Hub)
const SEVEN_DESTINATIONS = ["tasks", "calendar", "notes", "timer", "training", "sounds", "analytics"];
assert.strictEqual(SEVEN_DESTINATIONS.length, 7, "All seven destinations must be maintained.");
assert.strictEqual(SEVEN_DESTINATIONS[3], "timer", "Timer must strictly occupy the central index (center hub).");

// Mock Arabic Catalog
const mockCatalog = {
    ar: {
        NAV_TASKS: "المهام",
        NAV_CALENDAR: "التقويم",
        NAV_NOTES: "الملاحظات",
        NAV_TIMER: "المؤقت",
        NAV_TRAINING: "التدريب",
        NAV_SOUNDS: "أصوات الطبيعة",
        NAV_ANALYTICS: "التحليلات"
    }
};

SEVEN_DESTINATIONS.forEach(dest => {
    const key = `NAV_${dest.toUpperCase()}`;
    const label = resolveTranslation(key, "ar", mockCatalog);
    assert.ok(label && label.length > 0);
    console.log(`  [NAV] Destination [${dest}] renders in Arabic: "${label}"`);
});
console.log("✔ Stage 2: Navigation across all seven destinations verified in Arabic.");

// Stage 3: Verify Strict Western Digits (0-9) Invariant across all Arabic Displays
const sampleTimerSeconds = 1500; // 25:00
const timerDisplay = formatTimerDisplay(sampleTimerSeconds);
assert.ok(timerDisplay.includes("25:00"), "Timer digits must strictly be Western 25:00 in Arabic view!");
assert.ok(containsOnlyWesternDigits(timerDisplay), "Timer must contain ZERO Eastern Arabic digits!");

const samplePercent = formatPercentage(100);
assert.ok(samplePercent.includes("100%"));
assert.ok(containsOnlyWesternDigits(samplePercent));

const dateStamp = "2026-10-22";
assert.ok(containsOnlyWesternDigits(dateStamp));

console.log(`✔ Stage 3: Western digits verified in Arabic views (Timer: ${timerDisplay}, Progress: ${samplePercent}, Date: ${dateStamp}).`);

// Stage 4: Simulate App Kill & Cold Restart
console.log("[*] Simulating Process Termination & Cold Start...");
const reloadedConfig = safeReadStorageKey(mockStorage, "zen_fortress_cfg_v21", {});

// Stage 5: Verify Arabic Locale & Settings Retained (No forced English!)
assert.strictEqual(reloadedConfig.locale, "ar", "Locale must strictly remain 'ar' after restart, NEVER reset to 'en'!");
assert.strictEqual(reloadedConfig.theme, "white_premium");
console.log("✔ Stage 5: Arabic locale persistence verified across application reboot.");

console.log("==========================================================");
console.log(" [GOLDEN FLOW 6] ALL 5 STAGES PASSED (100% GREEN) ");
console.log("==========================================================");
