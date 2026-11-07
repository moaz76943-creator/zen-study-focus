'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const app = fs.readFileSync('android/app/src/main/assets/web/app.js', 'utf8');

const catalogBegin = app.indexOf('const LANG_CATALOG = [');
const catalogEnd = app.indexOf('const DICT = {');
const catalogCode = app.slice(catalogBegin, catalogEnd);

const funcBegin = app.indexOf('function renderLanguageList()');
let funcEnd = funcBegin;
let braces = 0;
while (funcEnd < app.length) {
  if (app[funcEnd] === '{') braces++;
  if (app[funcEnd] === '}') {
    braces--;
    if (braces === 0) {
      funcEnd++;
      break;
    }
  }
  funcEnd++;
}
const renderFuncCode = app.slice(funcBegin, funcEnd);

function setupContext() {
  const elements = new Map();
  let appliedLanguage = null;

  function getElement(id) {
    if (!elements.has(id)) {
      const el = {
        id,
        value: '',
        children: [],
        replaceChildren() {
          this.children = [];
        },
        appendChild(child) {
          this.children.push(child);
        }
      };
      // Explicitly define innerHTML to work with older tests,
      // but standard replaceChildren is heavily used by app.js here.
      Object.defineProperty(el, 'innerHTML', {
        set(val) {
          if (val === '') this.children = [];
        },
        get() {
          return '';
        }
      });
      elements.set(id, el);
    }
    return elements.get(id);
  }

  const document = {
    getElementById: getElement,
    createElement(tag) {
      const el = {
        tag,
        className: '',
        textContent: '',
        type: '',
        style: { cssText: '' },
        attributes: {},
        children: [],
        setAttribute(k, v) { this.attributes[k] = v; },
        appendChild(child) { this.children.push(child); }
      };
      return el;
    }
  };

  const context = {
    cfg: { lang: 'en' },
    document,
    String: String,
    applyLanguage: (code) => { appliedLanguage = code; },
    get appliedLanguage() { return appliedLanguage; }
  };

  vm.createContext(context);
  vm.runInContext(catalogCode, context);
  vm.runInContext(renderFuncCode, context);

  return { context, getElement };
}

test('renderLanguageList renders all languages when search is empty', () => {
  const { context, getElement } = setupContext();

  vm.runInContext('renderLanguageList()', context);

  const box = getElement('langListScrollBox');
  const catalogLength = vm.runInContext('LANG_CATALOG.length', context);

  assert.equal(box.children.length, catalogLength);

  // Verify structure of the first item
  const firstRow = box.children[0];
  assert.equal(firstRow.tag, 'button');
  assert.equal(firstRow.type, 'button');
  assert.ok(firstRow.className.includes('lang-row-btn'));
  assert.equal(firstRow.children.length, 3); // icon, names, mark
});

test('renderLanguageList highlights the active language correctly', () => {
  const { context, getElement } = setupContext();
  context.cfg.lang = 'fr';

  vm.runInContext('renderLanguageList()', context);

  const box = getElement('langListScrollBox');
  const frRow = box.children.find(row =>
    row.children[0].textContent === 'FR' // icon iso
  );

  assert.ok(frRow);
  assert.ok(frRow.className.includes('active'));
  assert.equal(frRow.attributes['aria-pressed'], 'true');
  assert.equal(frRow.children[2].textContent, '✓');
});

test('renderLanguageList filters by english name, native name, iso, and countries', () => {
  const { context, getElement } = setupContext();
  const searchInput = getElement('inpLangCountrySearch');
  const box = getElement('langListScrollBox');

  // Test English name (e.g., 'French')
  searchInput.value = 'French';
  vm.runInContext('renderLanguageList()', context);
  assert.ok(box.children.length > 0);
  assert.ok(box.children.some(row => row.children[1].children[0].textContent.includes('French')));
  assert.equal(box.children.length, 1);

  // Test Native name (e.g., 'Français')
  searchInput.value = 'Français';
  vm.runInContext('renderLanguageList()', context);
  assert.ok(box.children.length > 0);
  assert.ok(box.children.some(row => row.children[1].children[1].textContent.includes('Français')));
  assert.equal(box.children.length, 1);

  // Test ISO code (e.g., 'RU')
  searchInput.value = 'ru';
  vm.runInContext('renderLanguageList()', context);
  assert.ok(box.children.length > 0);
  assert.ok(box.children.some(row => row.children[0].textContent === 'RU'));
  // Note: we can't reliably assume length is 1 for 'ru', as there could be other matches.
  // Let's test a very specific country

  searchInput.value = 'Germany';
  vm.runInContext('renderLanguageList()', context);
  assert.ok(box.children.length > 0);
  assert.equal(box.children.length, 1); // Should just be German
});

test('renderLanguageList assigns correct click handler to apply language', () => {
  const { context, getElement } = setupContext();

  vm.runInContext('renderLanguageList()', context);

  const box = getElement('langListScrollBox');
  const firstRow = box.children[0];

  // Call the click handler
  firstRow.onclick();

  // Verify applyLanguage was called with the correct code
  const firstLangCode = vm.runInContext('LANG_CATALOG[0].code', context);
  assert.equal(context.appliedLanguage, firstLangCode);
});
