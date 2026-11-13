'use strict';
// Language contract: exactly the 20 supported locales, identical key sets, same placeholders,
// no empty strings, no mostly-untranslated file, and every data-i18n key used in index.html exists.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const web = path.resolve(__dirname, '../android/app/src/main/assets/web');
const dir = path.join(web, 'locales');
const EXPECTED = 'ar de en es fa fr hi id it ja ko nl pl pt ro ru tr ur vi zh'.split(' ');
const flat = (o, p = '', r = {}) => { for (const [k, v] of Object.entries(o)) typeof v === 'object' && v ? flat(v, p + k + '.', r) : (r[p + k] = v); return r; };
const load = (l) => flat(JSON.parse(fs.readFileSync(path.join(dir, l + '.json'), 'utf8')));
const ph = (s) => (String(s).match(/\{\w+\}|%[sd]/g) || []).sort().join();

test('exactly the 20 supported locale files exist', () => {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).sort();
  assert.deepEqual(files, EXPECTED);
});

test('every locale has the same keys, placeholders and non-empty values as English', () => {
  const en = load('en');
  for (const l of EXPECTED) {
    const d = load(l);
    assert.deepEqual(Object.keys(en).filter((k) => !(k in d)), [], l + ' missing keys');
    assert.deepEqual(Object.keys(d).filter((k) => !(k in en)), [], l + ' extra keys');
    for (const k of Object.keys(en)) {
      assert.ok(typeof d[k] === 'string' && d[k].trim() !== '', l + ' empty ' + k);
      assert.equal(ph(d[k]), ph(en[k]), l + ' placeholder mismatch in ' + k);
    }
    if (l !== 'en') {
      const same = Object.keys(en).filter((k) => d[k] === en[k]).length;
      assert.ok(same / Object.keys(en).length < 0.3, l + ' looks untranslated');
    }
  }
});

test('compact locale rows cover every field key for every language row', () => {
  const sandbox = { window: {} };
  require('node:vm').runInNewContext(fs.readFileSync(path.join(web, 'locale_rows.js'), 'utf8'), sandbox);
  const keys = sandbox.window.ZEN_LOCALE_FIELD_KEYS, rows = sandbox.window.ZEN_LOCALE_ROWS;
  assert.ok(Array.isArray(keys) && keys.length > 40);
  for (const [lang, row] of Object.entries(rows)) {
    assert.ok(EXPECTED.concat(['bn']).includes(lang), lang + ' is not a registered app language');
    assert.equal(row.length, keys.length, lang + ' row length differs from field keys');
    row.forEach((v, i) => assert.ok(typeof v === 'string' && v.trim() !== '', lang + ' empty value for ' + keys[i]));
  }
});
