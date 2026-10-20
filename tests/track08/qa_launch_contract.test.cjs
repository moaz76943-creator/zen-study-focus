'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const main = fs.readFileSync(
  path.resolve(__dirname, '../../android/app/src/main/java/com/zenstudy/focus/MainActivity.java'), 'utf8'
);
const guardStart = main.indexOf('WebView.setWebContentsDebuggingEnabled(debuggableBuild);');
const webViewStart = main.indexOf('webView = new WebView(this);', guardStart);
const guard = main.slice(guardStart, webViewStart);

test('QA app may open bundled WebView only for the exact QA package AND a debuggable APK', () => {
  assert.ok(guardStart >= 0 && webViewStart > guardStart);
  assert.match(guard, /"com\.zenstudy\.focus"\.equals\(getPackageName\(\)\)/);
  assert.match(guard, /debuggableBuild\s*&&\s*"com\.zenstudy\.focus\.qa"\.equals\(getPackageName\(\)\)/);
  assert.match(guard, /finish\(\);[\s\S]*?return;/);
  assert.doesNotMatch(guard, /BuildConfig\.DEBUG/);
});

test('no arbitrary package ID is accepted by runtime identity gate', () => {
  assert.equal((guard.match(/\.equals\(getPackageName\(\)\)/g)||[]).length, 2);
  assert.ok(guard.indexOf('finish()') < guard.indexOf('webView = new WebView'));
});

test('QA identity and Debug build must remain temporary — never alter production Gradle', () => {
  const gradle = fs.readFileSync(path.resolve(__dirname, '../../android/app/build.gradle'), 'utf8');
  assert.match(gradle, /applicationIdSuffix\s+['"]\.qa['"]/);
  assert.match(gradle, /versionNameSuffix\s+['"]-qa['"]/);
});
