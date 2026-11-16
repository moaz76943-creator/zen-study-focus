'use strict';
// 100-language localization & QA audit regression coverage (v21):
// - legacy DICT/Quick-Training tables must stay complete for the official 100 languages
// - duplicate enName/nativeName labels must never render twice ("English • English")
// - RTL-critical CSS must use logical direction properties
const test = require('node:test'); const assert = require('node:assert/strict'); const fs = require('node:fs'); const path = require('node:path'); const vm = require('node:vm');
const repo = path.resolve(__dirname, '../..'); const web = path.join(repo, 'android/app/src/main/assets/web');
const read = (f) => fs.readFileSync(f, 'utf8');
const reg = JSON.parse(read(path.join(repo, 'i18n/languages.json')));
const VARIANTS = reg.variants || {};
const catalogCodes = reg.languages.map((l) => l.catalogCode || VARIANTS[l.code] || l.code);
const official100 = catalogCodes.slice().sort();
const RTL_DIRS = reg.languages.filter((l) => l.dir === 'rtl').map((l) => l.catalogCode || VARIANTS[l.code] || l.code).sort();
assert.equal(official100.length, 100); // sanity

// Same digit rule the pack validator enforces: Indic/Persian/Thai/etc. digits are forbidden.
const BAD_DIGITS = /[٠-٩۰-۹०-९০-৯૦-૯௦-௯౦-౯೦-೯൦-൯๐-๙໐-໙၀-၉០-៩༠-༩]/;

test('ZEN_LOCALE_ROWS stays in sync with ZEN_LOCALE_FIELD_KEYS for all 17 non-Latin legacy packs', () => {
  const ctx = { window: {} };
  vm.runInNewContext(read(path.join(web, 'locale_rows.js')), ctx);
  const K = ctx.window.ZEN_LOCALE_FIELD_KEYS, R = ctx.window.ZEN_LOCALE_ROWS;
  assert.equal(K.length, 48);
  assert.equal(K[K.length - 1], 'btnBotanicalGarden');
  const langs = Object.keys(R);
  assert.equal(langs.length, 17);
  for (const code of langs) {
    const row = R[code];
    assert.equal(row.length, K.length, code + ' row length');
    for (const v of row) {
      assert.equal(typeof v, 'string', code);
      assert.ok(v.trim(), code + ' has empty cell');
      assert.ok(!BAD_DIGITS.test(v), code + ' has non-Western digits: ' + v);
    }
  }
  // The 2 legally-DICT-explicit languages (es, ar) are asserted directly in app.js.
  const app = read(path.join(web, 'app.js'));
  for (const el of ['en', 'ar', 'es']) {
    const idx = app.indexOf('btnBotanicalGarden:');
    assert.ok(idx > 0, 'btnBotanicalGarden missing from DICT for ' + el);
  }
  const enBtn = app.slice(app.indexOf('btnBotanicalGarden:')).slice(0, 140);
  assert.match(enBtn, /🌿/, 'the zen-suite CTA keeps its icon');
});

test('QUICK_TRANSLATIONS covers every official language with 36 non-empty cells, no non-Western digits', () => {
  const ctx = { window: {} };
  vm.runInNewContext(read(path.join(web, 'quick_training.js')) + ';window.__Q = QUICK_TRANSLATIONS; window.__K = QUICK_KEYS;', ctx);
  const Q = ctx.window.__Q, K = ctx.window.__K;
  assert.equal(K.length, 36);
  for (const code of official100) {
    const row = Q[code];
    assert.ok(Array.isArray(row), 'QUICK row missing for official language ' + code);
    assert.equal(row.length, K.length, code + ' QUICK length');
    for (const v of row) {
      assert.equal(typeof v, 'string', code);
      assert.ok(v.trim(), code + ' has an empty QUICK cell');
      assert.ok(!BAD_DIGITS.test(v), code + ' has non-Western digits: ' + v);
    }
  }
});

test('duplicate enName/nativeName labels are deduplicated on the language button', () => {
  const app = read(path.join(web, 'app.js'));
  assert.match(app, /labelEn\.toLowerCase\(\) === labelNative\.toLowerCase\(\)/, 'button label dedupe missing');
  assert.match(app, /String\(l\.enName\)\.trim\(\)\.toLowerCase\(\) === String\(l\.nativeName\)\.trim\(\)\.toLowerCase\(\)/, 'picker row duplicate-line hide missing');
  const dup = reg.languages.filter((l) => l.enName.trim().toLowerCase() === l.nativeName.trim().toLowerCase()).map((l) => l.code).sort();
  assert.deepEqual(dup, ['af', 'en', 'eo', 'fil', 'ha', 'ig', 'mg', 'rw'], 'duplicate-name official set changed — revisit dedupe coverage');
  assert.ok(!read(path.join(repo, 'i18n/inventory_en.json')).includes('English • English'), 'stale inventory literal');
});

test('RTL-critical rules in index.html use logical direction properties', () => {
  const html = read(path.join(web, 'index.html'));
  // Strip [dir="ltr"] / [dir="rtl"] rule bodies before scanning for physical ltr-only styles.
  const stripped = html.replace(/\[dir="(?:ltr|rtl)"[^}]*\}/g, '');
  assert.ok(!/text-align:\s*left(\s*!important)?\s*;/.test(stripped), 'physical text-align:left outside [dir="ltr"] rules');
  assert.ok(/\.lang-row-btn[\s\S]*?text-align:\s*start/.test(stripped), '.lang-row-btn must use logical text-align:start');
  assert.ok(/\.zen-suite-grid[\s\S]*?padding-inline-end/.test(stripped), '.zen-suite-grid must use inline-end scrollbar padding');
  assert.ok(/\.lang-list-scroll[\s\S]*?padding-inline-end/.test(stripped), '.lang-list-scroll must use inline-end scrollbar padding');
  // Every RTL official language must parse to the same base used by the runtime VARIANT alias table.
  const rt = read(path.join(web, 'i18n_ui_catalog.js'));
  const variantMatch = rt.match(/VARIANT = (\{[^}]*\})/);
  const VARIANT = JSON.parse(variantMatch[1].replace(/'/g, '"').replace(/([{,]\s*)([A-Za-z0-9_]+)(\s*:)/g, '$1"$2"$3'));
  for (const code of RTL_DIRS) assert.ok(!VARIANT[code], code + ' must not be variant-aliased (RTL base conflict)');
});

test('the 20 legacy DICT languages resolve the zen-suite CTA string', () => {
  const ctx = { window: { addEventListener() {}, removeEventListener() {}, dispatchEvent() {} }, console, setTimeout, clearTimeout };
  vm.runInNewContext(read(path.join(web, 'locale_rows.js')), ctx);
  const K = ctx.window.ZEN_LOCALE_FIELD_KEYS, R = ctx.window.ZEN_LOCALE_ROWS;
  for (const [code, row] of Object.entries(R)) {
    const entry = Object.fromEntries(K.map((k, i) => [k, row[i]]));
    assert.ok(entry.btnBotanicalGarden.includes('🌿'), code + ' DICT CTA keeps icon');
    assert.ok(/365/.test(entry.btnBotanicalGarden), code + ' DICT CTA keeps the Western-digit heatmap reference');
  }
});
