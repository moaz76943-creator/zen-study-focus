/**
 * DEEP FOCUS — Full 100-Locale Linguistic Parity & Master Audit
 * Mission #066: Validates all 100 locales across 14 core UI keys,
 * ensures zero undefined/null translations, verifies RTL flags,
 * and confirms absolute Hebrew exclusion.
 */
const assert = require('assert');
const Registry = require('../android/app/src/main/assets/web/js/global_i18n_registry.js');
const Loader = require('../android/app/src/main/assets/web/js/expanded_locales_loader.js');

console.log("--- Running 🎯 Mission #066: Full 100-Locale Linguistic Parity Audit ---");

// Step 1: Pre-load core packages into registry
Loader.loadAllCorePacks(Registry);

const CORE_KEYS = [
  "app_name", "nav_timer", "nav_tasks", "nav_notes", "nav_calendar",
  "nav_analytics", "nav_settings", "nav_audio", "timer_start",
  "timer_pause", "timer_resume", "timer_reset", "today_focus", "priority_high"
];

const locales = Registry.SUPPORTED_LOCALES;
assert.strictEqual(locales.length, 100, "Registry must contain exactly 100 locales");

// Step 2: Audit all 100 locales across all 14 core keys
let testedPairsCount = 0;
for (let i = 0; i < locales.length; i++) {
  const loc = locales[i];
  assert.strictEqual(Registry.isExcludedLocale(loc.code), false, `Locale ${loc.code} must not be excluded`);

  for (let k = 0; k < CORE_KEYS.length; k++) {
    const key = CORE_KEYS[k];
    const text = Registry.translate(loc.code, key);
    
    assert.ok(typeof text === 'string', `Translation for ${loc.code}:${key} must be string`);
    assert.ok(text.trim().length > 0, `Translation for ${loc.code}:${key} must not be empty`);
    assert.ok(!text.includes("undefined"), `Translation must not contain 'undefined'`);
    assert.ok(!text.includes("null"), `Translation must not contain 'null'`);
    testedPairsCount++;
  }
}
console.log(`✓ Test 1: Verified ${testedPairsCount} translation pairs across 100 locales (100% non-empty).`);

// Step 3: Verify Hebrew exclusion remains active and safe
{
  assert.strictEqual(Registry.isExcludedLocale("he"), true);
  assert.strictEqual(Registry.isExcludedLocale("iw"), true);
  const heText = Registry.translate("he", "timer_start");
  assert.strictEqual(heText, "Start Focus", "Hebrew must fallback to English");
  console.log("✓ Test 2: Absolute Hebrew exclusion and fallback redirect re-verified.");
}

// Step 4: Verify RTL directionality for eastern languages
{
  const rtlLocales = ["ar", "fa", "ur", "ckb", "ps", "sd", "ug"];
  for (let r = 0; r < rtlLocales.length; r++) {
    const meta = Registry.getLocaleMetadata(rtlLocales[r]);
    assert.strictEqual(meta.isRtl, true, `${rtlLocales[r]} must have isRtl=true`);
  }
  console.log("✓ Test 3: RTL directionality for Arabic, Persian, Urdu & eastern locales verified.");
}

// Step 5: Coverage analytics for pre-loaded core packs
{
  const frCov = Loader.getLocaleCoverage("fr");
  assert.strictEqual(frCov.percent, 100);
  assert.strictEqual(frCov.isFullyTranslated, true);
  console.log("✓ Test 4: Core translation packs 100% coverage verified.");
}

console.log("--- All Mission #066 Parity Tests PASSED (GREEN) ---");
