'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const WEB = path.resolve(__dirname, '../../android/app/src/main/assets/web');
const ctx = { window: {} };
vm.createContext(ctx);
for (const name of ['locale_rows.js', 'locale_extras.js', 'locale_premium_v22.js']) {
  vm.runInContext(fs.readFileSync(path.join(WEB, name), 'utf8'), ctx, {
    filename: name, timeout: 3000
  });
}

const { ZEN_LOCALE_FIELD_KEYS: fields, ZEN_LOCALE_ROWS: rows,
  ZEN_LOCALE_EXTRAS: extras, DF22Locale: premium } = ctx.window;
const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const expectedCore = 'fr de pt it nl tr ru id vi pl zh hi ja ko bn ur fa'.split(' ');
const expectedPremium = ['en', 'ar', 'es', ...expectedCore];
const localizedCornell = Object.freeze({
  fr: 'Notes Cornell 📋',
  de: 'Cornell-Notizen 📋',
  pt: 'Notas Cornell 📋',
  it: 'Appunti Cornell 📋',
  nl: 'Cornell-notities 📋',
  tr: 'Cornell notları 📋',
  id: 'Catatan Cornell 📋',
  vi: 'Ghi chú Cornell 📋',
  pl: 'Notatki Cornella 📋'
});

test('17 Core row dictionaries exactly match the declared 47 fields, without empty entries', () => {
  assert.equal(fields.length, 47);
  assert.equal(new Set(fields).size, fields.length);
  assert.deepEqual(Object.keys(rows).sort(), expectedCore.slice().sort());
  for (const [code, values] of Object.entries(rows)) {
    assert.equal(values.length, fields.length, code);
    values.forEach((value, i) => {
      assert.equal(typeof value, 'string', code + ' ' + fields[i]);
      assert.ok(value.trim(), code + ' ' + fields[i]);
    });
  }
});

test('Cornell notes core-shell label is native for each of the nine previously English-fallback rows', () => {
  const i = fields.indexOf('tagCornell');
  assert.ok(i >= 0);
  for (const [code, translation] of Object.entries(localizedCornell)) {
    assert.equal(rows[code][i], translation, code + ' tagCornell');
    assert.notEqual(rows[code][i], 'Structured Notes 📋');
  }
});

test('Core starter examples and sound names stay complete and separate from data/storage identifiers', () => {
  assert.deepEqual(Object.keys(extras).sort(), expectedCore.slice().sort());
  for (const [code, pack] of Object.entries(extras)) {
    assert.equal(pack.sounds.length, 12, code);
    assert.equal(pack.tasks.length, 4, code);
    assert.equal(pack.notes.length, 3, code);
    for (const sample of [...pack.sounds, ...pack.tasks, ...pack.notes.flat()]) {
      assert.equal(typeof sample, 'string', code);
      assert.ok(sample.trim(), code);
    }
  }
});

test('v22 shell has 20 explicit real dictionaries with all 22 keys; excluded codes absent', () => {
  assert.equal(premium.keys.length, 22);
  assert.equal(new Set(premium.keys).size, premium.keys.length);
  assert.deepEqual(Object.keys(premium.translations).sort(), expectedPremium.slice().sort());
  for (const [code, dictionary] of Object.entries(premium.translations)) {
    assert.deepEqual(Object.keys(dictionary).sort(), Array.from(premium.keys).sort(), code);
    assert.ok(Object.values(dictionary).every(s => typeof s === 'string' && s.trim()), code);
  }
  for (const code of ['he', 'iw']) {
    assert.equal(own(rows, code), false);
    assert.equal(own(extras, code), false);
    assert.equal(own(premium.translations, code), false);
  }
});

test('RTL is confined to Arabic, Persian and Urdu; a fallback is not a translated dictionary', () => {
  for (const code of expectedPremium) {
    assert.equal(premium.dir(code), ['ar', 'fa', 'ur'].includes(code) ? 'rtl' : 'ltr', code);
  }
  assert.equal(own(premium.translations, 'zz'), false);
  assert.equal(premium.t('zz', 'start'), premium.translations.en.start);
  assert.equal(premium.t('zz', 'unknown'), null);
  assert.equal(own(premium.translations, 'he'), false);
});
