'use strict';
// 100-language localization & QA audit (both RTL and LTR) for the whole official set.
// Complements tests/i18n/audit_v21.test.cjs (legacy DICT/Quick-Training tables, duplicate-label dedupe,
// RTL CSS) and tests/i18n_catalog.test.cjs (structure/freshness of the generated packs). This file is the
// cross-cutting gate that fails on the four defect classes named for the localization lane:
//   1. missing keys / incomplete runtime UI packs,
//   2. untranslated English fallbacks (a value left equal to its English source beyond a documented cognate set),
//   3. duplicate "Name • Name" labels,
//   4. RTL direction disagreement between the registry, the runtime catalog and the fallback guard,
// plus 5. any excluded language (he/iw/yi) or Hebrew-script text leaking into a shipped localization source.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const repo = path.resolve(__dirname, '../..');
const web = path.join(repo, 'android/app/src/main/assets/web');
const readRepo = (p) => fs.readFileSync(path.join(repo, p), 'utf8');
const readWeb = (p) => fs.readFileSync(path.join(web, p), 'utf8');

const reg = JSON.parse(readRepo('i18n/languages.json'));
const VARIANTS = reg.variants || {};
const official = reg.languages;                                     // 100 entries, English included
const catalogOf = (l) => l.catalogCode || VARIANTS[l.code] || l.code;
const catalogCodes = official.map(catalogOf);                       // 100 app codes (jv -> jw)
const nonEnglish = official.filter((l) => l.code !== 'en');
const src = JSON.parse(readRepo('i18n/source_en.json'));
const srcKeys = Object.keys(src);
const ph = (s) => (String(s).match(/\{\d+\}/g) || []).sort().join(',');
const BAD_DIGITS = /[٠-٩۰-۹०-९૦-૯௦-௯౦-౯೦-೯൦-൯๐-๙໐-໙၀-၉០-៩༠-༩]/;
const HEBREW = /[\u0590-\u05FF]/;
const EXCLUDED = ['he', 'iw', 'yi', 'heb'];
const STATUSES = new Set(['source', 'human-reviewed', 'native-speaker-reviewed', 'expert-reviewed', 'ai-pending-review', 'machine-unverified']);

// Proper nouns, product/format tokens and international cognates that are legitimately identical to the
// English source in the languages that already use them. A value equal to English for any key OUTSIDE this
// set (and outside COGNATE_PATTERNS) is an untranslated fallback and fails the audit. Keep this list small
// and justified: it exists so a genuinely untranslated string cannot slip in unnoticed.
const COGNATE_ALLOWLIST = new Set([
  'Analytics', 'Calendar', 'Checklist', 'Cool-down stretch.', 'Custom ⚡', 'Date', 'Deck', 'Deep Work',
  'Deep work {0}/{1}', 'Description', 'Edit', 'Filter', 'Filters', 'Flashcards', 'Focus · min', 'Heading',
  'Import', 'Intervals {0}/{1}', 'Medium', 'Minutes ({0}-{1})', 'Multiple choice', 'Nature', 'Note #{0}',
  'Notes', 'November {0}', 'Original', 'Period', 'Preview', 'Progress', 'Reset', 'Sessions', 'Sets',
  'Settings', 'Sport', 'Sport: {0} min', 'Start', 'Status', 'Stop', 'Studio Suite', 'Sun', 'Sun {0}-{1}-{2}',
  'Tag', 'Term → Definition', 'Timer', 'Total', 'Type', 'Water {0}/{1}', 'Workout', 'Workout {0}/{1}',
  'Zen Sanctuary', 'Zen Study Suite', 'e.g., Action Potential, Dijkstra Algorithm, Photosynthesis, SVD...',
  'fixation', 'lexical', 'min', 'minutes', 'peripheral', 'regression', 'subvocal', '{0} WPM', '{0}Hz AMOLED',
  '⏹ Stop', '✏️ Pen', '✨ Mix', '✨ Studios', '🎧 {0}D Spatial & {1}Hz',
  '🎧 {0}D Spatial & {1}Hz ↗', '🎯 Target:', '📥 TXT', '🔉 Volume', '🔖 Bookmark', '🖍️ Highlighter',
  '🧠 {0}Hz / {1}Hz Bio-Frequencies'
]);
// Identifier/LaTeX-heavy prompt whose example is intentionally kept verbatim in every language.
const COGNATE_PATTERNS = [/^Type LaTeX or formula \(e\.g\./];

const appSource = readWeb('app.js');
function appCatalog() {
  const start = appSource.indexOf('const LANG_CATALOG = [');
  const end = appSource.indexOf('const DICT = {', start);
  assert.ok(start >= 0 && end > start, 'LANG_CATALOG block not found in app.js');
  return vm.runInNewContext(appSource.slice(start, end) + ';LANG_CATALOG');
}
const catalog = appCatalog();

function loadRuntimePack(code) {
  const sandbox = { window: {} };
  vm.runInNewContext(readWeb('locales/ui/' + code + '.js'), sandbox);
  return sandbox.window.DF_UI_PACKS[code];
}
const keysFile = readWeb('locales/ui/_keys.js');
const KEYS_HASH = keysFile.match(/"hash":"([0-9a-f]+)"/)[1];

// A DOM-tolerant sandbox lets us run the whole quick_training.js so its trailing Object.assign() batches
// (ms/om/...) are included — the same way the runtime loads it.
function loadQuickTraining() {
  const ctx = {
    window: { addEventListener() {}, removeEventListener() {}, dispatchEvent() {} },
    document: { addEventListener() {}, getElementById: () => null, querySelectorAll: () => [],
      createElement: () => ({ style: {}, classList: { add() {}, remove() {} }, setAttribute() {}, appendChild() {} }),
      body: {}, readyState: 'complete' },
    console, setTimeout, clearTimeout
  };
  vm.createContext(ctx);
  vm.runInContext(readWeb('quick_training.js') + ';this.Q = QUICK_TRANSLATIONS; this.K = QUICK_KEYS;', ctx);
  return { rows: ctx.Q, keys: ctx.K };
}

test('the registry holds exactly 100 official languages with one direction and no excluded code', () => {
  assert.equal(official.length, 100);
  assert.equal(new Set(official.map((l) => l.code)).size, 100);
  assert.equal(new Set(catalogCodes).size, 100);
  for (const l of official) {
    assert.match(l.code, /^[a-z]{2,3}$/, l.code);
    assert.ok(['ltr', 'rtl'].includes(l.dir), l.code + ' dir');
    assert.ok(l.script && l.enName && l.nativeName, l.code + ' names');
    assert.ok(Array.isArray(l.plural) && l.plural.includes('other'), l.code + ' plural');
    assert.ok(STATUSES.has(l.status), l.code + ' status');
    assert.ok(!EXCLUDED.includes(l.code), l.code + ' is an excluded language');
  }
  assert.deepEqual(official.filter((l) => l.dir === 'rtl').map((l) => l.code).sort(), ['ar', 'fa', 'ps', 'ur']);
  // Regional variants resolve to a base language and are never counted as their own official language.
  assert.ok(!official.some((l) => ['jw', 'prs', 'he', 'iw'].includes(l.code)));
  assert.equal(catalogOf(official.find((l) => l.code === 'jv')), 'jw');
});

test('every official language ships a complete, fresh runtime UI pack with no missing key', () => {
  for (const l of nonEnglish) {
    const pack = JSON.parse(readRepo('i18n/packs/' + l.code + '.json'));
    assert.ok(STATUSES.has(pack.status), l.code + ' bad status');
    const t = pack.t || {};
    const missing = srcKeys.filter((k) => !(typeof t[k] === 'string' && t[k].trim()));
    assert.deepEqual(missing, [], l.code + ' has ' + missing.length + ' missing keys');
    for (const k of srcKeys) {
      assert.equal(ph(t[k]), ph(k), l.code + ' placeholder mismatch: ' + k.slice(0, 48));
      assert.ok(!BAD_DIGITS.test(t[k]), l.code + ' non-Western digit: ' + k.slice(0, 48));
      assert.ok(!HEBREW.test(t[k]), l.code + ' Hebrew script: ' + k.slice(0, 48));
    }
    // The generated runtime pack must carry one non-empty value per shared key (no silently dropped string).
    const rt = loadRuntimePack(l.code);
    assert.ok(rt, l.code + ' runtime pack missing');
    assert.equal(rt.keysHash, KEYS_HASH, l.code + ' runtime pack is stale');
    assert.equal(rt.v.length, srcKeys.length, l.code + ' runtime value count');
    const dropped = rt.v.filter((v) => typeof v !== 'string' || !v).length;
    assert.equal(dropped, 0, l.code + ' dropped ' + dropped + ' runtime translations');
  }
});

// Every runtime UI pack must mirror its reviewable JSON pack value-for-value (freshness check).
test('every runtime UI pack mirrors its reviewable JSON pack value-for-value', () => {
  for (const l of nonEnglish) {
    const jsonPack = JSON.parse(readRepo('i18n/packs/' + l.code + '.json')).t || {};
    const rt = loadRuntimePack(l.code);
    const mismatched = [];
    for (let i = 0; i < srcKeys.length; i++) {
      const expected = jsonPack[srcKeys[i]];
      if (rt.v[i] !== expected) mismatched.push(srcKeys[i].slice(0, 40));
    }
    assert.deepEqual(mismatched, [], l.code + ' runtime pack drifts from JSON pack: ' + mismatched.join(' | '));
  }
});

test('xh spatial radar key is translated and not an English fallback', () => {
  const t = JSON.parse(readRepo('i18n/packs/xh.json')).t || {};
  const spatialRadarKey = '🌐 {0}D Spatial Radar';
  assert.notEqual(t[spatialRadarKey], '🌐 {0}D Spatial Radar', 'xh spatial radar key must be translated, not left as English source');
});

test('no official language leaves a translatable string in English', () => {
  const offenders = [];
  for (const l of nonEnglish) {
    const t = JSON.parse(readRepo('i18n/packs/' + l.code + '.json')).t || {};
    for (const k of srcKeys) {
      if (t[k] !== k || !/[A-Za-z]{3}/.test(k)) continue;
      if (COGNATE_ALLOWLIST.has(k) || COGNATE_PATTERNS.some((re) => re.test(k))) continue;
      offenders.push(l.code + ': ' + k.slice(0, 48));
    }
  }
  assert.deepEqual(offenders, [], 'untranslated English fallbacks:\n  ' + offenders.join('\n  '));
  // The allowlist itself must stay honest: only real source keys, no stale entries.
  for (const k of COGNATE_ALLOWLIST) assert.ok(k in src, 'cognate allowlist entry not in source: ' + k);
});

test('duplicate enName/nativeName labels are deduplicated for every affected official language', () => {
  const dup = official.filter((l) => l.enName.trim().toLowerCase() === l.nativeName.trim().toLowerCase()).map((l) => l.code).sort();
  assert.deepEqual(dup, ['af', 'en', 'eo', 'fil', 'ha', 'ig', 'mg', 'rw'], 'duplicate-name official set changed');
  // Every duplicate-name language must be in the runtime catalog so the dedupe actually applies to it.
  for (const code of dup) assert.ok(catalog.some((c) => c.code === code), code + ' not in LANG_CATALOG');
  // The current-language button collapses "Name • Name" to "Name" ...
  assert.match(appSource, /labelEn\.toLowerCase\(\) === labelNative\.toLowerCase\(\)/, 'button label dedupe missing');
  // ... and the picker row hides the redundant native line instead of repeating the English name.
  assert.match(appSource, /String\(l\.enName\)\.trim\(\)\.toLowerCase\(\) === String\(l\.nativeName\)\.trim\(\)\.toLowerCase\(\)/, 'picker row duplicate-line hide missing');
  assert.match(appSource, /native\.style\.display\s*=\s*'none'/, 'picker row must hide the duplicate native line');
});

test('RTL direction agrees across registry, runtime catalog and the fallback guard', () => {
  // LANG_CATALOG is evaluated in a vm context, so copy into a same-realm array before strict comparisons.
  const orderedCodes = Array.from(catalog, (c) => c.code);
  const catalogBy = new Map(Array.from(catalog, (c) => [c.code, c]));
  assert.equal(orderedCodes.length, 101, 'English + 100 languages, plus the Dari variant');
  assert.equal(new Set(orderedCodes).size, 101);
  for (const l of official) {
    const code = catalogOf(l);
    const c = catalogBy.get(code);
    assert.ok(c, code + ' missing from LANG_CATALOG');
    assert.equal(c.dir, l.dir, code + ' catalog/registry direction mismatch');
  }
  assert.deepEqual(orderedCodes.filter((code) => catalogBy.get(code).dir === 'rtl').sort(), ['ar', 'fa', 'prs', 'ps', 'ur']);
  assert.deepEqual(orderedCodes.filter((code) => !official.some((l) => catalogOf(l) === code)), ['prs'], 'only Dari is a catalog-only variant');

  const guard = require(path.join(web, 'js/localization_fallback_guard.js'));
  assert.deepEqual(Array.from(guard.SUPPORTED_LOCALES), orderedCodes, 'guard catalog must mirror LANG_CATALOG');
  assert.deepEqual(Array.from(guard.RTL_LOCALES).sort(), ['ar', 'fa', 'prs', 'ps', 'ur']);
  for (const code of orderedCodes) assert.equal(guard.isRtlLocale(code), catalogBy.get(code).dir === 'rtl', code + ' guard direction');
  for (const code of EXCLUDED) assert.equal(guard.isLocaleAllowed(code), false, code + ' must stay excluded');
});

test('no excluded language or Hebrew script leaks into any shipped localization source', () => {
  // Runtime dictionaries must never carry an excluded-language row.
  const { rows, keys } = loadQuickTraining();
  assert.equal(keys.length, 36, 'QUICK_KEYS');
  assert.deepEqual(Object.keys(rows).sort(), catalogCodes.slice().sort(), 'QUICK_TRANSLATIONS must cover exactly the official catalog');
  for (const code of EXCLUDED) assert.ok(!(code in rows), 'excluded language row in QUICK_TRANSLATIONS: ' + code);
  for (const [code, row] of Object.entries(rows)) {
    assert.equal(row.length, keys.length, code + ' QUICK row length');
    for (const v of row) assert.ok(typeof v === 'string' && v.trim() && !HEBREW.test(v), code + ' QUICK cell');
  }
  // No Hebrew script anywhere in the shipped JS/JSON localization sources.
  const shipped = ['app.js', 'quick_training.js', 'i18n_ui_catalog.js', 'js/global_i18n_registry.js',
    'js/df99_reviewed_packs.js', 'js/localization_fallback_guard.js', 'locales/ui/_keys.js'];
  for (const f of shipped) assert.ok(!HEBREW.test(readWeb(f)), 'Hebrew script in ' + f);
  for (const f of fs.readdirSync(path.join(repo, 'i18n/packs'))) {
    assert.ok(!/^(he|iw|yi)\./.test(f), 'forbidden pack file ' + f);
    assert.ok(!HEBREW.test(readRepo('i18n/packs/' + f)), 'Hebrew script in i18n/packs/' + f);
  }
  for (const f of fs.readdirSync(path.join(web, 'locales/ui'))) {
    assert.ok(!/^(he|iw|yi)\./.test(f), 'forbidden runtime pack ' + f);
  }
});
