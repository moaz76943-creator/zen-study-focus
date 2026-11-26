'use strict';
// RTL alignment & duplicate-label bugs — cross-file scan.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repo = path.resolve(__dirname, '../..');
const web = path.join(repo, 'android/app/src/main/assets/web');
const readRepo = (p) => fs.readFileSync(path.join(repo, p), 'utf8');
const readWeb = (p) => fs.readFileSync(path.join(web, p), 'utf8');

const reg = JSON.parse(readRepo('i18n/languages.json'));
const VARIANTS = reg.variants || {};
const official = reg.languages;
const catalogOf = (l) => l.catalogCode || VARIANTS[l.code] || l.code;

const STATUSES = ['source', 'human-reviewed', 'native-speaker-reviewed', 'expert-reviewed', 'ai-pending-review', 'machine-unverified'];
const HEBREW = /[\u0590-\u05FF]/;

const appSource = readWeb('app.js');
const dupLabelPattern = 'labelEn.toLowerCase() === labelNative.toLowerCase()';
const dupNativePattern = 'String(l.enName).trim().toLowerCase() === String(l.nativeName).trim().toLowerCase()';

test('language button label dedupe pattern is present in app source', () => {
  assert.ok(appSource.includes(dupLabelPattern), 'language button label dedupe pattern missing from app.js');
});

test('picker row duplicate-line hide pattern is present in app source', () => {
  assert.ok(appSource.includes(dupNativePattern), 'picker row duplicate-line hide pattern missing from app.js');
});

test('jv catalog code resolves to jw variant in registry mapping', () => {
  assert.strictEqual(catalogOf(official.find((l) => l.code === 'jv')), 'jw');
});

test('every shipped pack has a valid status', () => {
  const packsDir = path.join(repo, 'i18n/packs');
  const files = fs.readdirSync(packsDir).filter((x) => x.endsWith('.json'));
  assert.ok(files.length >= 100, 'expected at least 100 pack files, got ' + files.length);
  for (const f of files) {
    const pack = JSON.parse(fs.readFileSync(path.join(packsDir, f), 'utf8'));
    assert.ok(STATUSES.includes(pack.status), f + ' has invalid status ' + pack.status);
  }
});

test('no Hebrew script leaks into shipped localization sources', () => {
  const shippedFiles = [
    'app.js', 'quick_training.js', 'i18n_ui_catalog.js',
    'js/global_i18n_registry.js', 'js/df99_reviewed_packs.js',
    'js/localization_fallback_guard.js', 'locales/ui/_keys.js',
  ];
  for (const f of shippedFiles) {
    assert.ok(!HEBREW.test(readWeb(f)), 'Hebrew script in ' + f);
  }
});
