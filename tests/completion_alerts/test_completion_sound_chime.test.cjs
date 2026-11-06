const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('node:vm');

test('testCompletionSoundChime calls playRichCompletionChime and showToast', () => {
  const code = fs.readFileSync(path.join(__dirname, '../../android/app/src/main/assets/web/app.js'), 'utf-8');

  const sandbox = {
    window: {},
    navigator: {},
    console: console,
    playRichCompletionChime: (text) => {
      sandbox.chimeCalledWith = text;
    },
    showToast: (text) => {
      sandbox.toastCalledWith = text;
    }
  };

  vm.createContext(sandbox);
  const match = code.match(/function testCompletionSoundChime\(\) \{[\s\S]*?\n\}/);
  assert.ok(match, "testCompletionSoundChime not found in app.js");

  vm.runInContext(match[0], sandbox);
  vm.runInContext('testCompletionSoundChime()', sandbox);

  assert.equal(sandbox.chimeCalledWith, "Test Notification & Sound Alert 🔔");
  assert.equal(sandbox.toastCalledWith, "🔔 Alarm & Notification Tested!");
});
