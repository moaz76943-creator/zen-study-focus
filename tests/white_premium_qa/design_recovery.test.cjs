'use strict';
/* DF-138..147 | node --test tests/white_premium_qa/*.test.cjs */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../android/app/src/main/assets/web');
const theme = () => fs.readFileSync(path.join(root, 'design_recovery/white_premium_recovery10.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const findRule = (source, needle) => assert.ok(source.includes(needle), 'Missing: ' + needle);

test('DF-138: uses v22 design tokens rather than replacing :root', () => {
  const css = theme();
  findRule(css, '.df-v22.df-recovery10');
  for (const token of ['--df22-surface','--df22-ink','--df22-muted','--df22-border','--df22-touch']) findRule(css, 'var(' + token);
  assert.doesNotMatch(css, /(^|\n)\s*:root\s*\{/);
});
test('DF-139: seven actual nav destinations retained, timer fourth, training fifth', () => {
  const nav = html.match(/<nav\s+class="bottom-nav-capsule"[^>]*>([\s\S]*?)<\/nav>/);
  assert.ok(nav, 'Existing bottom navigation required');
  const ids = [...nav[1].matchAll(/<button\b[^>]*\bid="(nav\w+)"/g)].map(x => x[1]);
  assert.deepEqual(ids, ['navTasks','navCalendar','navNotes','navTimer','navTraining','navSounds','navAnalytics']);
  const css = theme();
  findRule(css, 'grid-template-columns: repeat(7, minmax(0, 1fr))');
  findRule(css, '#navTimer');
  findRule(css, 'grid-column: 4');
  findRule(css, '#navTraining');
  findRule(css, 'grid-column: 5');
});
test('DF-140: real original focus and quick-training controls remain available', () => {
  for (const id of ['focusHeroCard','quickTrainingCard','homeQuick10','todayPlanPreview']) findRule(html, 'id="' + id + '"');
  const css = theme();
  assert.doesNotMatch(css, /(?:#sec-notes|#sec-tasks|#navNotes|#navTasks)[^{]*\{[^}]*display\s*:\s*none/s);
});
test('DF-141/143: narrow 320/360/393/430 rules plus keyboard-safe dialogs', () => {
  const css = theme();
  for (const w of ['340','360','393','430']) findRule(css, 'max-width: ' + w + 'px');
  findRule(css, '100dvh');
  findRule(css, 'overflow-y: auto');
  findRule(css, 'overflow-wrap: anywhere');
});
test('DF-142: direction-safe spacing, safe areas and numeric isolation', () => {
  const css = theme();
  for (const s of ['padding-inline','inset-inline','env(safe-area-inset-bottom)','html[dir="rtl"]','unicode-bidi: isolate','direction: ltr']) findRule(css,s);
  assert.doesNotMatch(css, /\bdirection:\s*rtl\s*!important/);
});
test('DF-144/147: focus, target, TalkBack-friendly visibility and reduced motion', () => {
  const css = theme();
  for (const s of ['min-height: 44px',':focus-visible','prefers-reduced-motion: reduce','prefers-contrast: more']) findRule(css, s);
  assert.doesNotMatch(css, /animation:\s*[^;{}]*infinite/i);
  assert.doesNotMatch(css, /backdrop-filter:\s*blur\(/);
});
test('DF-145/146: consistent explicit state surfaces, no fake success semantics', () => {
  const css = theme();
  for (const s of ['data-state="success"','data-state="error"','data-state="loading"','data-state="empty"','--dfr-gradient']) findRule(css,s);
  assert.doesNotMatch(css, /localStorage|ZEN21::|zen_fortress_cfg_v21|@import\s+url\(/);
});
