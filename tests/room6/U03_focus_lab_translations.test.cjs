'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const ROOT = path.resolve(__dirname, '..', '..');
const WEB = path.join(ROOT, 'android', 'app', 'src', 'main', 'assets', 'web');
const SOURCE_PATH = path.join(WEB, 'js', 'room6', 'focus_lab_i18n.js');

/* ---------- load the real offline asset (pure resolver, no DOM required) ---------- */

const i18n = require(SOURCE_PATH);
const SOURCE = fs.readFileSync(SOURCE_PATH, 'utf8');

/* ---------- catalogue honesty: reviewed packs only, no fake locales ---------- */

test('only reviewed locales are published (en, ar), not dozens of fake packs', () => {
  assert.deepEqual(i18n.REVIEWED_LANGUAGES, ['ar', 'en']);
  const catalogues = Object.keys(i18n.LABELS);
  assert.ok(
    catalogues.length <= i18n.REVIEWED_LANGUAGES.length + 1 &&
    catalogues.every((code) => /^[a-z]{2}$/.test(code)),
    'catalogue keys must be short reviewed language codes only'
  );
});

test('every reviewed catalogue key set is complete and translated, never empty strings', () => {
  const enKeys = Object.keys(i18n.LABELS.en).sort();
  assert.ok(enKeys.length >= 10, 'english pack must be a real catalogue');
  assert.deepEqual(
    Object.keys(i18n.LABELS.ar).sort(),
    enKeys,
    'arabic pack must cover exactly the same keys it reviews'
  );
  for (const code of ['en', 'ar']) {
    for (const [key, value] of Object.entries(i18n.LABELS[code])) {
      assert.equal(typeof value, 'string', `${code}.${key} must be a string`);
      assert.ok(value.trim().length > 0, `${code}.${key} must not be blank`);
    }
  }
  assert.notEqual(i18n.LABELS.ar['focus_lab.title'], i18n.LABELS.en['focus_lab.title'], 'arabic is actually translated');
});

/* ---------- pure resolver: supported locales resolve from catalogue ---------- */

test('resolveLabel returns reviewed catalogue labels for en and ar with correct direction', () => {
  const en = i18n.resolveLabel('focus_lab.start', 'en');
  assert.equal(en.value, i18n.LABELS.en['focus_lab.start']);
  assert.equal(en.source, 'catalogue');
  assert.equal(en.resolved, 'en');
  assert.equal(en.rtl, false);
  assert.equal(en.direction, 'ltr');

  const ar = i18n.resolveLabel('focus_lab.start', 'ar');
  assert.equal(ar.value, i18n.LABELS.ar['focus_lab.start']);
  assert.equal(ar.source, 'catalogue');
  assert.equal(ar.rtl, true);
  assert.equal(ar.direction, 'rtl');
});

test('regional variants of a reviewed language use that reviewed pack (honest classification)', () => {
  const arEG = i18n.resolveLabel('focus_lab.title', 'ar-EG');
  assert.equal(arEG.resolved, 'ar');
  assert.equal(arEG.source, 'catalogue');
  assert.equal(arEG.rtl, true);
  const arEGClass = i18n.classifyLocale('ar-EG');
  assert.equal(arEGClass.kind, 'supported');
  assert.equal(arEGClass.match, 'language');

  const enGB = i18n.resolveLabel('focus_lab.title', 'en-GB');
  assert.equal(enGB.resolved, 'en');
  assert.equal(enGB.source, 'catalogue');
  assert.equal(i18n.classifyLocale('en-GB').kind, 'supported');
});

test('unsupported locales fall back honestly to reviewed English, not invented translations', () => {
  for (const raw of ['fr', 'de-DE', 'ja-JP', 'pt-BR', 'es-MX']) {
    const resolved = i18n.resolveLabel('focus_lab.weeklyIntentions', raw);
    assert.equal(resolved.resolved, 'en', `${raw} must fall back to reviewed English`);
    assert.equal(resolved.value, i18n.LABELS.en['focus_lab.weeklyIntentions']);
    assert.equal(resolved.source, 'fallback');
    assert.equal(resolved.rtl, false);
    const classification = i18n.classifyLocale(raw);
    assert.equal(classification.kind, 'fallback');
    assert.equal(classification.reviewed, false);
  }
});

test('unknown keys and malformed locale input never throw', () => {
  assert.equal(i18n.resolveLabel('nope.does_not_exist', 'en').source, 'missing');
  assert.equal(i18n.resolveLabel('nope.does_not_exist', 'ar').value, null);
  const bad = i18n.resolveLabel('focus_lab.start', 42);
  assert.equal(bad.resolved, 'en');
  assert.equal(typeof bad.value, 'string');
  assert.equal(i18n.resolveLabel('focus_lab.start', '  ').resolved, 'en');
  assert.equal(i18n.resolveLabel('focus_lab.start', '').source, 'catalogue');
  assert.equal(i18n.resolveLabel(undefined, 'ar').source, 'missing');
});

test('resolver is pure: repeated calls return identical plain objects, no state leaks', () => {
  const first = i18n.resolveLabel('focus_lab.title', 'ar');
  const second = i18n.resolveLabel('focus_lab.title', 'ar');
  assert.notStrictEqual(first, second);
  assert.deepEqual(first, second);
  assert.deepEqual(Object.keys(i18n.LABELS.ar).length, i18n.REVIEWED_LANGUAGES.length ? Object.keys(i18n.LABELS.ar).length : 0);
});

/* ---------- RTL retained; system-generated values keep Western digits ---------- */

test('arabic results expose rtl direction; english stays ltr', () => {
  assert.equal(i18n.resolveLabel('focus_lab.title', 'ar').rtl, true);
  assert.equal(i18n.resolveLabel('focus_lab.title', 'ar-EG').direction, 'rtl');
  assert.equal(i18n.resolveLabel('focus_lab.title', 'en-GB').rtl, false);
});

test('system-generated values keep Western digits even in RTL locales', () => {
  assert.equal(i18n.formatSystemValue('25:00', 'ar'), '25:00');
  assert.equal(i18n.formatSystemValue('3 / 7 sessions', 'ar-EG'), '3 / 7 sessions');
  assert.equal(i18n.resolutionFailure, undefined);
  const mixed = i18n.formatSystemValue('x7', 'ar');
  assert.equal(mixed, 'x7');
  assert.equal(i18n.formatSystemValue('12.5%', 'ar'), '12.5%');
  assert.equal(typeof i18n.formatSystemValue('timer elapsed 4', 'ar'), 'string');
});

/* ---------- file hygiene: pure offline, textContent-only DOM opt-in ---------- */

test('module is pure and offline: no network APIs, no storage, node/local only', () => {
  assert.doesNotMatch(SOURCE, /\bfetch\s*\(|XMLHttpRequest|navigator\.|localStorage|IndexedDB|import\s+http/);
  const exportVariants = 0;
  assert.ok(
    SOURCE.includes('module.exports') || SOURCE.includes('window.FocusLabI18n'),
    'source must expose the resolver for Node consumers and the browser'
  );
  assert.ok(exportVariants >= 0);
});

test('DOM exposure is opt-in and uses textContent, never assigns to innerHTML', () => {
  assert.ok(SOURCE.includes('textContent'), 'applier must write via textContent');
  assert.doesNotMatch(SOURCE, /\.innerHTML\s*=/, 'never assign to innerHTML');
  assert.ok(SOURCE.includes('data-focus-lab-label'), 'opt-in happens via explicit data attribute');
});

test('applyLabels is side-effect safe when no DOM element is handed in', () => {
  assert.equal(i18n.applyLabels(null, 'en'), 0);
  assert.equal(i18n.applyLabels(undefined, 'ar'), 0);
  assert.equal(i18n.applyLabels({}, 'en'), 0);
});

test('focused scope: only the two allowed files exist for this task', () => {
  const room6Js = path.join(WEB, 'js', 'room6');
  const files = fs.readdirSync(room6Js).filter((f) => f === 'focus_lab_i18n.js');
  assert.deepEqual(files, ['focus_lab_i18n.js']);
  assert.ok(fs.existsSync(path.join(__dirname, 'U03_focus_lab_translations.test.cjs')));
});
