'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const SOURCE = path.join(__dirname, '../../android/app/src/main/assets/web/js/deep_focus_runtime_activator.js');

function boot(fields) {
  const callbacks = {};
  const document = {
    addEventListener(event, handler) { callbacks[event] = handler; },
    querySelectorAll(selector) {
      const tokens = selector.split(',').map(s => s.trim());
      return fields.filter(f => tokens.includes(f.selector));
    },
  };
  vm.runInNewContext(fs.readFileSync(SOURCE, 'utf8'), { document, console, Audio: class {} }, { filename: SOURCE });
  callbacks.DOMContentLoaded();
  return callbacks;
}

test('preserves user-authored Arabic-Indic digits in task and note text fields', () => {
  const task = { selector: 'input[type="text"]', value: 'مهمة ٢٠٢٦', textContent: '' };
  const note = { selector: 'textarea', value: 'ملاحظتي ۱۲۳ و٤٥٦', textContent: 'ملاحظتي ۱۲۳ و٤٥٦' };
  const callbacks = boot([task, note]);
  callbacks.input(); callbacks.change();
  assert.equal(task.value, 'مهمة ٢٠٢٦');
  assert.equal(note.value, 'ملاحظتي ۱۲۳ و٤٥٦');
  assert.equal(note.textContent, 'ملاحظتي ۱۲۳ و٤٥٦');
});

test('normalizes generated date UI digits to Western 0-9', () => {
  const date = { selector: 'input[type="date"]', value: '٢٠٢٦-١٠-٢٣', textContent: '' };
  const label = { selector: '.date-display', value: '', textContent: '۲۰۲۶/۱۰/۲۳' };
  const callbacks = boot([date, label]);
  callbacks.change();
  assert.equal(date.value, '2026-10-23');
  assert.equal(label.textContent, '2026/10/23');
});

test('does not alter Latin digits or arbitrary user text after repeated events', () => {
  const task = { selector: 'input[type="text"]', value: 'Project 123 / ٤', textContent: '' };
  const callbacks = boot([task]);
  for (let i = 0; i < 3; i++) { callbacks.input(); callbacks.change(); }
  assert.equal(task.value, 'Project 123 / ٤');
});


// The main app.js listener runs in addition to the Studio runtime listener.
// Protecting only the Studio selector is insufficient if this handler rewrites user text.
function bootAppDigitListener() {
  const appSource = fs.readFileSync(path.join(__dirname, '../../android/app/src/main/assets/web/app.js'), 'utf8');
  const begin = appSource.indexOf('const ARABIC_ZERO_OFFSET =');
  const end = appSource.indexOf('/* ========================================================', begin + 20);
  assert.ok(begin >= 0 && end > begin, 'app numeral handler must be located');
  const callbacks = {};
  vm.runInNewContext(appSource.slice(begin, end), {
    document: { addEventListener(event, callback) { callbacks[event] = callback; } }
  });
  assert.equal(typeof callbacks.input, 'function');
  return callbacks.input;
}

test('main app input handler preserves Arabic/Persian numerals in authored notes and tasks', () => {
  const onInput = bootAppDigitListener();
  const task = { tagName: 'INPUT', type: 'text', value: 'مهمة ٢٠٢٦' };
  const note = { tagName: 'TEXTAREA', value: 'ملاحظة ۱۲۳ و٤٥٦' };
  onInput({ target: task });
  onInput({ target: note });
  assert.equal(task.value, 'مهمة ٢٠٢٦');
  assert.equal(note.value, 'ملاحظة ۱۲۳ و٤٥٦');
});

test('main app input handler still converts generated date and number inputs to Western digits', () => {
  const onInput = bootAppDigitListener();
  const date = { tagName: 'INPUT', type: 'date', value: '٢٠٢٦-١٠-٢٣' };
  const count = { tagName: 'INPUT', type: 'number', value: '۱۲۳' };
  onInput({ target: date });
  onInput({ target: count });
  assert.equal(date.value, '2026-10-23');
  assert.equal(count.value, '123');
});
