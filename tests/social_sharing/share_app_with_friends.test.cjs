'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const vm = require('node:vm');

const appSource = fs.readFileSync(path.resolve(__dirname, '../../android/app/src/main/assets/web/app.js'), 'utf8');

const { test } = require('node:test');

function setup(opts = {}) {
  const context = {
    cfg: {
      todayMins: 42,
      sessions: 3,
      streak: 5,
    },
    toWest: (str) => str, // mock toWest
    window: {},
    navigator: {},
    showToast: (msg) => { context.toast = msg; },
    Error: Error,
    Promise: Promise,
    nsLabel: (id) => `LABEL_${id}`
  };

  // Merge options overrides
  if (opts.window) Object.assign(context.window, opts.window);
  if (opts.navigator) Object.assign(context.navigator, opts.navigator);
  if (opts.toWest) context.toWest = opts.toWest;

  vm.createContext(context);

  // Extract shareAppWithFriends string from appSource
  // The actual function in codebase is async: `async function shareAppWithFriends() {`
  const match = appSource.match(/async function shareAppWithFriends\(\) \{[\s\S]*?^}/m);
  if (!match) {
    throw new Error('shareAppWithFriends not found in app.js');
  }

  vm.runInContext(match[0], context);

  return context;
}

test('shareAppWithFriends calls ZenNative.shareAppInvite if available', async () => {
  let shareMsg = null;
  const context = setup({
    window: {
      ZenNative: {
        shareAppInvite: (msg) => { shareMsg = msg; }
      }
    }
  });

  const promise = vm.runInContext('shareAppWithFriends()', context);
  if (promise && typeof promise.then === 'function') {
      await promise;
  }
  // Codebase uses "Deep Focus", not "ZEN FOCUS" as in the issue description.
  assert.equal(shareMsg, '🌿 Deep Focus — My Progress Today: 42 active mins (3 sessions completed, 🔥 5 days streak)!');
  assert.equal(context.toast, undefined); // Toast not called
});

test('shareAppWithFriends falls back to clipboard and shows toast on success', async () => {
  let clipboardText = null;
  const context = setup({
    navigator: {
      clipboard: {
        writeText: async (text) => {
          clipboardText = text;
          return Promise.resolve();
        }
      }
    }
  });

  const result = await vm.runInContext('shareAppWithFriends()', context);

  assert.equal(result, true); // Since actual func returns true on try block success
  assert.equal(clipboardText, '🌿 Deep Focus — My Progress Today: 42 active mins (3 sessions completed, 🔥 5 days streak)!');
  assert.equal(context.toast, '📤 Copied to Clipboard!');
});

test('shareAppWithFriends shows error toast if clipboard is unavailable', async () => {
  const context = setup({
    navigator: {} // clipboard undefined
  });

  const result = await vm.runInContext('shareAppWithFriends()', context);

  assert.equal(result, false);
  assert.equal(context.toast, 'LABEL_34');
});

test('shareAppWithFriends shows error toast if clipboard writeText throws', async () => {
  const context = setup({
    navigator: {
      clipboard: {
        writeText: async () => {
          throw new Error('Denied');
        }
      }
    }
  });

  const result = await vm.runInContext('shareAppWithFriends()', context);

  assert.equal(result, false);
  assert.equal(context.toast, 'LABEL_34');
});
