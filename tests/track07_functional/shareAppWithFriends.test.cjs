'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const appPath = path.resolve(__dirname, '../../android/app/src/main/assets/web/app.js');
const app = fs.readFileSync(appPath, 'utf8');

function extractFunction(name) {
  const match = app.match(new RegExp(`(?:async )?function ${name}\\(\\) \\{[\\s\\S]*?\\n\\}`));
  assert.ok(match, `actual production function required: ${name}`);
  return match[0];
}

function harness(clipboard, zenNative) {
  const notices = [], writes = [];
  const context = vm.createContext({
    navigator: { clipboard },
    window: { ZenNative: zenNative },
    cfg: { todayMins: 12, sessions: 2, streak: 3 },
    toWest: x => String(x),
    showToast: x => notices.push(x),
    nsLabel: x => x === 34 ? 'COPY_FAILED' : 'OTHER'
  });

  vm.runInContext(extractFunction('shareAppWithFriends'), context);
  return { context, notices, writes };
}

test('shareAppWithFriends correctly formats message and uses ZenNative', async () => {
  const native = [];
  const f = harness(
    { writeText: () => { throw new Error('Must not fallback'); } },
    { shareAppInvite: value => native.push(value) }
  );

  await f.context.shareAppWithFriends();

  assert.equal(native.length, 1);
  assert.equal(native[0], '🌿 Deep Focus — My Progress Today: 12 active mins (2 sessions completed, 🔥 3 days streak)!');
  assert.deepEqual(f.notices, []);
});

test('shareAppWithFriends gracefully falls back to clipboard when ZenNative unavailable', async () => {
  const f = harness({
    writeText: async (msg) => {
      f.writes.push(msg);
      return true;
    }
  });

  const result = await f.context.shareAppWithFriends();

  assert.equal(result, true);
  assert.equal(f.writes.length, 1);
  assert.equal(f.writes[0], '🌿 Deep Focus — My Progress Today: 12 active mins (2 sessions completed, 🔥 3 days streak)!');
  assert.equal(f.notices.length, 1);
  assert.equal(f.notices[0], '📤 Copied to Clipboard!');
});

test('shareAppWithFriends handles clipboard errors by showing failure toast', async () => {
  const f = harness({
    writeText: () => { throw new Error('Clipboard failed'); }
  });

  const result = await f.context.shareAppWithFriends();

  assert.equal(result, false);
  assert.equal(f.notices.length, 1);
  assert.equal(f.notices[0], 'COPY_FAILED');
});
