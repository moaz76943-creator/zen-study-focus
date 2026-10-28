'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');

test('Track05 CI references real test files instead of silently omitting missing suites', () => {
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/track05_timer_lifecycle_20261021.yml'), 'utf8');
  const files = [...new Set(workflow.match(/\btests\/[\w/.-]+\.test\.cjs\b/g))];
  assert.ok(files.length > 10, 'Timer CI must retain its substantive regression suites');
  for (const file of files) {
    assert.ok(fs.existsSync(path.join(root, file)), 'Missing required timer CI suite: ' + file);
  }
  assert.match(workflow, /-gpu software\b/, 'API30 must retain supported software GPU');
  assert.match(workflow, /-gpu swangle\b/, 'API35 must use independently passing ANGLE software GPU');
  assert.doesNotMatch(workflow, /swiftshader_indirect|-dpi-device/, 'Do not use deprecated emulator flags');
  assert.match(workflow, /runs-on: ubuntu-24\.04/, 'Use proven same-host Android 30 and 35 image');
  assert.match(workflow, /matrix\.api == 35 && '3072M'/, 'API35 must have independently tested RAM');
  assert.match(workflow, /matrix\.api == 35 && '512M'/, 'API35 must have sufficient heap');
  assert.match(workflow, /emulator-boot-timeout: 900/, 'Do not confuse delayed boot with app error');

});
