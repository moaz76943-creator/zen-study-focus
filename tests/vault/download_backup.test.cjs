'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const appPath = path.join(__dirname, '../../android/app/src/main/assets/web/app.js');
const appJs = fs.readFileSync(appPath, 'utf8');

const funcMatch = appJs.match(/function downloadEncryptedBackupFile\(\) \{([\s\S]*?)\n\}/);
if (!funcMatch) {
  throw new Error("Could not find downloadEncryptedBackupFile in app.js");
}
const funcBody = funcMatch[0];

function runTest(sandboxOverrides) {
  let toastMessage = null;

  const sandbox = {
    generateEncryptedBackupCode: () => "mocked-backup-code",
    showToast: (msg) => { toastMessage = msg; },
    todayISO: "2023-01-01",
    window: {},
    Blob: function(content, options) {
      this.content = content;
      this.options = options;
    },
    URL: {
      createObjectURL: (blob) => "mock-url"
    },
    document: {
      createElement: (tag) => {
        if (tag === 'a') {
          const a = {
            click: () => { sandbox.anchorClicked = true; },
            href: "",
            download: ""
          };
          sandbox.createdAnchor = a;
          return a;
        }
        return {};
      }
    },
    ...sandboxOverrides
  };

  const script = new vm.Script(`${funcBody}\ndownloadEncryptedBackupFile();`);
  const context = vm.createContext(sandbox);
  script.runInContext(context);

  return { sandbox: context, toastMessage };
}

test('downloadEncryptedBackupFile creates and clicks a download link and shows success toast', () => {
  const { sandbox, toastMessage } = runTest();

  assert.ok(sandbox.createdAnchor, "Should create an anchor element");
  assert.equal(sandbox.createdAnchor.href, "mock-url", "Should set href to object URL");
  assert.equal(sandbox.createdAnchor.download, "zen-focus-backup-2023-01-01.zenbackup", "Should set download filename correctly");
  assert.equal(sandbox.anchorClicked, true, "Should click the anchor");
  assert.equal(toastMessage, "💾 Encrypted File Saved!", "Should show success toast");
});
