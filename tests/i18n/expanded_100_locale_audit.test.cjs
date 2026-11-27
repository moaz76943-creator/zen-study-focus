'use strict';
/**
 * Expanded 100-language localization audit — covers UI binder, universal bridge,
 * duplicate-label deduplication, and cross-locale consistency.
 * Complements the existing audit_100_languages.test.cjs and rtl_alignment_bugs.test.cjs.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repo = path.resolve(__dirname, '../..');
const web = path.join(repo, 'android/app/src/main/assets/web');

const reg = JSON.parse(fs.readFileSync(path.join(repo, 'i18n/languages.json'), 'utf8'));
const official = reg.languages;
const catalogOf = (l) => l.catalogCode || (reg.variants || {})[l.code] || l.code;

// ---- Load modules ----
const Binder = require(path.join(web, 'js/comprehensive_ui_i18n_binder.js'));
const Registry = require(path.join(web, 'js/global_i18n_registry.js'));
const Loader = require(path.join(web, 'js/expanded_locales_loader.js'));

// ---- Helpers ----
function makeEl(attrs = {}) {
  return {
    attributes: { ...attrs },
    textContent: '',
    placeholder: '',
    title: '',
    children: [],
    getAttribute(k) { return this.attributes[k] || null; },
    setAttribute(k, v) { this.attributes[k] = v; },
  };
}

// ──────────────────────────────────────────────
// Test 1: Binder handles all 100 locales without crash
// ──────────────────────────────────────────────
test('binder binds a representative element for all 100 official locales', () => {
  for (const l of official) {
    const root = makeEl();
    const child = makeEl({ 'data-i18n': 'nav_timer' });
    root.children = [child];
    const res = Binder.bindTreeTranslations(root, l.code, Registry);
    assert.equal(res.status, 'SUCCESS_BOUND', `${l.code}: binder status`);
    assert.ok(typeof res.isRtl === 'boolean', `${l.code}: isRtl is boolean`);
    // Text must be non-empty string
    assert.ok(typeof child.textContent === 'string' && child.textContent.length > 0,
      `${l.code}: nav_timer text must be non-empty`);
    // Root dir must be set
    assert.ok(root.attributes.dir === 'rtl' || root.attributes.dir === 'ltr',
      `${l.code}: dir must be rtl or ltr`);
  }
});

// ──────────────────────────────────────────────
// Test 2: Binder applies correct RTL/LTR for all locales
// ──────────────────────────────────────────────
test('binder applies correct direction for all 100 locales', () => {
  for (const l of official) {
    const root = makeEl();
    const child = makeEl({ 'data-i18n': 'timer_start' });
    root.children = [child];
    const res = Binder.bindTreeTranslations(root, l.code, Registry);
    const expected = l.dir === 'rtl' ? 'rtl' : 'ltr';
    assert.equal(res.isRtl, l.dir === 'rtl', `${l.code}: isRtl matches registry`);
    assert.equal(root.attributes.dir, expected, `${l.code}: root dir matches registry`);
  }
});

// ──────────────────────────────────────────────
// Test 3: Binder placeholder and title binding across locales
// ──────────────────────────────────────────────
test('binder binds placeholder and title attributes for all 100 locales', () => {
  for (const l of official) {
    const root = makeEl();
    const input = makeEl({ 'data-i18n-placeholder': 'task_new_placeholder' });
    const titled = makeEl({ 'data-i18n-title': 'note_title_placeholder' });
    root.children = [input, titled];
    const res = Binder.bindTreeTranslations(root, l.code, Registry);
    assert.equal(res.status, 'SUCCESS_BOUND', `${l.code}: binder placeholder status`);
    assert.ok(input.placeholder.length > 0, `${l.code}: placeholder must be set`);
    assert.ok(titled.title.length > 0, `${l.code}: title must be set`);
  }
});

// ──────────────────────────────────────────────
// Test 4: Duplicate label deduplication — "English • English" never renders
// ──────────────────────────────────────────────
test('duplicate-name locales collapse to single label (no "English • English")', () => {
  const dupCodes = official
    .filter((l) => l.enName.trim().toLowerCase() === l.nativeName.trim().toLowerCase())
    .map((l) => l.code);
  // These are the known duplicate-name locales
  assert.ok(dupCodes.includes('en'), 'English must be in duplicate set');
  assert.ok(dupCodes.includes('af'), 'Afrikaans must be in duplicate set');
  assert.ok(dupCodes.includes('eo'), 'Esperanto must be in duplicate set');
  assert.ok(dupCodes.includes('fil'), 'Filipino must be in duplicate set');
  assert.ok(dupCodes.includes('ha'), 'Hausa must be in duplicate set');
  assert.ok(dupCodes.includes('ig'), 'Igbo must be in duplicate set');
  assert.ok(dupCodes.includes('mg'), 'Malagasy must be in duplicate set');
  assert.ok(dupCodes.includes('rw'), 'Kinyarwanda must be in duplicate set');

  // Verify app.js has the deduplication patterns
  const appSrc = fs.readFileSync(path.join(web, 'app.js'), 'utf8');
  // Button label: collapse "English • English" to "English"
  assert.match(appSrc, /labelEn\.toLowerCase\(\) === labelNative\.toLowerCase\(\)/,
    'button label dedupe pattern must exist');
  // Picker row: hide duplicate native line
  assert.match(appSrc, /String\(l\.enName\)\.trim\(\)\.toLowerCase\(\) === String\(l\.nativeName\)\.trim\(\)\.toLowerCase\(\)/,
    'picker row dedupe pattern must exist');
  assert.match(appSrc, /native\.style\.display\s*=\s*'none'/,
    'picker row must hide duplicate native line');
});

// ──────────────────────────────────────────────
// Test 5: Expanded loader core packs cover at least 8 language families
// ──────────────────────────────────────────────
test('expanded locales loader loads core packs for major language families', () => {
  const res = Loader.loadAllCorePacks(Registry);
  assert.equal(res.status, 'PACKS_LOADED_SUCCESS');
  assert.ok(res.loadedCount >= 8, `must load >= 8 core packs, got ${res.loadedCount}`);

  // Spot-check major languages
  assert.equal(Registry.translate('es', 'nav_timer'), 'Temporizador');
  assert.equal(Registry.translate('fr', 'nav_timer'), 'Minuteur');
  assert.equal(Registry.translate('de', 'nav_timer'), 'Timer');
  assert.equal(Registry.translate('ru', 'nav_timer'), 'Таймер');
  assert.equal(Registry.translate('tr', 'nav_timer'), 'Zamanlayıcı');
  assert.equal(Registry.translate('fa', 'nav_timer'), 'تایمر');
  assert.equal(Registry.translate('ur', 'nav_timer'), 'ٹائمر');
  assert.equal(Registry.translate('id', 'nav_timer'), 'Timer');
});

// ──────────────────────────────────────────────
// Test 6: Coverage analytics work for all loaded core packs
// ──────────────────────────────────────────────
test('coverage analytics return 100% for all core-loaded locales', () => {
  const coreCodes = Object.keys(Loader.CORE_PACKS);
  for (const code of coreCodes) {
    const cov = Loader.getLocaleCoverage(code);
    assert.equal(cov.percent, 100, `${code}: coverage must be 100%`);
    assert.equal(cov.isFullyTranslated, true, `${code}: isFullyTranslated must be true`);
    assert.equal(cov.missingCount, 0, `${code}: missingCount must be 0`);
  }
});

// ──────────────────────────────────────────────
// Test 7: Registry fallback chain works for all 100 locales
// ──────────────────────────────────────────────
test('registry fallback chain returns non-empty for all 100 locales on core keys', () => {
  Loader.loadAllCorePacks(Registry);
  const srcKeys = Object.keys(JSON.parse(fs.readFileSync(path.join(repo, 'i18n/source_en.json'), 'utf8')));
  for (const l of official) {
    for (const key of srcKeys) {
      const text = Registry.translate(l.code, key);
      assert.ok(typeof text === 'string' && text.trim().length > 0,
        `${l.code}:${key} must return non-empty string`);
      assert.ok(!text.includes('undefined'), `${l.code}:${key} must not contain 'undefined'`);
      assert.ok(!text.includes('null'), `${l.code}:${key} must not contain 'null'`);
    }
  }
});

// ──────────────────────────────────────────────
// Test 8: Non-existent key fallback returns raw key for all 100 locales
// ──────────────────────────────────────────────
test('registry returns raw key for non-existent key in all 100 locales', () => {
  for (const l of official) {
    const text = Registry.translate(l.code, 'non_existent_key_99999');
    assert.equal(text, 'non_existent_key_99999', `${l.code}: must return raw key`);
  }
});

// ──────────────────────────────────────────────
// Test 9: RTL locales resolve to correct direction in metadata
// ──────────────────────────────────────────────
test('registry metadata returns correct RTL flag for all 100 locales', () => {
  for (const l of official) {
    const meta = Registry.getLocaleMetadata(l.code);
    assert.equal(meta.isRtl, l.dir === 'rtl', `${l.code}: isRtl matches languages.json`);
    assert.equal(meta.code, l.code, `${l.code}: metadata code matches`);
    assert.ok(meta.name && meta.name.length > 0, `${l.code}: metadata name must be non-empty`);
  }
});

// ──────────────────────────────────────────────
// Test 10: Binder handles fallback for unknown locale gracefully
// ──────────────────────────────────────────────
test('binder falls back gracefully for unknown/excluded locale codes', () => {
  const root = makeEl();
  const child = makeEl({ 'data-i18n': 'nav_timer' });
  root.children = [child];
  const res = Binder.bindTreeTranslations(root, 'xx', Registry);
  assert.equal(res.status, 'SUCCESS_BOUND', 'unknown locale must not crash');
  assert.ok(child.textContent.length > 0, 'must fallback to English text');
  assert.equal(root.attributes.dir, 'ltr', 'unknown locale defaults to LTR');
});

// ──────────────────────────────────────────────
// Test 11: Binder handles excluded Hebrew locale gracefully
// ──────────────────────────────────────────────
test('binder redirects Hebrew (he/iw) to English fallback without crash', () => {
  for (const heCode of ['he', 'iw']) {
    const root = makeEl();
    const child = makeEl({ 'data-i18n': 'timer_start' });
    root.children = [child];
    const res = Binder.bindTreeTranslations(root, heCode, Registry);
    assert.equal(res.status, 'SUCCESS_BOUND', `${heCode}: must not crash`);
    assert.equal(child.textContent, 'Start Focus', `${heCode}: must fallback to English`);
    assert.equal(root.attributes.dir, 'ltr', `${heCode}: must not apply RTL`);
  }
});

// ──────────────────────────────────────────────
// Test 12: All 100 locale packs have valid structure
// ──────────────────────────────────────────────
test('all 100 locale packs in i18n/packs/ have valid JSON structure', () => {
  const packsDir = path.join(repo, 'i18n/packs');
  const files = fs.readdirSync(packsDir).filter((f) => f.endsWith('.json'));
  assert.equal(files.length, 100, `must have exactly 100 pack files, got ${files.length}`);
  for (const f of files) {
    const pack = JSON.parse(fs.readFileSync(path.join(packsDir, f), 'utf8'));
    assert.ok(pack.status, `${f}: must have status`);
    assert.ok(pack.t && typeof pack.t === 'object', `${f}: must have t object`);
    const values = Object.values(pack.t);
    assert.ok(values.length > 0, `${f}: must have at least one translation`);
    for (const v of values) {
      assert.ok(typeof v === 'string' && v.trim().length > 0, `${f}: all values must be non-empty strings`);
    }
  }
});