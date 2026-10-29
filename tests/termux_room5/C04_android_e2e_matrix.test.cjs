'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const MODULE_PATH = '../../tools/termux_room5/android_e2e_matrix.mjs';
const MODULE_FILE = path.join(__dirname, MODULE_PATH);

const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);
const SHA_64 = 'C'.repeat(64);
const APK_A = 'd'.repeat(64);

function record(apiLevel, overrides = {}) {
  return {
    apiLevel,
    check: 'e2e',
    outcome: 'PASS',
    sha: SHA_A,
    ...overrides
  };
}

function cell(report, apiLevel, check = 'e2e') {
  return report.cells.find((entry) => entry.apiLevel === apiLevel && entry.check === check);
}

test('a complete API30/API35 matrix is PASS only with exact matching source SHA', async () => {
  const { buildE2eMatrix } = await import(MODULE_PATH);

  const report = buildE2eMatrix({
    records: [record(30), record(35)],
    expectedSha: SHA_A
  });

  assert.equal(report.version, 1);
  assert.equal(report.status, 'PASS');
  assert.equal(report.ok, true);
  assert.equal(report.expectedSha, SHA_A);
  assert.deepEqual(report.apiLevels, [30, 35]);
  assert.deepEqual(report.checks, ['e2e']);
  assert.deepEqual(report.cells.map((entry) => [entry.apiLevel, entry.check, entry.outcome]), [
    [30, 'e2e', 'PASS'],
    [35, 'e2e', 'PASS']
  ]);
  assert.deepEqual(report.sha, {
    expected: SHA_A,
    exact: true,
    observed: [SHA_A],
    apkExpected: null,
    apkObserved: []
  });
  assert.equal(report.counts.cells, 2);
  assert.equal(report.counts.pass, 2);
  assert.equal(report.counts.fail, 0);
  assert.equal(report.counts.notTested, 0);
  assert.equal(report.counts.missing, 0);
  assert.deepEqual(report.issues, []);
  assert.deepEqual(report.apis.map((api) => [api.apiLevel, api.status]), [
    [30, 'PASS'],
    [35, 'PASS']
  ]);
});

test('a missing API cell is NOT_TESTED and can never become a false PASS', async () => {
  const { buildE2eMatrix } = await import(MODULE_PATH);

  const report = buildE2eMatrix({
    records: [record(30)],
    expectedSha: SHA_A
  });

  assert.equal(report.status, 'INCOMPLETE');
  assert.equal(report.ok, false);
  assert.equal(report.counts.pass, 1);
  assert.equal(report.counts.notTested, 1);
  assert.equal(report.counts.missing, 1);

  const api35 = cell(report, 35);
  assert.equal(api35.outcome, 'NOT_TESTED');
  assert.equal(api35.sourceSha, null);
  assert.ok(api35.reasons.includes('missing_observation'));
  assert.equal(report.apis.find((api) => api.apiLevel === 35).status, 'INCOMPLETE');
  assert.ok(report.issues.some((issue) => issue.code === 'missing_observation' && issue.apiLevel === 35));
});

test('explicit FAIL outcomes stay FAIL and dominate the matrix verdict', async () => {
  const { buildE2eMatrix } = await import(MODULE_PATH);

  const report = buildE2eMatrix({
    records: [record(30), record(35, { outcome: 'FAIL' })],
    expectedSha: SHA_A
  });

  assert.equal(report.status, 'FAIL');
  assert.equal(report.ok, false);
  assert.equal(cell(report, 35).outcome, 'FAIL');
  assert.equal(report.counts.fail, 1);
  assert.equal(report.apis.find((api) => api.apiLevel === 35).status, 'FAIL');
});

test('SHA mismatches, shortened hashes and missing hashes fail closed', async () => {
  const { buildE2eMatrix, normalizeSha, isExactSha } = await import(MODULE_PATH);

  assert.equal(normalizeSha('  ' + SHA_A.toUpperCase() + '  '), SHA_A);
  assert.equal(normalizeSha(SHA_64), SHA_64.toLowerCase());
  assert.equal(normalizeSha('abc1234'), null);
  assert.equal(normalizeSha(null), null);
  assert.equal(isExactSha(SHA_A), true);
  assert.equal(isExactSha('abc1234'), false);
  assert.equal(isExactSha(42), false);

  const mismatch = buildE2eMatrix({
    records: [record(30), record(35, { sha: SHA_B })],
    expectedSha: SHA_A
  });
  assert.equal(mismatch.status, 'FAIL');
  assert.equal(cell(mismatch, 35).outcome, 'NOT_TESTED');
  assert.ok(cell(mismatch, 35).reasons.includes('sha_mismatch'));
  assert.equal(mismatch.counts.shaMismatch, 1);
  assert.ok(mismatch.issues.some((issue) => issue.code === 'sha_mismatch' && issue.apiLevel === 35));

  const shortSha = buildE2eMatrix({
    records: [record(30, { sha: 'abc1234' }), record(35, { sha: '' })]
  });
  assert.equal(shortSha.status, 'INCOMPLETE');
  assert.equal(cell(shortSha, 30).outcome, 'NOT_TESTED');
  assert.ok(cell(shortSha, 30).reasons.includes('invalid_sha'));
  assert.ok(cell(shortSha, 35).reasons.includes('missing_sha'));
  assert.equal(shortSha.counts.pass, 0);

  const inconsistent = buildE2eMatrix({
    records: [record(30, { sha: SHA_A }), record(35, { sha: SHA_B })]
  });
  assert.equal(inconsistent.status, 'FAIL');
  assert.equal(inconsistent.expectedSha, null);
  assert.deepEqual(inconsistent.sha.observed, [SHA_A, SHA_B]);
  assert.ok(inconsistent.issues.some((issue) => issue.code === 'sha_inconsistent'));
});

test('duplicate observations are counted, but conflicting duplicates fail closed', async () => {
  const { buildE2eMatrix } = await import(MODULE_PATH);

  const repeated = buildE2eMatrix({
    records: [record(30), record(30), record(35), record(35)],
    expectedSha: SHA_A
  });
  assert.equal(repeated.status, 'PASS');
  assert.equal(repeated.counts.duplicates, 2);
  assert.equal(repeated.counts.conflicts, 0);

  const conflicting = buildE2eMatrix({
    records: [record(30), record(30, { outcome: 'FAIL' }), record(35)],
    expectedSha: SHA_A
  });
  assert.equal(conflicting.status, 'FAIL');
  assert.equal(conflicting.counts.conflicts, 1);
  const api30 = cell(conflicting, 30);
  assert.equal(api30.outcome, 'NOT_TESTED');
  assert.ok(api30.reasons.includes('conflicting_observations'));
  assert.equal(api30.observations.length, 2);
  assert.ok(conflicting.issues.some((issue) => issue.code === 'conflicting_observations'));
});

test('field aliases, inferred checks, explicit success pairs and 64-char SHAs are supported', async () => {
  const { buildE2eMatrix } = await import(MODULE_PATH);

  const report = buildE2eMatrix([
    { api: 30, name: 'startup', result: 'success', commit: ' ' + SHA_A + ' ' },
    { api: 35, name: 'startup', result: 'passed', commit: SHA_A.toUpperCase() },
    { api: 30, name: 'restart', result: 'ok', commit: SHA_A },
    { api: 35, name: 'restart', result: 'PASS', commit: SHA_A },
    { apiLevel: 35, check: 'bootstrap', status: 'completed', conclusion: 'success', sourceSha: SHA_64 }
  ]);

  assert.deepEqual(report.apiLevels, [30, 35]);
  assert.deepEqual(report.checks, ['bootstrap', 'restart', 'startup']);
  assert.equal(cell(report, 35, 'bootstrap').outcome, 'PASS');
  assert.equal(cell(report, 35, 'startup').sourceSha, SHA_A);
  assert.equal(cell(report, 30, 'restart').outcome, 'PASS');
  assert.equal(report.status, 'FAIL');
  assert.ok(report.issues.some((issue) => issue.code === 'sha_inconsistent'));
  assert.deepEqual(report.sha.observed, [SHA_A, SHA_64.toLowerCase()]);
});

test('APK digests are validated when supplied and when an exact APK SHA is required', async () => {
  const { buildE2eMatrix } = await import(MODULE_PATH);

  const verified = buildE2eMatrix({
    records: [record(30, { apkSha: APK_A }), record(35, { apkSha: APK_A })],
    expectedSha: SHA_A,
    expectedApkSha: APK_A
  });
  assert.equal(verified.status, 'PASS');
  assert.equal(verified.sha.apkExpected, APK_A);
  assert.deepEqual(verified.sha.apkObserved, [APK_A]);
  assert.equal(cell(verified, 30).apkShaMatch, true);

  const missing = buildE2eMatrix({
    records: [record(30), record(35)],
    expectedSha: SHA_A,
    expectedApkSha: APK_A
  });
  assert.equal(missing.status, 'INCOMPLETE');
  assert.equal(cell(missing, 30).outcome, 'NOT_TESTED');
  assert.ok(cell(missing, 30).reasons.includes('missing_apk_sha'));

  const mismatch = buildE2eMatrix({
    records: [record(30, { apkSha: 'e'.repeat(64) }), record(35, { apkSha: APK_A })],
    expectedSha: SHA_A,
    expectedApkSha: APK_A
  });
  assert.equal(mismatch.status, 'FAIL');
  assert.ok(cell(mismatch, 30).reasons.includes('apk_sha_mismatch'));
  assert.ok(mismatch.issues.some((issue) => issue.code === 'apk_sha_mismatch' && issue.apiLevel === 30));

  const invalid = buildE2eMatrix({
    records: [record(30, { apkSha: 'not-a-digest' }), record(35, { apkSha: APK_A })],
    expectedSha: SHA_A
  });
  assert.equal(cell(invalid, 30).outcome, 'NOT_TESTED');
  assert.ok(cell(invalid, 30).reasons.includes('invalid_apk_sha'));
});

test('results are deterministic, read-only and never mutate the input observations', async () => {
  const { buildE2eMatrix, summarizeE2eMatrix } = await import(MODULE_PATH);
  const records = Object.freeze([Object.freeze(record(30)), Object.freeze(record(35))]);
  const before = JSON.stringify(records);

  const first = buildE2eMatrix({ records, expectedSha: SHA_A });
  const second = buildE2eMatrix({ records, expectedSha: SHA_A });

  assert.equal(JSON.stringify(records), before);
  assert.deepEqual(first, second);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.cells), true);
  assert.deepEqual(summarizeE2eMatrix(first), first.summary);
  assert.equal(first.summary.status, 'PASS');
  assert.equal(first.summary.expectedSha, SHA_A);
});

test('formatted reports are stable, summary-only text with no network hints', async () => {
  const { buildE2eMatrix, formatE2eMatrix } = await import(MODULE_PATH);

  const passing = formatE2eMatrix(buildE2eMatrix({ records: [record(30), record(35)], expectedSha: SHA_A }));
  const failing = formatE2eMatrix(buildE2eMatrix({
    records: [record(30), record(35, { outcome: 'FAIL' })],
    expectedSha: SHA_A
  }));

  assert.equal(typeof passing, 'string');
  assert.match(passing, /Status: PASS/);
  assert.match(passing, /API 30: PASS/);
  assert.match(passing, new RegExp(SHA_A));
  assert.match(failing, /Status: FAIL/);
  assert.match(failing, /API 35: FAIL/);
  assert.equal(failing, formatE2eMatrix(buildE2eMatrix({
    records: [record(30), record(35, { outcome: 'FAIL' })],
    expectedSha: SHA_A
  })));
  assert.ok(!/https?:\/\//.test(passing));
  assert.ok(!/https?:\/\//.test(failing));
  assert.throws(() => formatE2eMatrix(null), TypeError);
  assert.throws(() => formatE2eMatrix({}), TypeError);
});

test('invalid inputs fail closed with TypeError instead of inventing a matrix', async () => {
  const { buildE2eMatrix, evaluateE2eRecord } = await import(MODULE_PATH);

  assert.throws(() => buildE2eMatrix(), TypeError);
  assert.throws(() => buildE2eMatrix(null), TypeError);
  assert.throws(() => buildE2eMatrix('records'), TypeError);
  assert.throws(() => buildE2eMatrix({ records: null }), TypeError);
  assert.throws(() => buildE2eMatrix({ records: [null] }), TypeError);
  assert.throws(() => buildE2eMatrix({ records: [{}] }), /apiLevel/i);
  assert.throws(() => buildE2eMatrix({ records: [], apiLevels: [] }), TypeError);
  assert.throws(() => buildE2eMatrix({ records: [], apiLevels: [30, '35'] }), TypeError);
  assert.throws(() => buildE2eMatrix({ records: [], checks: [] }), TypeError);
  assert.throws(() => buildE2eMatrix({ records: [], checks: [''] }), TypeError);
  assert.throws(() => buildE2eMatrix({ records: [], expectedSha: 'abc1234' }), TypeError);
  assert.throws(() => buildE2eMatrix({ records: [], expectedApkSha: 'abc1234' }), TypeError);
  assert.throws(() => evaluateE2eRecord(null), TypeError);
  assert.throws(() => evaluateE2eRecord({}), /apiLevel/i);

  const empty = buildE2eMatrix({ records: [] });
  assert.equal(empty.status, 'INCOMPLETE');
  assert.equal(empty.ok, false);
  assert.equal(empty.cells.length, 2);
  assert.equal(empty.counts.missing, 2);
});

test('module is standalone ESM with no networking, storage, clock, crypto or dependency side effects', async () => {
  const ns = await import(MODULE_PATH);

  assert.deepEqual(Object.keys(ns).sort(), [
    'DEFAULT_CHECK',
    'OUTCOMES',
    'REQUIRED_API_LEVELS',
    'VERDICTS',
    'VERSION',
    'buildE2eMatrix',
    'evaluateE2eRecord',
    'formatE2eMatrix',
    'isExactSha',
    'normalizeSha',
    'summarizeE2eMatrix'
  ]);
  assert.equal(ns.VERSION, 1);
  assert.deepEqual(ns.REQUIRED_API_LEVELS, [30, 35]);
  assert.deepEqual(ns.OUTCOMES, ['PASS', 'FAIL', 'NOT_TESTED']);
  assert.equal(Object.isFrozen(ns.REQUIRED_API_LEVELS), true);
  assert.equal(Object.isFrozen(ns.OUTCOMES), true);
  assert.equal(Object.isFrozen(ns.VERDICTS), true);

  const source = fs.readFileSync(MODULE_FILE, 'utf8');
  assert.ok(/^export\s+/m.test(source), 'ESM exports required');
  assert.ok(!/\brequire\s*\(/.test(source), 'no CommonJS require');
  assert.ok(!/^\s*import\s+/m.test(source), 'no imports or external dependencies');
  assert.ok(!/XMLHttpRequest|WebSocket|\bfetch\s*\(/.test(source), 'no networking');
  assert.ok(!/localStorage|sessionStorage|indexedDB/.test(source), 'no persistence');
  assert.ok(!/Date\.now|new Date|Math\.random|setTimeout|setInterval/.test(source), 'no clock or scheduling');
  assert.ok(!/node:fs|node:https|node:http|node:net|node:crypto/.test(source), 'no Node runtime modules');
});
