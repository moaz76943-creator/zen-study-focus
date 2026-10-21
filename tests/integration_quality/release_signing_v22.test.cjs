'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const gradle = fs.readFileSync(path.resolve(__dirname, '../../android/app/build.gradle'), 'utf8');

test('closed-testing candidate uses v22, keeps package identity and does not allow debugging', () => {
  assert.match(gradle, /applicationId\s+"com\.zenstudy\.focus"/);
  assert.match(gradle, /\bversionCode\s+22\b/);
  assert.match(gradle, /\bversionName\s+"22\.0\.0"/);
  assert.match(gradle, /release\s*\{[\s\S]*?\bdebuggable\s+false\b/);
});

test('release uses external upload key only, never debug key or committed credentials', () => {
  assert.match(gradle, /ZEN_UPLOAD_KEYSTORE_PATH/);
  assert.match(gradle, /ZEN_UPLOAD_STORE_PASSWORD/);
  assert.match(gradle, /ZEN_UPLOAD_KEY_ALIAS/);
  assert.match(gradle, /ZEN_UPLOAD_KEY_PASSWORD/);
  assert.match(gradle, /if\s*\(hasUploadSigning\)\s*signingConfig\s+signingConfigs\.upload/);
  assert.doesNotMatch(gradle, /signingConfig\s+signingConfigs\.debug/);
  assert.doesNotMatch(gradle, /storePassword\s+["']/);
  assert.doesNotMatch(gradle, /keyPassword\s+["']/);
});
