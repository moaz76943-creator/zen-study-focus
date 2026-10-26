'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const web = path.resolve(__dirname, '../android/app/src/main/assets/web');
const white = fs.readFileSync(path.join(web, 'white_2100.css'), 'utf8');
const html = fs.readFileSync(path.join(web, 'index.html'), 'utf8');
const scoped = white.split('/* DF-PARALLEL-09 mobile, RTL and text-zoom guard */')[1] || '';

test('seven existing destinations and fourth-slot central timer are kept', () => {
  const ids = ['navTasks','navCalendar','navNotes','navTimer','navTraining','navSounds','navAnalytics'];
  const located = ids.map(id => html.indexOf('id="' + id + '"'));
  assert.ok(located.every(n => n >= 0), 'all existing navigation IDs must remain');
  assert.ok(located.every((n,i) => i === 0 || n > located[i-1]), 'existing order retained');
  assert.match(white, /#navTimer\s*\{grid-column:4/);
  assert.match(white, /#navTraining\s*\{grid-column:5/);
});

test('320–430px narrow navigation shows only active/focused caption but retains other accessible text', () => {
  assert.match(scoped, /@media\s*\(max-width:\s*430px\)/);
  assert.match(scoped, /\.bottom-nav-capsule\s+\.bnav-btn\s*>\s*:is\(span\[data-i18n\],#navTrainingText\)/);
  assert.match(scoped, /clip-path:\s*inset\(50%\)/);
  assert.match(scoped, /\.bnav-btn:is\(\.active,:focus-visible\)/);
  assert.doesNotMatch(scoped, /display:\s*none|aria-hidden/i);
  assert.match(scoped, /min-block-size:\s*44px/);
});

test('200% text zoom keeps timer and duration controls inside the hero without clipping text', () => {
  assert.match(scoped, /\.focus-hero-card\s+\.ring-time\s*\{[^}]*font-size:\s*clamp\(1\.05rem,\s*9vw,\s*3rem\)/);
  assert.match(scoped, /\.focus-hero-card\s+\.time-delta-row\s*\{[^}]*flex-wrap:\s*wrap/);
  assert.match(scoped, /\.focus-hero-card\s+\.delta-chip\s*\{[^}]*min-block-size:\s*44px/);
  assert.match(scoped, /\.focus-hero-card\s+\.delta-chip\s*\{[^}]*overflow-wrap:\s*anywhere/);
});

test('white premium, Western numerals, RTL and offline fonts are not regressed by scoped CSS', () => {
  assert.match(white, /color:\s*#17274e/);
  assert.match(white, /font-variant-numeric:\s*tabular-nums/);
  assert.match(white, /html\[dir="rtl"\]/);
  assert.doesNotMatch(scoped, /@import|https?:\/\/|font-family|unicode-bidi:\s*normal/i);
  assert.match(html, /id="timerDigitsTxt"/);
});
