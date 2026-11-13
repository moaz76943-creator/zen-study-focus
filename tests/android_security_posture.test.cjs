'use strict';
// Locks the Android/WebView security posture so a future edit cannot silently weaken it.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const r = (p) => fs.readFileSync(path.resolve(__dirname, '..', p), 'utf8');
const manifest = r('android/app/src/main/AndroidManifest.xml');
const main = r('android/app/src/main/java/com/zenstudy/focus/MainActivity.java');

test('manifest: no network/microphone/location/storage permissions, no backup, no cleartext', () => {
  const perms = [...manifest.matchAll(/uses-permission[^>]*android:name="([^"]+)"/g)].map((m) => m[1]);
  const allowed = ['android.permission.VIBRATE', 'android.permission.POST_NOTIFICATIONS', 'android.permission.RECEIVE_BOOT_COMPLETED'];
  assert.deepEqual(perms.filter((p) => !allowed.includes(p)), [], 'unexpected permissions');
  assert.match(manifest, /android:allowBackup="false"/);
  assert.match(manifest, /android:usesCleartextTraffic="false"/);
});

test('manifest: only the launcher activity is exported; receivers/services are not', () => {
  for (const m of manifest.matchAll(/<(receiver|service|provider)\b[\s\S]*?android:exported="(\w+)"/g)) {
    assert.equal(m[2], 'false', m[1] + ' must not be exported');
  }
  assert.ok(!/<service\b/.test(manifest), 'no services (no foreground-service declaration)');
  const exportedActivities = [...manifest.matchAll(/<activity\b[^>]*android:exported="true"/g)].length;
  assert.equal(exportedActivities, 1);
});

test('WebView: hardened settings, no debugging, blocked network sub-resources, bridge only for bundled assets', () => {
  for (const s of ['setWebContentsDebuggingEnabled(false)', 'setAllowFileAccessFromFileURLs(false)',
    'setAllowUniversalAccessFromFileURLs(false)', 'MIXED_CONTENT_NEVER_ALLOW', 'setAllowContentAccess(false)',
    'setJavaScriptCanOpenWindowsAutomatically(false)']) {
    assert.ok(main.includes(s), 'missing ' + s);
  }
  assert.ok(!/setWebContentsDebuggingEnabled\(true\)/.test(main));
  assert.match(main, /shouldInterceptRequest/);
  assert.match(main, /"https".equalsIgnoreCase\(scheme\)/);
  assert.match(main, /address\.startsWith\("file:\/\/\/android_asset\/web\/"\)/);
  assert.equal((main.match(/addJavascriptInterface\(/g) || []).length, 1);
});

test('proguard keeps the JS bridge methods (R8 must not strip @JavascriptInterface)', () => {
  const pg = r('android/app/proguard-rules.pro');
  assert.match(pg, /JavascriptInterface/);
});
