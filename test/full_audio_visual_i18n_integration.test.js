/**
 * DEEP FOCUS — Full Audio-Visual-i18n Integration Certification
 * Mission #074: End-to-end integration test verifying UI localization binding,
 * RTL/LTR switching, Hebrew exclusion, zero-music nature synthesis,
 * anti-clipping headroom ceiling, and active default completion chime.
 */
const assert = require('assert');
const Registry = require('../android/app/src/main/assets/web/js/global_i18n_registry.js');
const Loader = require('../android/app/src/main/assets/web/js/expanded_locales_loader.js');
const Binder = require('../android/app/src/main/assets/web/js/comprehensive_ui_i18n_binder.js');
const AudioSynth = require('../android/app/src/main/assets/web/js/rich_audio_synthesizer_engine.js');
const Purifier = require('../android/app/src/main/assets/web/js/studio_audio_purifier_engine.js');

console.log("--- Running 🎯 Mission #074: Full Audio-Visual-i18n Integration Tests ---");

// Step 1: Pre-load all language dictionaries
Loader.loadAllCorePacks(Registry);

// Mock DOM Tree
function createMockElement(attrs) {
  return {
    attributes: Object.assign({}, attrs),
    textContent: "",
    placeholder: "",
    title: "",
    children: [],
    getAttribute: function (k) { return this.attributes[k] || null; },
    setAttribute: function (k, v) { this.attributes[k] = v; }
  };
}

// Flow 1: Switch language to Arabic -> Verify RTL and correct Arabic UI labels
{
  const root = createMockElement({});
  const btnStart = createMockElement({ "data-i18n": "timer_start" });
  const navTasks = createMockElement({ "data-i18n": "nav_tasks" });
  root.children = [btnStart, navTasks];

  const bindAr = Binder.bindTreeTranslations(root, "ar", Registry);
  assert.strictEqual(bindAr.isRtl, true);
  assert.strictEqual(root.attributes.dir, "rtl");
  assert.strictEqual(btnStart.textContent, "بدء التركيز");
  assert.strictEqual(navTasks.textContent, "المهام");
  console.log("✓ Step 1: Arabic localization & RTL directionality verified.");
}

// Flow 2: Studio Audio Purifier enforces anti-clipping and smooth envelope
{
  const natureProfile = Purifier.PURE_NATURE_PROFILES.find(p => p.id === "gentle_rain");
  assert.ok(natureProfile, "Gentle rain profile must exist");
  assert.strictEqual(natureProfile.type, "NATURE_AMBIENT");

  // Verify safe headroom clamping (never exceeds 0.85)
  const safeGain = Purifier.clampSafeGain(1.2);
  assert.strictEqual(safeGain, 0.85);

  // Verify anti-pop envelope ramp
  const ramp = Purifier.calculateEnvelopeRamp(0.0, safeGain, 0.0, 0.08);
  assert.strictEqual(ramp.isAntiPopGuarded, true);
  assert.strictEqual(ramp.targetVal, 0.85);
  console.log("✓ Step 2: Anti-clipping limiter & anti-pop smooth envelope verified.");
}

// Flow 3: Attempt to switch to Hebrew -> Strictly blocked and falls back safely
{
  const rootHe = createMockElement({});
  const btnStart = createMockElement({ "data-i18n": "timer_start" });
  rootHe.children = [btnStart];

  const bindHe = Binder.bindTreeTranslations(rootHe, "he", Registry);
  assert.strictEqual(bindHe.isRtl, false);
  assert.strictEqual(rootHe.attributes.dir, "ltr");
  assert.strictEqual(btnStart.textContent, "Start Focus", "Hebrew must fallback to English");
  console.log("✓ Step 3: Hebrew exclusion security gate confirmed in live DOM binding.");
}

// Flow 4: Session completion triggers active default chime (Zen Harmonic Chime - Pure Acoustic)
{
  const defaultAlert = AudioSynth.getDefaultCompletionAlert();
  assert.strictEqual(defaultAlert.id, "zen_harmonic_chime");
  assert.strictEqual(defaultAlert.isDefault, true);
  assert.strictEqual(defaultAlert.tier, "gentle");
  assert.ok(defaultAlert.durationMs > 2000, "Must have relaxing decay");
  
  // Verify 100% Royalty Free
  assert.strictEqual(defaultAlert.license, "PROCEDURAL_ROYALTY_FREE_100%");
  console.log("✓ Step 4: Active default chime ('zen_harmonic_chime') royalty-free verified.");
}

// Flow 5: Multi-language switching (Spanish & Turkish) without empty keys
{
  const root = createMockElement({});
  const btnReset = createMockElement({ "data-i18n": "timer_reset" });
  root.children = [btnReset];

  Binder.bindTreeTranslations(root, "es", Registry);
  assert.strictEqual(btnReset.textContent, "Reiniciar");

  Binder.bindTreeTranslations(root, "tr", Registry);
  assert.strictEqual(btnReset.textContent, "Sıfırla");
  console.log("✓ Step 5: Multi-language switching parity verified.");
}

console.log("--- All Mission #074 Integration Tests PASSED (GREEN) ---");
