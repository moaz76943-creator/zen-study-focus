'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const project = path.resolve(__dirname, '..');

test('Google Play v3.4.0 replacement upload uses unused candidate versionCode 24', () => {
  const gradle = fs.readFileSync(path.join(project, 'android/app/build.gradle'), 'utf8');
  assert.match(gradle, /applicationId\s+"com\.deepfocus\.study"/);
  assert.match(gradle, /\bversionCode\s+24\b/);
  assert.match(gradle, /\bversionName\s+"3\.4\.0"/);
  assert.match(gradle, /\btargetSdk\s+36\b/);
});

test('Google Play replacement release never requests foreground service permission', () => {
  const manifest = fs.readFileSync(path.join(project, 'android/app/src/main/AndroidManifest.xml'), 'utf8');
  assert.doesNotMatch(manifest, /FOREGROUND_SERVICE|foregroundServiceType|<service\b/);
});
