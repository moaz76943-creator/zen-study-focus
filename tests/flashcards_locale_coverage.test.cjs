'use strict';
// Localization coverage for the Flashcards UI. Translations must be REVIEWED by a person: this test never accepts
// guessed text. It lists, per supported app language, whether a complete Flashcards pack exists.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const web = path.resolve(__dirname, '../android/app/src/main/assets/web');
const ui = fs.readFileSync(path.join(web, 'modules/flashcards/flashcards_ui.js'), 'utf8');
const langs = fs.readdirSync(path.join(web, 'locales')).filter((f) => /^[a-z]{2}\.json$/.test(f)).map((f) => f.slice(0, 2)).sort();

function pack(code) {
  const m = ui.match(new RegExp('\\n    ' + code + ': \\{([\\s\\S]*?)\\n    \\}[,\\n]'));
  if (!m) return null;
  const keys = {}; const re = /(?:^|[\s,{])([A-Za-z_][A-Za-z0-9_]*): '((?:[^'\\]|\\.)*)'/g; let x;
  while ((x = re.exec(m[1]))) keys[x[1]] = x[2];
  return keys;
}
const en = pack('en');
const status = {};
for (const l of langs) {
  const p = l === 'en' ? en : pack(l);
  if (!p) { status[l] = 'MISSING_PACK'; continue; }
  const missing = Object.keys(en).filter((k) => !(k in p));
  const same = Object.keys(en).filter((k) => k in p && p[k] === en[k] && /[A-Za-z]{4,}/.test(en[k]) && l !== 'en' && !/^(CSV|JSON|TSV|Flashcards)/.test(en[k]));
  status[l] = missing.length ? 'INCOMPLETE(' + missing.length + ')' : (same.length > 8 ? 'ENGLISH_LEAK(' + same.length + ')' : 'COMPLETE');
}

test('app supports exactly the 20 locale files and none is Hebrew', () => {
  assert.equal(langs.length, 20, langs.join(','));
  assert.ok(!langs.includes('he') && !langs.includes('iw'));
});

test('every Flashcards pack that exists is complete and not an English copy', () => {
  const bad = Object.entries(status).filter(([, s]) => /^(INCOMPLETE|ENGLISH_LEAK)/.test(s));
  assert.deepEqual(bad, [], JSON.stringify(bad));
});

test('English and Arabic are complete; the remaining gap is stated explicitly (reviewed translations required)', () => {
  assert.equal(status.en, 'COMPLETE'); assert.equal(status.ar, 'COMPLETE');
  const gap = Object.entries(status).filter(([, s]) => s === 'MISSING_PACK').map(([l]) => l);
  // Pinned on purpose: when a reviewed pack is added, remove the language here; the list may never grow.
  const KNOWN_GAP = ['de', 'es', 'fa', 'fr', 'hi', 'id', 'it', 'ja', 'ko', 'nl', 'pl', 'pt', 'ro', 'ru', 'tr', 'ur', 'vi', 'zh'];
  const grew = gap.filter((l) => !KNOWN_GAP.includes(l));
  assert.deepEqual(grew, [], 'gap grew');
  console.log('# Flashcards localization coverage:', JSON.stringify(status));
});

test('Arabic pack uses Western digits and no Hebrew anywhere', () => {
  assert.ok(!/[֐-׿]/.test(ui)); assert.ok(!/[٠-٩۰-۹]/.test(ui));
});
