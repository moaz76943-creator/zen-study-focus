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
