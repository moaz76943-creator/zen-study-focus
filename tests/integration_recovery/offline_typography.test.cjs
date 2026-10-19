'use strict';
// DF-153: Offline-first typography regression (source-level, no device claim).
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');

const web = join(__dirname, '../../android/app/src/main/assets/web');
const read = name => readFileSync(join(web, name), 'utf8');

test('offline entrypoint makes no third-party font requests', () => {
  const html = read('index.html');
  const head = html.split('</head>')[0];
  assert.doesNotMatch(head, /<link[^>]*https?:\\/\\//i,
    'No network preconnect or stylesheet should be needed to render offline');
  assert.doesNotMatch(head, /@import\\s+url\\s*\\(\\s*['"]?https?:\\/\\//i);
  assert.doesNotMatch(head, /fonts\\.(?:googleapis|gstatic)\\.com/i);
  assert.match(head, /font-family:\\s*system-ui/);
});

test('white-premium theme uses locally available system font fallbacks', () => {
  const tokens = read('design_tokens_v22.css');
  const overlay = read('design_recovery/white_premium_recovery10.css');
  assert.match(tokens, /--df22-font:\\s*system-ui/);
  assert.match(overlay, /font-family:\\s*var\\(--df22-font,\\s*system-ui/);
  assert.doesNotMatch(tokens + overlay, /@import\\s+[^;]*https?:/i);
});

test('CSS still defines a script-safe Arabic fallback without remote dependency', () => {
  const html = read('index.html');
  const tokens = read('design_tokens_v22.css');
  assert.match(html, /Noto Sans Arabic/);
  assert.match(tokens, /Noto Sans Arabic/);
  assert.doesNotMatch(html, /https:\\/\\/fonts\\.googleapis\\.com/i);
});
