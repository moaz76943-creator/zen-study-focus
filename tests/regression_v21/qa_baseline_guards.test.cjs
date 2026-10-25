'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const repoRoot = path.resolve(__dirname, '../..');
const web = path.join(repoRoot, 'android/app/src/main/assets/web');
const read = file => fs.readFileSync(path.join(web, file), 'utf8');

test('v21 persistence keys and the original backup header survive', () => {
  const src = read('app.js');
  for (const key of [
    'zen_fortress_cfg_v21', 'zen_fortress_tasks_v21',
    'zen_fortress_notes_v21', 'zen_fortress_active_timer_v21',
    'ZEN21::'
  ]) assert.ok(src.includes(key), 'Missing v21 invariant: ' + key);
});

test('Android applicationId must be preserved and debug signing cannot be used for a Play release', () => {
  const gradle = fs.readFileSync(path.join(repoRoot, 'android/app/build.gradle'), 'utf8');
  assert.match(gradle, /applicationId\s+["']com\.zenstudy\.focus["']/);
  assert.match(gradle, /targetSdk\s+36/);
  assert.match(gradle, /hasUploadSigning/);
  assert.doesNotMatch(gradle, /release\s*\{[^}]*signingConfig\s+signingConfigs\.debug/s);
});

test('legacy web entrypoint loads its real app and notes scripts, not just empty shells', () => {
  const html = read('index.html');
  for (const f of ['app.js', 'notes_studio.js', 'notes_drafts.js', 'quick_training.js', 'timer_settings.js']) {
    assert.ok(html.includes('src="' + f + '"'), 'Missing legacy script ' + f);
    assert.ok(read(f).trim().length > 100, 'Empty script ' + f);
  }
});

test('protected production smoke suite remains available to integration owner', () => {
  assert.ok(fs.existsSync(path.join(repoRoot, 'tests/smoke_app.cjs')));
  assert.ok(fs.existsSync(path.join(repoRoot, 'tests/validate_locales.cjs')));
});
