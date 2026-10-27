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
});
