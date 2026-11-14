'use strict';
const test = require('node:test'); const assert = require('node:assert/strict'); const fs = require('node:fs'); const path = require('node:path');
const root = path.resolve(__dirname, '../..');
test('native TTS instrumentation targets the shipped class and never claims audible output', () => {
  const j = fs.readFileSync(path.join(__dirname, 'NativeTtsInstrumentation.java'), 'utf8');
  assert.ok(j.includes('com.zenstudy.focus.NativeTts')); assert.ok(/NOT_READY/.test(j) && /BAD_RATE/.test(j) && /offlineOnly/.test(j));
  assert.ok(!/audible output (verified|passed)/i.test(j));
  const sh = fs.readFileSync(path.join(__dirname, 'prepare_test_build.sh'), 'utf8'); assert.ok(sh.includes('NativeTtsInstrumentation'));
  const wf = fs.readFileSync(path.join(root, '.github/workflows/native_tts_emulator.yml'), 'utf8');
  assert.ok(wf.includes('android-emulator-runner') && wf.includes('tests/android_tts/run_ci.sh'));
});
