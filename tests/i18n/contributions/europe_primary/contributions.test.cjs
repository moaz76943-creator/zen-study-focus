'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../../../');
const canonical = JSON.parse(fs.readFileSync(path.join(root, 'assets/i18n/df99_reviewed_packs.json'), 'utf8'));
const dir = path.join(root, 'assets/i18n/contributions/europe_primary');
const languages = ['el', 'sk'];
const timerKeys = Array.from({length: 11}, (_, i) => String(i));
const required = new Set(['TRANSLATED', 'MACHINE_DRAFT', 'REVIEW_REQUIRED', 'VERIFIED']);
const bad = /[\u0660-\u0669\u06F0-\u06F9]|[<>]|[\u0000-\u0008\u000B\u000C\u000E-\u001F]/u;
const placeholders = /\{\{[A-Za-z_][\w]*\}\}|\$\{[A-Za-z_][\w]*\}|\{[A-Za-z_][\w]*\}|%(?:[1-9]\d*\$)?[sdif]/g;
const tokens = value => (value.match(placeholders) || []).sort();
const schema = canonical.cs.timer;

for (const lang of languages) {
  test(lang + ' timer contributes 11 canonical keys without replacing reviewed text', () => {
    const file = path.join(dir, lang + '.json');
    const pack = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(pack.language, lang);
    assert.ok(required.has(pack.status));
    assert.equal(pack.status, 'TRANSLATED');
    assert.notEqual(pack.status, 'VERIFIED', 'No independent human review approval exists');
    assert.deepEqual(Object.keys(pack.sections).sort(), ['timer']);
    assert.deepEqual(Object.keys(pack.sections.timer).sort(), [...timerKeys].sort());
    for (const [key, value] of Object.entries(pack.sections.timer)) {
      assert.ok(Object.hasOwn(schema, key), 'Unknown timer key: ' + key);
      assert.equal(typeof value, 'string');
      assert.ok(value.trim().length > 0 && value.length <= 1000);
      assert.ok(!bad.test(value), 'Unsafe characters in ' + lang + '/timer/' + key);
      assert.deepEqual(tokens(value), tokens(schema[key]), 'Placeholders changed in ' + lang + '/' + key);
      assert.ok(lang === 'el' ? /\p{Script=Greek}/u.test(value) : /\p{Script=Latin}/u.test(value));
      if (Object.hasOwn(canonical[lang]?.timer || {}, key)) {
        assert.equal(value, canonical[lang].timer[key], 'Existing translation conflict at ' + lang + '/' + key);
      }
    }
  });
}

test('No forbidden languages or unexpected contribution files', () => {
  const files = fs.readdirSync(dir).filter(name => name.endsWith('.json'));
  assert.ok(['el.json', 'sk.json'].every(name => files.includes(name)));
  assert.ok(files.every(name => !['he.json', 'iw.json', 'ar.json', 'en.json'].includes(name)));
  assert.ok(!languages.some(code => ['he', 'iw', 'en', 'ar'].includes(code)));
});

test('Current canonical families have translation or proposed contribution for all 18 target languages', () => {
  const allLanguages = ['es', 'fr', 'de', 'ru', 'pt', 'it', 'pl', 'nl', 'sv', 'el', 'cs', 'ro', 'hu', 'da', 'fi', 'no', 'sk', 'uk'];
  const baseLanguages = Object.keys(canonical);
  const schema = Object.create(null);
  for (const language of baseLanguages) {
    for (const [family, entries] of Object.entries(canonical[language])) {
      schema[family] ||= new Set();
      for (const key of Object.keys(entries)) schema[family].add(key);
    }
  }
  const contributions = Object.fromEntries(['el', 'sk'].map(lang => [lang, JSON.parse(fs.readFileSync(path.join(dir, lang + '.json'), 'utf8')).sections]));
  for (const lang of allLanguages) {
    assert.ok(canonical[lang], 'Canonical locale missing: ' + lang);
    const proposed = contributions[lang]?.timer || {};
    for (const family of ['timer', 'goals', 'tasks', 'notes', 'analytics', 'analyticsDomain']) {
      for (const key of schema[family]) {
        assert.ok(canonical[lang]?.[family]?.[key] || (family === 'timer' && proposed[key]), 'Missing ' + lang + '/' + family + '/' + key);
      }
    }
  }
});
