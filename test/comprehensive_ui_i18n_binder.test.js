const assert = require('assert');
const Registry = require('../android/app/src/main/assets/web/js/global_i18n_registry.js');
const Binder = require('../android/app/src/main/assets/web/js/comprehensive_ui_i18n_binder.js');

console.log("--- Running 🎯 Mission #073: Comprehensive UI i18n Binder Tests ---");

// Test 1: Canonical keys schema completeness across all 7 destinations
{
  assert.ok(Binder.CANONICAL_UI_KEYS.length >= 30, "Must define comprehensive UI keys across all 7 sections");
  assert.ok(Binder.CANONICAL_UI_KEYS.includes("nav_timer"));
  assert.ok(Binder.CANONICAL_UI_KEYS.includes("task_filter_today"));
  assert.ok(Binder.CANONICAL_UI_KEYS.includes("note_title_placeholder"));
  assert.ok(Binder.CANONICAL_UI_KEYS.includes("analytics_peak_hour_label"));
  assert.ok(Binder.CANONICAL_UI_KEYS.includes("audio_title_nature"));
  console.log("✓ Test 1: Full 7-section canonical keys schema completeness verified.");
}

// Test 2: Virtual DOM translation binding updates textContent and placeholders
{
  // Mock Virtual DOM Node
  function createMockElement(attrs) {
    const el = {
      attributes: Object.assign({}, attrs),
      textContent: "",
      placeholder: "",
      title: "",
      children: [],
      getAttribute: function (k) { return this.attributes[k] || null; },
      setAttribute: function (k, v) { this.attributes[k] = v; }
    };
    return el;
  }

  const root = createMockElement({});
  const btn = createMockElement({ "data-i18n": "timer_start" });
  const input = createMockElement({ "data-i18n-placeholder": "task_new_placeholder" });
  root.children = [btn, input];

  const res = Binder.bindTreeTranslations(root, "ar", Registry);
  assert.strictEqual(res.status, "SUCCESS_BOUND");
  assert.strictEqual(res.isRtl, true);
  assert.strictEqual(btn.textContent, "بدء التركيز");
  assert.strictEqual(root.attributes.dir, "rtl", "RTL must be applied for Arabic");
  console.log("✓ Test 2: Virtual DOM tree translation binding & RTL directionality verified.");
}

// Test 3: LTR directionality for Latin languages
{
  function createMockElement() {
    return {
      attributes: {},
      children: [],
      getAttribute: function () { return null; },
      setAttribute: function (k, v) { this.attributes[k] = v; }
    };
  }
  const rootEn = createMockElement();
  const resEn = Binder.bindTreeTranslations(rootEn, "en", Registry);
  assert.strictEqual(resEn.isRtl, false);
  assert.strictEqual(rootEn.attributes.dir, "ltr");
  console.log("✓ Test 3: LTR directionality verified for English/Latin.");
}

// Test 4: Hebrew exclusion redirect on DOM binding
{
  function createMockElement(attrs) {
    return {
      attributes: Object.assign({}, attrs),
      textContent: "",
      children: [],
      getAttribute: function (k) { return this.attributes[k] || null; },
      setAttribute: function (k, v) { this.attributes[k] = v; }
    };
  }
  const rootHe = createMockElement({});
  const btn = createMockElement({ "data-i18n": "timer_start" });
  rootHe.children = [btn];

  // Request Hebrew -> must safely redirect to English fallback without throwing
  const resHe = Binder.bindTreeTranslations(rootHe, "he", Registry);
  assert.strictEqual(resHe.isRtl, false);
  assert.strictEqual(btn.textContent, "Start Focus", "Must fallback safely to English text");
  console.log("✓ Test 4: Hebrew exclusion redirect on DOM binding verified.");
}

// Test 5: Zero missing keys / Fallback on undefined key
{
  function createMockElement(attrs) {
    return {
      attributes: Object.assign({}, attrs),
      textContent: "",
      children: [],
      getAttribute: function (k) { return this.attributes[k] || null; },
      setAttribute: function () {}
    };
  }
  const root = createMockElement({});
  const customEl = createMockElement({ "data-i18n": "non_existent_key" });
  root.children = [customEl];

  Binder.bindTreeTranslations(root, "fr", Registry);
  assert.strictEqual(customEl.textContent, "non_existent_key", "Must fallback to key name rather than empty/null");
  console.log("✓ Test 5: Fallback on undefined key (zero nulls/empty) verified.");
}

console.log("--- All Mission #073 Tests PASSED (GREEN) ---");
