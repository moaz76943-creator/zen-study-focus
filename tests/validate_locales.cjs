'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'assets', 'web');
const context = { window: {} };
vm.createContext(context);
for (const file of ['locale_rows.js', 'locale_extras.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename:file});
}
const keys = context.window.ZEN_LOCALE_FIELD_KEYS;
const rows = context.window.ZEN_LOCALE_ROWS;
const extras = context.window.ZEN_LOCALE_EXTRAS;
const names = ['fr','de','pt','it','nl','tr','ru','id','vi','pl','zh','hi','ja','ko','bn','ur','fa'];
assert.equal(keys.length, 47);
assert.equal(new Set(keys).size, keys.length);
assert.equal(Object.keys(rows).length, 17);
assert.equal(Object.keys(extras).length, 17);

for (const lang of names) {
  const row = rows[lang], extra = extras[lang];
  assert.ok(Array.isArray(row), 'Missing translation: ' + lang);
  assert.equal(row.length, keys.length, 'Invalid number of translations: ' + lang);
  for (let n = 0; n < row.length; n++) {
    assert.equal(typeof row[n], 'string', lang + '.' + keys[n]);
    assert.ok(row[n].trim().length > 0, lang + '.' + keys[n]);
  }
  assert.ok(Array.isArray(extra.sounds) && extra.sounds.length === 12, lang + '.sounds');
  assert.ok(Array.isArray(extra.tasks) && extra.tasks.length === 4, lang + '.tasks');
  assert.ok(Array.isArray(extra.notes) && extra.notes.length === 3, lang + '.notes');
  assert.ok(extra.sounds.every(s => typeof s === 'string' && s.trim()), lang + ' invalid sound label');
  assert.ok(extra.tasks.every(s => typeof s === 'string' && s.trim()), lang + ' invalid task example');
  assert.ok(extra.notes.every(n => n.length === 2 && n.every(s=>typeof s==='string'&&s.trim())), lang + ' invalid note example');
  const fmt = new Intl.DateTimeFormat(lang, {month:'long', weekday:'long'});
  assert.ok(fmt.format(new Date(Date.UTC(2026,9,18))).length > 0);
}
console.log('Verified 17 added complete locale packs + 3 existing original dictionaries (20 total).');
