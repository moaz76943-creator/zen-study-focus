const assert = require('assert');
const Registry = require('../android/app/src/main/assets/web/js/global_i18n_registry.js');
const Loader = require('../android/app/src/main/assets/web/js/expanded_locales_loader.js');

console.log("--- Running 🎯 Mission #065: Expanded Locales Loader Tests ---");

// Test 1: Load all core packs into registry
{
  const res = Loader.loadAllCorePacks(Registry);
  assert.strictEqual(res.status, "PACKS_LOADED_SUCCESS");
  assert.ok(res.loadedCount >= 8, "Must load at least 8 core language families");
  
  // Verify Spanish translation
  assert.strictEqual(Registry.translate("es", "timer_start"), "Comenzar Enfoque");
  // Verify German translation
  assert.strictEqual(Registry.translate("de", "app_name"), "Tiefer Fokus");
  // Verify Russian translation
  assert.strictEqual(Registry.translate("ru", "nav_tasks"), "Задачи");
  console.log("✓ Test 1: Core language family packs loading & translation retrieval verified.");
}

// Test 2: Persian and Urdu RTL dictionary integrity
{
  assert.strictEqual(Registry.translate("fa", "timer_start"), "شروع تمرکز");
  assert.strictEqual(Registry.translate("ur", "nav_timer"), "ٹائمر");
  console.log("✓ Test 2: Persian and Urdu RTL translation parity verified.");
}

// Test 3: Language coverage analytics calculation
{
  const esCoverage = Loader.getLocaleCoverage("es");
  assert.strictEqual(esCoverage.percent, 100);
  assert.strictEqual(esCoverage.isFullyTranslated, true);
  assert.strictEqual(esCoverage.missingCount, 0);

  const partialDict = { app_name: "Custom" };
  const partialCoverage = Loader.getLocaleCoverage("custom", partialDict);
  assert.ok(partialCoverage.percent < 100);
  assert.ok(partialCoverage.missingCount > 0);
  console.log("✓ Test 3: Language parity and coverage calculation verified.");
}

// Test 4: Hebrew exclusion gate remains impregnable
{
  const hebrewAttempt = Registry.registerDictionary("he", { app_name: "Illegal" });
  assert.strictEqual(hebrewAttempt, false, "Must block Hebrew registration");
  assert.strictEqual(Registry.translate("he", "app_name"), "Deep Focus", "Must fallback to English");
  console.log("✓ Test 4: Hebrew exclusion security gate confirmed in loaded system.");
}

// Test 5: Fallback cascade on un-translated keys
{
  // Indonesian pack has all 14 keys, query a non-existent key
  const fallback = Registry.translate("id", "non_existent_key");
  assert.strictEqual(fallback, "non_existent_key", "Must return raw key if missing everywhere");
  console.log("✓ Test 5: Cascade fallback on undefined keys verified.");
}

console.log("--- All Mission #065 Tests PASSED (GREEN) ---");
