'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const web = path.resolve(__dirname, '../../android/app/src/main/assets/web');
const app = fs.readFileSync(path.join(web, 'app.js'), 'utf8');

function setupTestEnv() {
  const toasts = [];
  const backupCalls = [];

  class MockFileReader {
    constructor() {
      this.onload = null;
    }
    readAsText(file) {
      if (this.onload) {
        this.onload({ target: { result: file.content } });
      }
    }
  }

  const c = vm.createContext({
    FileReader: MockFileReader,
    showToast: (msg) => toasts.push(msg),
    verifyAndRestoreBackupCode: (code) => backupCalls.push(code)
  });

  // Extract the function from app.js
  const functionStart = app.indexOf('function restoreFromFileInput(');
  const functionEnd = app.indexOf('}', functionStart) + 1;
  const functionCode = app.substring(functionStart, functionEnd);

  vm.runInContext(functionCode, c);

  const run = (s) => vm.runInContext(s, c);

  return { run, toasts, backupCalls, c };
}

test('restoreFromFileInput handles missing file, oversized file, and valid file', () => {
  const env = setupTestEnv();

  // 1. Missing file
  env.run(`
    restoreFromFileInput({ target: { files: [] } });
  `);
  assert.equal(env.toasts.length, 0);
  assert.equal(env.backupCalls.length, 0);

  // 2. Oversized file
  env.run(`
    restoreFromFileInput({
      target: {
        files: [{ size: 9 * 1024 * 1024, content: 'too-big' }]
      }
    });
  `);
  assert.equal(env.toasts.length, 1);
  assert.match(env.toasts[0], /Backup file is too large/);
  assert.equal(env.backupCalls.length, 0);

  // 3. Valid file
  env.run(`
    restoreFromFileInput({
      target: {
        files: [{ size: 1024, content: 'valid-backup-data' }]
      }
    });
  `);
  assert.equal(env.toasts.length, 1); // No new toast added
  assert.equal(env.backupCalls.length, 1);
  assert.equal(env.backupCalls[0], 'valid-backup-data');
});
