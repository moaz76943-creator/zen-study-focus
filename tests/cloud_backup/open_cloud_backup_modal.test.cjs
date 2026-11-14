'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const appJsPath = path.resolve(__dirname, '../../android/app/src/main/assets/web/app.js');
const appJsCode = fs.readFileSync(appJsPath, 'utf8');

// Find the function to test
const funcStart = appJsCode.indexOf('function openCloudBackupModal()');
const nextFuncAsync = appJsCode.indexOf('async function syncToGoogleCloudNow()');
const nextFuncSync = appJsCode.indexOf('function syncToGoogleCloudNow()');
const nextFunc = nextFuncAsync !== -1 ? nextFuncAsync : nextFuncSync;

assert.ok(funcStart >= 0 && nextFunc > funcStart, 'Could not find openCloudBackupModal function in app.js');
const funcCode = appJsCode.slice(funcStart, nextFunc);

function setupSandbox() {
  const events = [];
  const payloadElement = { value: 'initial_value' };
  const modalElement = {
    classList: {
      classes: [],
      add(c) { this.classes.push(c); events.push(`added_class_${c}`); }
    }
  };

  const documentMock = {
    getElementById(id) {
      if (id === 'inpRestorePayload') return payloadElement;
      if (id === 'cloudBackupModal') return modalElement;
      return null;
    }
  };

  const sandbox = {
    document: documentMock,
    cfg: { lang: 'en' },
    window: {}
  };

  if (funcCode.includes('DeepFocusAudioSettingsLocale')) {
    sandbox.window.DeepFocusAudioSettingsLocale = {
      bindBackupDialog(args) {
        events.push('bindBackupDialog_called');
        events.push(`locale_${args.locale}`);
      }
    };
  }

  vm.createContext(sandbox);
  vm.runInContext(funcCode, sandbox);

  return { sandbox, events, payloadElement, modalElement };
}

test('openCloudBackupModal clears payload and opens modal', () => {
  const { sandbox, events, payloadElement } = setupSandbox();

  // Run the function
  vm.runInContext('openCloudBackupModal()', sandbox);

  // Assert payload is cleared
  assert.equal(payloadElement.value, '', 'inpRestorePayload value should be cleared');

  // Assert modal is opened
  assert.ok(events.includes('added_class_open'), 'cloudBackupModal should have open class added');

  // Assert bindBackupDialog is called if it was in the source
  if (funcCode.includes('DeepFocusAudioSettingsLocale')) {
      assert.ok(events.includes('bindBackupDialog_called'), 'bindBackupDialog should be called');
      assert.ok(events.includes('locale_en'), 'bindBackupDialog should be called with correct locale');
  }
});
