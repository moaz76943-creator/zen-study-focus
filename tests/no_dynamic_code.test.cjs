'use strict';
// Shipped web code must not use dynamic code execution or document.write.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const web = path.resolve(__dirname, '../android/app/src/main/assets/web');
function walk(d, out = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, out); else if (p.endsWith('.js')) out.push(p);
  }
  return out;
}
test('no eval / new Function / document.write / string timers / window.open in shipped JS', () => {
  const bad = [];
  for (const f of walk(web)) {
    if (f.endsWith('room6/focus_lab_offline_contract.js')) continue; // only mentions document.write inside test strings; not loaded
    const src = fs.readFileSync(f, 'utf8');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const re of [/\beval\s*\(/, /\bnew Function\s*\(/, /document\.write(ln)?\s*\(/, /set(Timeout|Interval)\(\s*["'`]/, /window\.open\s*\(/]) {
      if (re.test(code)) bad.push(path.relative(web, f) + ' ~ ' + re);
    }
  }
  assert.deepEqual(bad, []);
});
