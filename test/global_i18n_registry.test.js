const assert = require('assert');
const i18n = require('../android/app/src/main/assets/web/js/global_i18n_registry.js');

console.log("--- Running 🎯 Mission #064: Global 100-Locale i18n Tests ---");

// Test 1: Registry contains 100 official locales and excludes Hebrew
{
  assert.strictEqual(i18n.SUPPORTED_LOCALES.length, 100, "Must contain exactly 100 Google Play locales");
  
  const codes = i18n.SUPPORTED_LOCALES.map(l => l.code);
  assert.strictEqual(codes.includes("he"), false, "Hebrew ('he') must be strictly excluded");
  assert.strictEqual(codes.includes("iw"), false, "Hebrew legacy ('iw') must be strictly excluded");
  assert.strictEqual(codes.includes("ar"), true, "Arabic must be present");
  assert.strictEqual(codes.includes("en"), true, "English must be present");
  console.log("✓ Test 1: 100 Locales registry & strict Hebrew exclusion verified.");
}

// Test 2: Exclusion Guard actively blocks Hebrew requests and redirects safely
{
  assert.strictEqual(i18n.isExcludedLocale("he"), true);
  assert.strictEqual(i18n.isExcludedLocale("iw"), true);
  assert.strictEqual(i18n.isExcludedLocale("he-IL"), true);
  assert.strictEqual(i18n.isExcludedLocale("en-US"), false);
  assert.strictEqual(i18n.isExcludedLocale("ar-SA"), false);

  const blockedRegister = i18n.registerDictionary("he", { timer_start: "test" });
  assert.strictEqual(blockedRegister, false, "Registering Hebrew dictionary must be blocked");

  const fallbackText = i18n.translate("he", "timer_start");
  assert.strictEqual(fallbackText, "Start Focus", "Hebrew request must redirect safely to English fallback");
  console.log("✓ Test 2: Active Hebrew exclusion gate & safe fallback verified.");
}

// Test 3: Per-key cascading fallback (Missing key in new language falls back to English)
{
  // Register Spanish with only 1 key translated
  i18n.registerDictionary("es", {
    timer_start: "Comenzar Enfoque"
  });

  // Translated key returns Spanish
  assert.strictEqual(i18n.translate("es", "timer_start"), "Comenzar Enfoque");

  // Missing key (nav_tasks) automatically falls back to English gracefully
  assert.strictEqual(i18n.translate("es", "nav_tasks"), "Tasks");
  console.log("✓ Test 3: Per-key cascading fallback (zero missing keys) verified.");
}

// Test 4: RTL directionality detection across eastern locales
{
  const arMeta = i18n.getLocaleMetadata("ar");
  assert.strictEqual(arMeta.isRtl, true);

  const faMeta = i18n.getLocaleMetadata("fa");
  assert.strictEqual(faMeta.isRtl, true);

  const enMeta = i18n.getLocaleMetadata("en");
  assert.strictEqual(enMeta.isRtl, false);
  console.log("✓ Test 4: RTL and LTR directionality metadata verified.");
}

// Test 5: Dynamic modular dictionary extensibility
{
  const ok = i18n.registerDictionary("tr", {
    app_name: "Derin Odak",
    timer_start: "Odaklanmaya Başla"
  });
  assert.strictEqual(ok, true);
  assert.strictEqual(i18n.translate("tr", "app_name"), "Derin Odak");
  assert.strictEqual(i18n.translate("tr", "timer_start"), "Odaklanmaya Başla");
  assert.strictEqual(i18n.translate("tr", "nav_settings"), "Settings", "Unset Turkish keys fallback to English");
  console.log("✓ Test 5: Dynamic modular dictionary extensibility verified.");
}

console.log("--- All Mission #064 Tests PASSED (GREEN) ---");
