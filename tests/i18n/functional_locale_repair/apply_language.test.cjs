'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const appFile = path.resolve(__dirname, '../../../android/app/src/main/assets/web/app.js');
const app = fs.readFileSync(appFile, 'utf8');
const begin = app.indexOf('function applyLanguage(code)');
const end = app.indexOf('/* ========================================================', begin);
const catalog = app.slice(app.indexOf('const LANG_CATALOG = ['), app.indexOf('const DICT = {'));

function fixture(save = () => true) {
  const button = { attributes: {}, setAttribute(k, v) { this.attributes[k] = v; } };
  const nodes = new Map();
  const get = id => {
    if (!nodes.has(id)) nodes.set(id, { textContent: '', attributes: {}, setAttribute(k, v) { this.attributes[k] = v; }, getAttribute(k) { return this.attributes[k]; } });
    return nodes.get(id);
  };
  get('currentLangLabel').parentElement = button;
  const context = {
    cfg: { lang: 'en' },
    document: {
      getElementById: get,
      querySelectorAll: () => []
    },
    window: {},
    saveFortressData: (key, cfg) => {
      context.cfg = cfg;
      save(key, cfg);
    },
    L: () => ({ sub: 'Localized subtitle' }),
    localizeStarterPreviews() {},
    renderAnalyticsBars() {},
    syncHeaderMetrics() {},
    updateTimerDisplay() {},
    renderTasksList() {},
    renderCalendar() {},
    renderNotesStack() {},
    renderSoundsStudio() {},
    updateSyllabusCalc() {},
    closeModal() {},
    quickL10n() {},
    shellLabel: (code, key, def) => def
  };
  vm.createContext(context);
  vm.runInContext(catalog + '\n' + app.slice(begin, end), context);
  return { context, button, get, apply: code => vm.runInContext('applyLanguage(' + JSON.stringify(code) + ')', context) };
}

test('applyLanguage handles normal language change correctly', () => {
  const f = fixture();
  f.apply('fr');
  assert.equal(f.context.cfg.lang, 'fr');
  const root = f.get('htmlRoot');
  assert.equal(root.attributes['lang'], 'fr');
  assert.equal(root.attributes['dir'], 'ltr');
  assert.equal(f.get('currentLangIso').textContent, 'FR');
});

test('applyLanguage falls back to en for null, undefined, or missing codes', () => {
  const f = fixture();
  f.apply(null);
  assert.equal(f.context.cfg.lang, 'en');

  f.apply(undefined);
  assert.equal(f.context.cfg.lang, 'en');

  f.apply('xyz');
  assert.equal(f.context.cfg.lang, 'en');
});

test('applyLanguage handles regional variants correctly', () => {
  const f = fixture();
  f.apply('de-CH');
  assert.equal(f.context.cfg.lang, 'de');

  f.apply('en_US');
  assert.equal(f.context.cfg.lang, 'en');
});

test('applyLanguage skips Hebrew ("he" and "iw") mapping to "en"', () => {
  const f = fixture();
  f.apply('he');
  assert.equal(f.context.cfg.lang, 'en');

  f.apply('iw');
  assert.equal(f.context.cfg.lang, 'en');
});
