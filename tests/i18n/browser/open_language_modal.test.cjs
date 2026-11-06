'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../../..');
const app = fs.readFileSync(path.join(root, 'android/app/src/main/assets/web/app.js'), 'utf8');

const begin = app.indexOf('function openLanguageModal() {');
const end = app.indexOf('}', begin) + 1;
assert.ok(begin > 0 && end > begin, 'stable source boundary required');

const funcCode = app.slice(begin, end);

test('openLanguageModal clears search input, calls renderLanguageList, and opens modal', () => {
  let renderCalled = false;
  const classList = {
    added: '',
    add: (cls) => { classList.added = cls; }
  };

  const nodes = {
    inpLangCountrySearch: { value: 'some old search query' },
    langModal: { classList }
  };

  const context = {
    document: {
      getElementById: id => nodes[id]
    },
    renderLanguageList: () => {
      renderCalled = true;
    }
  };

  vm.runInNewContext(funcCode + '\nopenLanguageModal();', context, { timeout: 1000 });

  assert.equal(nodes.inpLangCountrySearch.value, '', 'Search input should be cleared');
  assert.equal(renderCalled, true, 'renderLanguageList should be called');
  assert.equal(classList.added, 'open', 'langModal should have "open" class added');
});
