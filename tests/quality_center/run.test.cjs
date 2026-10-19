'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {finding, buildReport, html, escapeHtml} = require('../../tools/quality_center/run.cjs');
test('quality center does not declare a releasable build when all source checks pass', () => {
  const r = buildReport([finding('SOURCE', 'Source check', 'PASS', 'Files exist')], 'abc', '2026-10-19T10:00:00Z');
  assert.equal(r.releaseReady, false);
  assert.match(r.releaseGate, /BLOCKED/);
  assert.equal(r.counts.PASS, 1);
  assert.equal(r.counts.NOT_TESTED, 0);
});
test('statuses retain blockers and explicit NOT_TESTED rather than hiding them', () => {
  const r = buildReport([
    finding('A', 'Audio', 'BLOCKED', 'Provenance missing'),
    finding('B', 'Android', 'NOT_TESTED', 'No device'),
    finding('C', 'Logic', 'FAIL', 'Assertion failed')
  ]);
  assert.deepEqual(r.counts, {PASS:0,FAIL:1,BLOCKED:1,NOT_TESTED:1});
  assert.equal(r.releaseReady, false);
});
test('HTML safely escapes diagnostic output without executable markup', () => {
  const dangerous = '<img src=x onerror="alert(1)">';
  const r = buildReport([finding('X', dangerous, 'FAIL', dangerous)], dangerous, 'time');
  const page = html(r);
  assert.ok(!page.includes(dangerous));
  assert.ok(page.includes(escapeHtml(dangerous)));
  assert.ok(!page.includes('<img src=x'));
});
test('invalid status is never accepted as green', () => {
  assert.throws(() => finding('X', 'X', 'SUCCESS', 'X'), /Unknown status/);
});
