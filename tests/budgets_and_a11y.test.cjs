'use strict';
// Ratchets: performance budgets can only go down; basic accessibility invariants must hold.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const web = path.resolve(__dirname, '../android/app/src/main/assets/web');
const html = fs.readFileSync(path.join(web, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(web, 'app.js'), 'utf8');
function stripTags(t) { let p; do { p = t; t = t.replace(/<[^<>]*>/g, ''); } while (t !== p); return t; }
function size(d) { let t = 0; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); t += e.isDirectory() ? size(p) : fs.statSync(p).size; } return t; }

test('performance budgets (lower them when you shrink, never raise)', () => {
  assert.ok((html.match(/<script[^>]+src=/g) || []).length <= 127, 'script tag count');
  assert.ok(size(web) <= 15.0e6, 'bundled web assets exceed 15 MB: ' + size(web));
  assert.ok((app.match(/setInterval\(/g) || []).length <= 24, 'setInterval count in app.js');
});

test('accessibility invariants in index.html', () => {
  assert.match(html, /<html[^>]*\blang="/);
  assert.match(html, /<html[^>]*\bdir="/);
  assert.match(html, /<meta name="viewport"[^>]*width=device-width/);
  assert.ok(!/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(\.0)?\b/.test(html), 'zoom must not be disabled');
  assert.deepEqual((html.match(/<img\b[^>]*>/g) || []).filter((t) => !/\balt=/.test(t)), [], 'img without alt');
  const unnamed = [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)]
    .filter((m) => !stripTags(m[2]).trim() && !/aria-label|title=/.test(m[1]));
  assert.equal(unnamed.length, 0, 'buttons without accessible name');
});

test('reduced-motion and keyboard focus styles exist', () => {
  const css = [];
  (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (p.endsWith('.css')) css.push(fs.readFileSync(p, 'utf8')); } })(web);
  const all = css.join('\n') + html;
  assert.match(all, /prefers-reduced-motion/);
  assert.match(all, /:focus-visible/);
});
