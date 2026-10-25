'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const gradle = fs.readFileSync(path.join(root, 'android/app/build.gradle'), 'utf8');
const native = fs.readFileSync(path.join(root, 'android/app/src/main/java/com/zenstudy/focus/MainActivity.java'), 'utf8');
const D = require(path.join(root, 'android/app/src/main/assets/web/data_compat_v21.js'));

test('P0: Android applicationId must preserve installed com.zenstudy.focus identity', () => {
  const declared = [...gradle.matchAll(/^\s*applicationId\s+['"]([^'"]+)['"]/gm)].map(m => m[1]);
  assert.deepEqual(declared, ['com.zenstudy.focus'],
    'Changing applicationId creates a different installation with isolated v21 app data');
});

test('P0: native namespace stays paired with immutable application identity', () => {
  assert.match(gradle, /^\s*namespace\s+['"]com\.zenstudy\.focus['"]/m);
  assert.match(native, /^package com\.zenstudy\.focus;/m);
});

test('P0: v21 family keys remain byte-for-byte compatible', () => {
  assert.deepEqual({...D.KEYS}, {
    cfg: 'zen_fortress_cfg_v21',
    tasks: 'zen_fortress_tasks_v21',
    notes: 'zen_fortress_notes_v21',
  });
  assert.equal(D.JOURNAL_KEY, 'deep_focus_data_compat_v21_journal_v1');
});
