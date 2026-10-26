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
