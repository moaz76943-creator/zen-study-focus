'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const appPath = path.resolve(__dirname, '../../android/app/src/main/assets/web/app.js');
const source = fs.readFileSync(appPath, 'utf8');

function block(start, end) {
  const a = source.indexOf(start);
  assert.ok(a >= 0, 'expected production block: ' + start);
  const b = source.indexOf(end, a + start.length);
  assert.ok(b > a, 'expected production block end: ' + end);
  return source.slice(a, b);
}

const shareCode = block('async function shareAppWithFriends() {', '\n/* ========================================================\n   4. GUARANTEED COMPLETION CHIME');

function rigShare() {
  const toasts = [];
  const clipboardWrites = [];
  let nativeShareMsg = null;
  const sandbox = {
    cfg: { todayMins: 45, sessions: 3, streak: 5 },
    showToast: m => toasts.push(m),
    window: {},
    navigator: {},
    nsLabel: id => id === 34 ? 'Clipboard Error' : 'Unknown Error',
    Error: global.Error
  };
  // redefine a proper toWest mock
  sandbox.toWest = (val) => String(val);

  vm.createContext(sandbox);
  // define shareAppWithFriends
  vm.runInContext(shareCode, sandbox);

  return {
    sandbox,
    toasts,
    clipboardWrites,
    getNativeShareMsg: () => nativeShareMsg,
    setNative: () => {
      sandbox.window.ZenNative = {
        shareAppInvite: msg => { nativeShareMsg = msg; }
      };
    },
    setClipboard: (success = true) => {
      sandbox.navigator.clipboard = {
        writeText: msg => {
          clipboardWrites.push(msg);
          if (success) return Promise.resolve();
          return Promise.reject(new Error('CLIPBOARD_FAIL'));
        }
      };
    },
    removeClipboard: () => {
      delete sandbox.navigator.clipboard;
    },
    share: () => vm.runInContext('shareAppWithFriends()', sandbox)
  };
}

test('shareAppWithFriends - prefers native sharing if available', async () => {
  const t = rigShare();
  t.setNative();
  await t.share();

  assert.equal(t.getNativeShareMsg(), '🌿 Deep Focus — My Progress Today: 45 active mins (3 sessions completed, 🔥 5 days streak)!');
  assert.equal(t.clipboardWrites.length, 0);
  assert.equal(t.toasts.length, 0);
});

test('shareAppWithFriends - falls back to clipboard if native is missing', async () => {
  const t = rigShare();
  t.setClipboard(true);
  await t.share();

  assert.equal(t.getNativeShareMsg(), null);
  assert.equal(t.clipboardWrites.length, 1);
  assert.equal(t.clipboardWrites[0], '🌿 Deep Focus — My Progress Today: 45 active mins (3 sessions completed, 🔥 5 days streak)!');
  assert.equal(t.toasts[0], '📤 Copied to Clipboard!');
});

test('shareAppWithFriends - handles clipboard missing', async () => {
  const t = rigShare();
  t.removeClipboard();
  await t.share();

  assert.equal(t.getNativeShareMsg(), null);
  assert.equal(t.clipboardWrites.length, 0);
  assert.equal(t.toasts[0], 'Clipboard Error');
});

test('shareAppWithFriends - handles clipboard failure', async () => {
  const t = rigShare();
  t.setClipboard(false); // will throw error
  await t.share();

  assert.equal(t.getNativeShareMsg(), null);
  assert.equal(t.clipboardWrites.length, 1); // writeText was called
  assert.equal(t.toasts[0], 'Clipboard Error'); // but it failed
});
