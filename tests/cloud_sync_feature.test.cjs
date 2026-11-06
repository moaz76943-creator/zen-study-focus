const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const appJsPath = path.join(__dirname, '../android/app/src/main/assets/web/app.js');
const source = fs.readFileSync(appJsPath, 'utf8');

const match = source.match(/((?:async\s+)?function syncToGoogleCloudNow\(\)\s*\{[\s\S]*?\n\})\s*\nfunction/);
assert.ok(match, 'Find syncToGoogleCloudNow function');

function start(env = {}) {
  const notices = [];
  const ctx = {
    window: env.window || {},
    navigator: env.navigator || {},
    generateEncryptedBackupCode: env.generateEncryptedBackupCode || (() => 'BACKUP_DATA_123'),
    showToast: s => notices.push(s)
  };
  vm.runInNewContext(match[1], ctx);
  return { notices, run: () => ctx.syncToGoogleCloudNow() };
}

test('syncToGoogleCloudNow - Uses ZenNative.syncBackupToGoogleEmailOrDrive if available', async () => {
  let nativeCode = null;
  const { notices, run } = start({
    window: {
      ZenNative: {
        syncBackupToGoogleEmailOrDrive: (c) => { nativeCode = c; }
      }
    }
  });

  await run();
  assert.equal(nativeCode, 'BACKUP_DATA_123');
  assert.equal(notices.length, 0);
});

test('syncToGoogleCloudNow - Uses clipboard if ZenNative is unavailable', async () => {
  let clipboardData = null;
  const { notices, run } = start({
    navigator: {
      clipboard: {
        writeText: async (text) => { clipboardData = text; }
      }
    }
  });

  await run();
  assert.equal(clipboardData, 'BACKUP_DATA_123');
  assert.match(notices[0], /Backup copied/i);
});

test('syncToGoogleCloudNow - Shows failure toast if clipboard write fails', async () => {
  const { notices, run } = start({
    navigator: {
      clipboard: {
        writeText: async () => { throw new Error('Not allowed'); }
      }
    }
  });

  await run();
  assert.match(notices[0], /Backup copy failed/i);
});

test('syncToGoogleCloudNow - Shows unavailable toast if neither Native nor Clipboard exist', async () => {
  const { notices, run } = start({});
  await run();
  assert.match(notices[0], /Clipboard unavailable/i);
});
