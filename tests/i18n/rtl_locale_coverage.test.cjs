'use strict';
// RTL alignment & translation integrity regression cover for the four Arabic-script RTL
// languages plus the Dari (prs) catalog variant. Complements tests/i18n/audit_100_languages.test.cjs
// (cross-language gate) and tests/i18n/rtl_alignment_bugs.test.cjs (label dedupe / Hebrew scan).
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
const official = reg.languages;
const catalogOf = (l) => l.catalogCode || VARIANTS[l.code] || l.code;

const appSource = readWeb('app.js');
const start = appSource.indexOf('const LANG_CATALOG = [');
const end = appSource.indexOf('const DICT = {', start);
assert.ok(start >= 0 && end > start, 'LANG_CATALOG block not found in app.js');
const catalog = vm.runInNewContext(appSource.slice(start, end) + ';LANG_CATALOG');
const catBy = new Map(catalog.map((c) => [c.code, c]));

const guard = require(path.join(web, 'js/localization_fallback_guard.js'));

const RTL_OFFICIAL = ['ar', 'fa', 'ps', 'ur'];
const RTL_CATALOG = ['ar', 'fa', 'prs', 'ps', 'ur'];
const STATUSES = new Set([
  'source', 'human-reviewed', 'native-speaker-reviewed', 'expert-reviewed',
  'ai-pending-review', 'machine-unverified',
]);

test('RTL direction agrees across registry, app catalog, and the fallback guard', () => {
  assert.deepEqual(
    official.filter((l) => l.dir === 'rtl').map((l) => l.code).sort(),
    RTL_OFFICIAL,
    'registry RTL set'
  );
  // LANG_CATALOG is evaluated in a vm context; copy into a same-realm array before strict comparison.
  const catRTL = Array.from(catalog.filter((c) => c.dir === 'rtl'), (c) => c.code).sort();
  assert.deepEqual(catRTL, RTL_CATALOG, 'catalog RTL set');
  assert.deepEqual(Array.from(guard.RTL_LOCALES).sort(), RTL_CATALOG, 'guard RTL set');
  for (const code of RTL_CATALOG) {
    const c = catBy.get(code);
    assert.ok(c, code + ' present in LANG_CATALOG');
    assert.equal(c.dir, 'rtl', code + ' catalog dir');
    assert.equal(guard.isRtlLocale(code), true, code + ' guard isRtlLocale');
  }
  const ltrCat = Array.from(catalog.filter((c) => c.dir !== 'rtl'), (c) => c.code);
  for (const code of ltrCat) assert.equal(guard.isRtlLocale(code), false, code + ' guard isLtr');
});

test('every RTL pack ships valid status, translated keys, valid placeholders, fresh runtime pack', () => {
  const src = JSON.parse(readRepo('i18n/source_en.json'));
  const srcKeys = Object.keys(src);
  const keysFile = readWeb('locales/ui/_keys.js');
  const KEYS_HASH = keysFile.match(/"hash":"([0-9a-f]+)"/)[1];
  const HEBREW = /[\u0590-\u05FF]/;
  const BAD_DIGITS = /[٠-٩۰-۹०-९૦-૯௦-௯౦-౯೦-೯൦-൯๐-๙໐-໙၀-၉០-៩༠-༩]/;
  // Technical tokens that legitimately stay identical to the English source in every language.
  const KEEP = new Set([
    '{0}Hz AMOLED', '{0} WPM', 'min', 'mins', 'minutes', 'Timer', 'Status', 'Filter', 'Filters',
    'Edit', 'Start', 'Stop', '📥 TXT', 'Original', 'Total', 'November {0}', 'Sport', 'Zen Study Suite',
    'Zen Sanctuary', 'Date', 'Deck', 'Checklist', 'Notes', 'Sessions', 'Nature', 'Preview', 'Progress',
    'Reset', 'Settings', 'Studio Suite', 'Sun', 'Tag', 'Type', 'Term → Definition', 'Water {0}/{1}',
    'Intervals {0}/{1}', 'Multiple choice', 'Deep Work', 'Deep work {0}/{1}',
  ]);
  const PH = (s) => (String(s).match(/\{\d+\}/g) || []).sort().join(',');

  for (const code of RTL_OFFICIAL) {
    const l = official.find((x) => x.code === code);
    const pack = JSON.parse(readRepo('i18n/packs/' + code + '.json'));
    assert.ok(STATUSES.has(pack.status), code + ' pack status');
    assert.notEqual(pack.status, 'source', code + ' pack must not be the source pack');
    assert.equal(l.dir, 'rtl', code + ' registry dir');
    const t = pack.t || {};
    for (const k of srcKeys) {
      const v = t[k];
      assert.equal(typeof v, 'string', code + ' key present: ' + k.slice(0, 30));
      assert.ok(v && v.trim(), code + ' non-empty: ' + k.slice(0, 30));
      assert.equal(PH(v), PH(k), code + ' placeholder: ' + k.slice(0, 30));
      assert.ok(!BAD_DIGITS.test(v), code + ' digits: ' + k.slice(0, 30));
      assert.ok(!HEBREW.test(v), code + ' hebrew: ' + k.slice(0, 30));
      if (!KEEP.has(k)) assert.notEqual(v, k, code + ' translated: ' + k.slice(0, 30));
    }
    // Runtime pack freshness for RTL
    const sandbox = { window: {} };
    vm.runInNewContext(readWeb('locales/ui/' + code + '.js'), sandbox);
    const rt = sandbox.window.DF_UI_PACKS[code];
    assert.ok(rt, code + ' runtime pack');
    assert.equal(rt.keysHash, KEYS_HASH, code + ' runtime fresh');
    assert.equal(rt.v.length, srcKeys.length, code + ' runtime count');
    assert.equal(rt.v.filter((v) => typeof v !== 'string' || !v).length, 0, code + ' runtime no drops');
  }
});
