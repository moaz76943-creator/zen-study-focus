'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const java = path.resolve(__dirname, '../../android/app/src/main/java/com/zenstudy/focus');
const host = fs.readFileSync(path.join(java, 'MainActivity.java'), 'utf8');
const ownerFile = path.join(java, 'FocusAppWebChromeClient.java');
const owner = fs.existsSync(ownerFile) ? fs.readFileSync(ownerFile, 'utf8') : '';

test('Android host uses a branded WebChromeClient without changing SAF bridge', () => {
  assert.match(host, /appDialogs\s*=\s*new FocusAppWebChromeClient\(this\)/);
  assert.match(host, /setWebChromeClient\(appDialogs\)/);
  assert.doesNotMatch(host, /setWebChromeClient\(new WebChromeClient\(\)\)/);
  for (const s of ['REQUEST_BACKUP_IMPORT', 'MAX_BACKUP_IMPORT_BYTES', 'importBackupFromFile', 'verifyAndRestoreBackupCode', 'setAllowContentAccess(false)']) {
    assert.ok(host.includes(s), 'preserve native SAF '+s);
  }
});

test('all three JS native dialog types are origin-scoped and never auto-approve on cancellation', () => {
  for (const name of ['onJsConfirm', 'onJsAlert', 'onJsPrompt']) {
    assert.match(owner, new RegExp('boolean\\s+' + name + '\\s*\\('));
  }
  assert.match(owner, /file:\/\/\/android_asset\/web\/index\.html/);
  assert.match(owner, /result\.cancel\(\)/);
  assert.match(owner, /setOnCancelListener\(/);
  assert.match(owner, /setOnDismissListener\(/);
  assert.match(owner, /AtomicBoolean/);
  assert.match(owner, /JsPromptResult/);
});

test('consecutive synchronous confirmations and Activity teardown release the active dialog', () => {
  const accept = owner.slice(owner.indexOf('setPositiveButton(android.R.string.ok'));
  assert.match(accept.slice(0, accept.indexOf('result.confirm()')), /activeDialog\s*=\s*null;/);
  assert.match(owner, /void cancelPending\(\)/);
  assert.match(host, /protected void onDestroy\(\)/);
  assert.match(host, /appDialogs\.cancelPending\(\)/);
});

test('native dialog QA reuses pre-existing persistent Accessibility probe; no JS fake dialogs',()=>{
 const runner=fs.readFileSync(path.join(__dirname,'run_native_dialog_device.sh'),'utf8');
 const source=fs.readFileSync(path.join(__dirname,'native_js_dialog_android_probe.cjs'),'utf8');
 const workflow=fs.readFileSync(path.resolve(__dirname,'../../.github/workflows/df_parallel01_native_dialog_android.yml'),'utf8');
 assert.match(workflow,/qa-probe\/tools\/i18n\/e2e\/probe assembleDebug/);
 assert.match(runner,/am instrument -w com\.zenstudy\.focus\.e2e\/\.AccessibilityProbe/);
 assert.match(source,/nativeHierarchy\(\)/);
 assert.match(source,/msg\.xml/);
 assert.match(source,/package="com\.zenstudy\.focus"/);
 assert.match(source,/REAL_NATIVE_DIALOG_NOT_PROVEN/);
 assert.doesNotMatch(source,/window\.(confirm|alert|prompt)\s*=/);
});
