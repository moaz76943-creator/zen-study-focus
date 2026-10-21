'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const gradle = fs.readFileSync(path.resolve(__dirname, '../../android/app/build.gradle'), 'utf8');

test('Track18 v22 review keeps application identity, uses versionCode 22, and disables release debug', () => {
  assert.match(gradle, /applicationId\s+"com\.zenstudy\.focus"/);
  assert.match(gradle, /\bversionCode\s+22\b/);
  assert.match(gradle, /\bversionName\s+"22\.0\.0"/);
  assert.match(gradle, /release\s*\{[\s\S]*?\bdebuggable\s+false\b/);
});

test('Track18 upload signing is opt-in using environment only, never a debug or hard-coded key', () => {
  for (const name of ['ZEN_UPLOAD_KEYSTORE_PATH', 'ZEN_UPLOAD_STORE_PASSWORD', 'ZEN_UPLOAD_KEY_ALIAS', 'ZEN_UPLOAD_KEY_PASSWORD']) {
    assert.ok(gradle.includes(name), name);
  }
  assert.match(gradle, /if\s*\(hasUploadSigning\)\s*signingConfig\s+signingConfigs\.upload/);
  assert.doesNotMatch(gradle, /signingConfig\s+signingConfigs\.debug/);
  assert.doesNotMatch(gradle, /storePassword\s+["']/);
  assert.doesNotMatch(gradle, /keyPassword\s+["']/);
});

test('Track18 debug upload is never enabled by v22 preparation', () => {
  assert.doesNotMatch(gradle, /applicationId\s+["'](?!com\.zenstudy\.focus)[^"']+["']/);
});
