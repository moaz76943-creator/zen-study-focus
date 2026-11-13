'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
test('operational docs exist and are non-trivial', () => {
  for (const f of ['SIGNING', 'QUALITY', 'STORAGE_KEYS', 'RELEASE_CHECKLIST', 'ARCHITECTURE']) {
    const p = path.resolve(__dirname, '../docs', f + '.md');
    assert.ok(fs.existsSync(p) && fs.statSync(p).size > 200, f + '.md missing');
  }
});
