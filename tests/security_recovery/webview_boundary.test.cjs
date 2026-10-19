'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root=path.resolve(__dirname,'../..');
const main=fs.readFileSync(path.join(root,'android/app/src/main/java/com/zenstudy/focus/MainActivity.java'),'utf8');
const manifest=fs.readFileSync(path.join(root,'android/app/src/main/AndroidManifest.xml'),'utf8');
const html=fs.readFileSync(path.join(root,'android/app/src/main/assets/web/index.html'),'utf8');

test('manifest disables platform automatic backup and cleartext traffic',()=>{
  assert.match(manifest,/android:allowBackup="false"/);
  assert.match(manifest,/android:usesCleartextTraffic="false"/);
  assert.match(manifest,/android:exported="false"[^>]*android:foregroundServiceType/s);
});

test('WebView blocks universal/file URL access and release-build debugging',()=>{
  assert.match(main,/setAllowFileAccessFromFileURLs\(false\)/);
  assert.match(main,/setAllowUniversalAccessFromFileURLs\(false\)/);
  assert.match(main,/setAllowContentAccess\(false\)/);
  assert.ok(main.includes('ApplicationInfo.FLAG_DEBUGGABLE'), 'Release must not expose WebView DevTools');
  assert.ok(main.includes('setWebContentsDebuggingEnabled(debuggableBuild)'), 'DevTools must require debuggable app flag');
  assert.ok(!main.includes('setWebContentsDebuggingEnabled(true)'), 'Unconditional debugging is forbidden');
  // Only disposable DEBUG builds may expose DevTools; release flags disable it.

});

test('SEC-P0 local-asset WebView must disable general file access',()=>{
  assert.match(main,/setAllowFileAccess\(false\)/,
    'Bundled android_asset pages should not require arbitrary filesystem read access');
});

test('SEC-P0 privileged native-bridge WebView must not load remote subresources',()=>{
  assert.match(main,/setBlockNetworkLoads\(true\)/,
    'Prevent remotely supplied frames/scripts from reaching globally exposed JavascriptInterface');
});

test('SEC-P0 bundled HTML must prohibit scripts/frames from remote or user-controlled origins',()=>{
  // The attribute uses double quotes and its directives contain single quotes.
  // Capture using the matching delimiter; the original pattern truncated at 'none'.
  const csp=html.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i);
  assert.ok(csp,'Add an asset-compatible CSP; whitelist only bundled scripts, block frames and unsafe schemes');
  assert.match(csp[1],/frame-src\s+'none'/);
  assert.match(csp[1],/object-src\s+'none'/);
});

test('SEC-P1 external navigation must never dispatch plaintext http links',()=>{
  const redirect=main.match(/shouldOverrideUrlLoading[\s\S]*?return true;/);
  assert.ok(redirect,'Explicit allowlist needed for URL navigation');
  assert.doesNotMatch(redirect[0],/["']http["']\.equalsIgnoreCase/,
    'Only verified https targets may open in Android ACTION_VIEW; reject http and dangerous schemes');
});

test('SEC-P1 legacy create-task and create-note paths must not mutate in-memory records before durable commit',()=>{
  const app=fs.readFileSync(path.join(root,'android/app/src/main/assets/web/app.js'),'utf8');
  const task=app.match(/function createNewTask\(\)\s*\{[\s\S]*?\n\}/);
  const note=app.match(/function saveNewNote\(\)\s*\{[\s\S]*?\n\}/);
  assert.ok(task&&note,'Baseline legacy entry points must be inspected');
  for(const [name,body] of [['task',task[0]],['note',note[0]]]){
    assert.doesNotMatch(body,/(?:tasksList|notesList)\.unshift\(/,
      name+' must commit a cloned snapshot first; never present unsaved records as persisted');
  }
});
