'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const appPath = path.join(__dirname, '../android/app/src/main/assets/web/app.js');
const marker = 'DEEP FOCUS — DAILY STREAK & 5-MIN KICKSTART ENGINE (M188)';

function loadIntro(nativeConfirm) {
  const app = fs.readFileSync(appPath, 'utf8');
  const splitAt = app.indexOf(marker);
  assert.ok(splitAt > 0, 'known app.js section marker must exist');
  const intro = app.slice(0, app.lastIndexOf('/* ========================================================', splitAt));
  const browser = { confirm: nativeConfirm };
  vm.runInNewContext(intro, { window: browser }, { timeout: 1000, filename: 'app.js:intro' });
  return browser;
}

test('M190 preserves native confirmation rather than installing a global auto-accept hook', () => {
  const nativeConfirm = () => false;
  assert.equal(loadIntro(nativeConfirm).confirm, nativeConfirm);
});

test('M190 respects Cancel for destructive timer, task, and activity prompts', () => {
  const prompts = ['ending session', 'الجلسة الحالية', 'تغيير النشاط', 'Delete task?', 'Discard changes?'];
  for (const prompt of prompts) {
    const calls = [];
    const browser = loadIntro(message => { calls.push(message); return false; });
    assert.equal(browser.confirm(prompt), false, `Cancel must remain possible: ${prompt}`);
    assert.deepEqual(calls, [prompt]);
  }
});

test('M190 respects explicit user confirmation', () => {
  const calls = [];
  const browser = loadIntro(message => { calls.push(message); return true; });
  assert.equal(browser.confirm('تغيير النشاط'), true);
  assert.deepEqual(calls, ['تغيير النشاط']);
});
