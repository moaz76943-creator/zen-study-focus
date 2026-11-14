'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.resolve(__dirname, '../../android/app/src/main/assets/web/app.js'), 'utf8');

const extractFunction = (src, name) => {
    const reg = new RegExp(`function\\s+${name}\\s*\\([^{]*\\)\\s*{`);
    const start = src.search(reg);
    if (start === -1) return '';
    let braces = 0;
    let end = start;
    let started = false;
    for (let i = start; i < src.length; i++) {
        if (src[i] === '{') { braces++; started = true; }
        else if (src[i] === '}') braces--;
        if (started && braces === 0) {
            end = i + 1;
            break;
        }
    }
    return src.substring(start, end);
};

const secretSaltCode = source.match(/const\s+SECRET_SALT\s*=\s*"[^"]+";/)[0];
const globals = `
  const LANG_CATALOG = [{code: 'en'}];
  var cfg = { todayMins: 0, lang: 'en', theme: 'dark' };
  var tasksList = [];
  var notesList = [];
`;

let testBackupModule = globals + '\n' + secretSaltCode + '\n';
const extractList = ['computeHash', 'saveFortressData', 'validateImportedBackup', 'generateEncryptedBackupCode', 'verifyAndRestoreBackupCode'];
for (const fn of extractList) {
    testBackupModule += extractFunction(source, fn) + '\n';
}

function createTestContext() {
  const notices = [];
  const localStorageData = new Map();
  let confirmed = true;

  const sandbox = {
    window: {
      DF22Preflight: { nativeAcknowledge: () => true },
      ZenNative: true
    },
    localStorage: {
      getItem: (k) => localStorageData.get(k) || null,
      setItem: (k, v) => localStorageData.set(k, String(v)),
      removeItem: (k) => localStorageData.delete(k),
    },
    confirmSensitiveAction: () => confirmed,
    showToast: (s) => notices.push(s),
    syncDailyRollover: () => {},
    applyLanguage: () => {},
    closeModal: () => {},
    console: console,
    btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    atob: (s) => Buffer.from(s, 'base64').toString('binary'),
    escape: global.escape,
    unescape: global.unescape,
    Date: Date,
    String: String,
    Number: Number,
    Array: Array,
    Object: Object,
    JSON: JSON,
    Map: Map,
    Set: Set,
    Error: Error,
    result: null
  };

  vm.createContext(sandbox);
  // Replace the catch block to log the error correctly if it occurs
  const debugModule = testBackupModule.replace('catch (e) {', 'catch (e) { console.error("RESTORE ERROR:", e.message, e.stack); ');
  vm.runInContext(debugModule, sandbox);

  return { ctx: sandbox, localStorageData, notices, setConfirm: (v) => confirmed = v };
}

test('verifyAndRestoreBackupCode restores valid backup', () => {
  const { ctx, localStorageData, notices } = createTestContext();

  vm.runInContext(`
    cfg = { todayMins: 10, sessions: 0, streak: 0, water: 0, lang: 'en', theme: 'dark' };
    tasksList = [{ id: 1, title: 'Task 1', done: false }];
    notesList = [{ id: 1, title: 'Note 1', body: 'Body 1' }];
    var code = generateEncryptedBackupCode();
    cfg = { theme: 'light' };
    tasksList = [];
    notesList = [];
    result = verifyAndRestoreBackupCode(code);
  `, ctx);

  assert.equal(ctx.result, true);
  assert.equal(ctx.cfg.todayMins, 10);
  assert.equal(ctx.tasksList[0].title, 'Task 1');
  assert.equal(ctx.notesList[0].body, 'Body 1');

  assert.ok(localStorageData.has('zen_fortress_cfg_v21'));
  assert.ok(localStorageData.has('zen_fortress_cfg_v21_mirror'));

  assert.match(notices.join(' '), /Backup restored/i);
});

test('verifyAndRestoreBackupCode rejects tampered backup', () => {
  const { ctx, notices } = createTestContext();

  vm.runInContext(`
    cfg = { todayMins: 10, sessions: 0, streak: 0, water: 0, lang: 'en' };
    tasksList = [];
    notesList = [];
    var code = generateEncryptedBackupCode();

    var parts = code.split('::');
    var rawB64 = parts[1];
    var decoded = JSON.parse(decodeURIComponent(escape(atob(rawB64))));

    var bundle = JSON.parse(decoded.bundle);
    bundle.cfg.todayMins = 999;
    decoded.bundle = JSON.stringify(bundle);

    var tamperedCode = 'ZEN21::' + btoa(unescape(encodeURIComponent(JSON.stringify(decoded))));
    result = verifyAndRestoreBackupCode(tamperedCode);
  `, ctx);

  assert.equal(ctx.result, false);
  // Match "Invalid or Tampered Backup Code" or "Backup invalid" depending on where the error occurs
  assert.match(notices.join(' '), /Invalid.*Backup|Backup invalid/i);
});

test('verifyAndRestoreBackupCode handles invalid format', () => {
  const { ctx, notices } = createTestContext();

  vm.runInContext(`
    result = verifyAndRestoreBackupCode('invalid-code');
  `, ctx);

  assert.equal(ctx.result, false);
  assert.match(notices.join(' '), /Invalid.*Backup|Backup invalid/i);
});

test('verifyAndRestoreBackupCode cancels when user does not confirm', () => {
  const { ctx, setConfirm } = createTestContext();
  setConfirm(false);

  vm.runInContext(`
    cfg = { todayMins: 10, sessions: 0, streak: 0, water: 0, lang: 'en' };
    tasksList = [];
    notesList = [];
    var code = generateEncryptedBackupCode();
    cfg = { todayMins: 0, theme: 'light' };
    result = verifyAndRestoreBackupCode(code);
  `, ctx);

  assert.equal(ctx.result, false);
  assert.equal(ctx.cfg.todayMins, 0); // Should not have changed
});
