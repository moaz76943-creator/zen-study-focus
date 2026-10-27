'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { inspectLabels, probeSystemFormatters } = require('../../tools/room6/western_digits_probe.cjs');

test('Q04 rejects non-Western generated digits across Unicode scripts and retains evidence', () => {
  const labels = Object.freeze([
    Object.freeze({ origin: 'system', text: '25:00', kind: 'timer' }),
    Object.freeze({ origin: 'system', text: '٢٠٢٦-۱۰-27', kind: 'date' }),
    Object.freeze({ origin: 'system', text: '१२', kind: 'count' }),
    Object.freeze({ origin: 'system', text: '𝟚', kind: 'count' })
  ]);
  const report = inspectLabels(labels);
  assert.equal(report.status, 'FAIL');
  assert.deepEqual(report.labels.map(l => l.status), ['PASS', 'FAIL', 'FAIL', 'FAIL']);
  assert.deepEqual(report.labels[1].nonWesternDigits, ['٢', '٠', '٢', '٦', '۱', '۰']);
  assert.equal(report.labels[1].text, labels[1].text);
});

test('Q04 never rewrites or rejects user-authored Arabic/Persian/English mixed text', () => {
  const samples = ['راجع ٣ مهام في 2026', 'جلسه ۱۲ دقیقه', 'Review ٣ tasks', 'বাংলা ১২৩'];
  const labels = samples.map(text => Object.freeze({origin: 'user', kind: 'note', text}));
  const before = JSON.stringify(labels);
  const report = inspectLabels(labels);
  assert.equal(report.status, 'PASS');
  assert.deepEqual(report.labels.map(l => l.status), samples.map(() => 'PRESERVED'));
  assert.deepEqual(report.labels.map(l => l.text), samples);
  assert.equal(JSON.stringify(labels), before);
});

test('Q04 unknown provenance, empty evidence and invalid input cannot manufacture PASS', () => {
  for (const input of [[], null, [{text: '12'}], [{origin:'system', text:''}], [{origin:'system',text:12}], [{origin:'system', text:'NaN'}]]) {
    assert.equal(inspectLabels(input).status, 'NOT_TESTED');
  }
});

test('Q04 invokes real shipped timer and calendar formatters at second/day boundaries', () => {
  const report = probeSystemFormatters();
  assert.equal(report.status, 'PASS');
  const timers = report.labels.filter(l => l.kind === 'timer').map(l => l.text.replace(/\u200e/g, ''));
  assert.deepEqual(timers, ['00:00', '00:59', '01:00', '59:59', '01:00:00']);
  assert.deepEqual(report.labels.filter(l => l.kind === 'date').map(l => l.text), ['2024-02-29', '2025-02-28', '2026-01-01']);
  assert.ok(report.notTested.some(reason => /Android/.test(reason)));
});
