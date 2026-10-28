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
  assert.match(workflow, /-gpu software\b/, 'Use supported software GPU for current headless Android emulator');
  assert.doesNotMatch(workflow, /swiftshader_indirect|-dpi-device/, 'Do not use deprecated emulator flags');
  assert.match(workflow,
    /runs-on: \\$\\{\\{ matrix\\.api == 35 && 'ubuntu-22\\.04' \\|\\| 'ubuntu-24\\.04' \\}\\}/,
    'API35 must run on a separate stable host image while retaining API30');

});
