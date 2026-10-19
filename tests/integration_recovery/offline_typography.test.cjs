'use strict';
// DF-153: Offline-first typography regression (source-level; Android device remains untested).
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const web = join(__dirname, '../../android/app/src/main/assets/web');
const read = name => readFileSync(join(web, name), 'utf8');

test('offline entrypoint never requests third-party font stylesheets', () => {
  const head = read('index.html').split('</head>')[0];
  assert.equal(head.includes('fonts.googleapis.com'), false);
  assert.equal(head.includes('fonts.gstatic.com'), false);
  assert.equal(/<link[^>]*https?:/i.test(head), false);
  assert.equal(/@import[^;]*https?:/i.test(head), false);
  assert.ok(head.includes('font-family: system-ui'));
});

test('white premium typography uses a local system font stack', () => {
  const tokens = read('design_tokens_v22.css');
  const overlay = read('design_recovery/white_premium_recovery10.css');
  assert.ok(tokens.includes('--df22-font: system-ui'));
  assert.ok(overlay.includes('font-family: var(--df22-font, system-ui'));
  assert.equal(/@import[^;]*https?:/i.test(tokens + overlay), false);
});

test('Arabic text remains supported with offline system fallback fonts', () => {
  const html = read('index.html');
  const tokens = read('design_tokens_v22.css');
  assert.ok(html.includes('Noto Sans Arabic'));
  assert.ok(tokens.includes('Noto Sans Arabic'));
  assert.equal(html.includes('https://fonts.googleapis.com'), false);
});
