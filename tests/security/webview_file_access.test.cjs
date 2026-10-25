'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const java = fs.readFileSync(
  path.resolve(__dirname, '../../android/app/src/main/java/com/zenstudy/focus/MainActivity.java'),
  'utf8'
);

test('v21 WebView cannot read arbitrary local files', () => {
  assert.match(java, /settings\.setAllowFileAccess\(false\);/);
  assert.doesNotMatch(java, /settings\.setAllowFileAccess\(true\);/);
  assert.match(java, /settings\.setAllowFileAccessFromFileURLs\(false\);/);
  assert.match(java, /settings\.setAllowUniversalAccessFromFileURLs\(false\);/);
  assert.match(java, /settings\.setAllowContentAccess\(false\);/);
});

test('bundled WebView app asset entry point is unchanged', () => {
  assert.match(java, /webView\.loadUrl\("file:\/\/\/android_asset\/web\/index\.html"\);/);
});
