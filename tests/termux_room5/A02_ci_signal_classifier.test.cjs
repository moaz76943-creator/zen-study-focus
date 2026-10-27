'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');

const MODULE_URL = new URL('../../tools/termux_room5/ci_signal_classifier.mjs', 'file://' + __dirname + '/').href;

test('A02 ci_signal_classifier: classification and no false success', async () => {
  const { classifyOutcome, classifySource, classifySignal, formatReport, OUTCOMES, SOURCES, PLATFORMS } = await import(MODULE_URL);

  await test('stable API surface', () => {
    assert.equal(typeof classifyOutcome, 'function');
    assert.equal(typeof classifySource, 'function');
    assert.equal(typeof classifySignal, 'function');
    assert.equal(typeof formatReport, 'function');
    assert.deepEqual([...OUTCOMES].sort(), ['FAIL', 'NOT_TESTED', 'PASS']);
    assert.ok(SOURCES.includes('github_actions'));
    assert.ok(SOURCES.includes('manual'));
    assert.ok(PLATFORMS.includes('android'));
  });

  await test('classifyOutcome: explicit PASS only from completed + success', () => {
    assert.equal(classifyOutcome({ status: 'completed', conclusion: 'success' }), 'PASS');
    assert.equal(classifyOutcome({ status: 'completed', conclusion: 'failure' }), 'FAIL');
    assert.equal(classifyOutcome({ status: 'completed', conclusion: 'neutral' }), 'NOT_TESTED');
    assert.equal(classifyOutcome({ status: 'in_progress', conclusion: 'success' }), 'NOT_TESTED');
    assert.equal(classifyOutcome({ status: 'queued' }), 'NOT_TESTED');
    assert.equal(classifyOutcome({}), 'NOT_TESTED');
    assert.equal(classifyOutcome(null), 'NOT_TESTED');
    assert.equal(classifyOutcome({ status: 'completed', conclusion: 'skipped' }), 'NOT_TESTED');
  });

  await test('no false success on missing or ambiguous signals', () => {
    assert.notEqual(classifyOutcome({ conclusion: 'success' }), 'PASS');
    assert.notEqual(classifyOutcome({ status: 'success', conclusion: null }), 'PASS');
    assert.equal(classifyOutcome({ status: 'completed', conclusion: 'unknown' }), 'NOT_TESTED');
    assert.equal(classifyOutcome({ status: 'ok', conclusion: 'ok' }), 'NOT_TESTED');
  });

  await test('classifySource: github_actions, manual, unknown', () => {
    assert.equal(classifySource({ provider: 'github_actions' }), 'github_actions');
    assert.equal(classifySource({ workflowPath: '.github/workflows/android.yml' }), 'github_actions');
    assert.equal(classifySource({ provider: 'manual', runLocally: true }), 'manual');
    assert.equal(classifySource({}), 'unknown');
    assert.equal(classifySource({ provider: 'carrier-pigeon' }), 'unknown');
  });

  await test('classifySignal: android platform detection', () => {
    const android = classifySignal({
      provider: 'github_actions',
      workflowPath: '.github/workflows/android_ci.yml',
      labels: ['ubuntu-latest', 'android-emulator', 'api-35'],
      status: 'completed',
      conclusion: 'success'
    });
    assert.equal(android.platform, 'android');
    assert.equal(android.source, 'github_actions');
    assert.equal(android.outcome, 'PASS');
    assert.equal(android.ok, true);

    const generic = classifySignal({
      provider: 'github_actions',
      status: 'completed',
      conclusion: 'failure'
    });
    assert.equal(generic.platform, 'generic');
    assert.equal(generic.outcome, 'FAIL');
    assert.equal(generic.ok, false);
  });

  await test('classifySignal: unrun android job is NOT_TESTED, not PASS', () => {
    const signal = classifySignal({
      provider: 'github_actions',
      labels: ['android-emulator'],
      status: 'skipped',
      conclusion: 'skipped'
    });
    assert.equal(signal.outcome, 'NOT_TESTED');
    assert.equal(signal.ok, false);
    assert.equal(signal.platform, 'android');
  });

  await test('formatReport: deterministic text', () => {
    const report = formatReport(classifySignal({ provider: 'manual', status: 'completed', conclusion: 'success' }));
    assert.match(report, /source=manual/);
    assert.match(report, /outcome=PASS/);
  });
});
