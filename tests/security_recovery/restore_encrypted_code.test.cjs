'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const appPath = path.resolve(__dirname, '../../android/app/src/main/assets/web/app.js');
const app = fs.readFileSync(appPath, 'utf8');

const begin = app.indexOf('function restoreFromEncryptedCode(');
const end = app.indexOf('function restoreFromFileInput(', begin);

if(begin < 0 || end < 0) throw new Error('Cannot find restoreFromEncryptedCode');

test('restoreFromEncryptedCode calls showToast when input is empty', () => {
  let toastMsg = null;
  let verifiedCode = null;

  const sandbox = {
    document: {
      getElementById: (id) => {
        if (id === 'inpRestorePayload') return { value: '' };
        return null;
      }
    },
    showToast: (msg) => { toastMsg = msg; },
    verifyAndRestoreBackupCode: (code) => { verifiedCode = code; }
  };

  vm.runInNewContext(app.slice(begin, end) + '\nrestoreFromEncryptedCode();', sandbox, {timeout: 2000});

  assert.equal(toastMsg, '⚠️ Paste backup code first');
  assert.equal(verifiedCode, null);
});

test('restoreFromEncryptedCode calls verifyAndRestoreBackupCode when input has value', () => {
  let toastMsg = null;
  let verifiedCode = null;

  const sandbox = {
    document: {
      getElementById: (id) => {
        if (id === 'inpRestorePayload') return { value: 'some-encrypted-code' };
        return null;
      }
    },
    showToast: (msg) => { toastMsg = msg; },
    verifyAndRestoreBackupCode: (code) => { verifiedCode = code; }
  };

  vm.runInNewContext(app.slice(begin, end) + '\nrestoreFromEncryptedCode();', sandbox, {timeout: 2000});

  assert.equal(toastMsg, null);
  assert.equal(verifiedCode, 'some-encrypted-code');
});
