'use strict';
// Guards against UI source text that repeats a phrase back to back
// (it happened once: "Scientific academic & Diagram Occlusion Diagram Occlusion").
const test = require('node:test'); const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path');
const repo = path.resolve(__dirname, '../..');
const src = JSON.parse(fs.readFileSync(path.join(repo, 'i18n/source_en.json'), 'utf8'));

function repeatedPhrase(text) {
  const w = text.split(/\s+/).filter(Boolean);
  for (let n = 2; n <= Math.floor(w.length / 2); n++)
    for (let i = 0; i + 2 * n <= w.length; i++)
      if (w.slice(i, i + n).join(' ').toLowerCase() === w.slice(i + n, i + 2 * n).join(' ').toLowerCase()) return w.slice(i, i + n).join(' ');
  return null;
}

test('detector catches the historical duplicate', () => {
  assert.equal(repeatedPhrase('🩺 Scientific academic & Diagram Occlusion Diagram Occlusion'), 'Diagram Occlusion');
  assert.equal(repeatedPhrase('🩺 Scientific & Academic Diagram Occlusion'), null);
});

test('no English source string repeats a multi-word phrase back to back', () => {
  const bad = Object.keys(src).map((k) => [k, repeatedPhrase(k)]).filter(([, r]) => r);
  assert.deepEqual(bad, []);
});

test('the whiteboard occlusion tab label is the corrected text', () => {
  const app = fs.readFileSync(path.join(repo, 'android/app/src/main/assets/web/app.js'), 'utf8');
  assert.ok(!app.includes('Diagram Occlusion Diagram Occlusion'));
  assert.ok(app.includes("label: '🩺 Scientific & Academic Diagram Occlusion'"));
});
