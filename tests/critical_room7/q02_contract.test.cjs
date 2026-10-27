'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const MODULE = '../../tools/critical_room7/native_ack_failure_matrix.mjs';
const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);
const APK_A = 'c'.repeat(64);
const API_LEVELS = [30, 35];

async function load() {
  return import(MODULE);
}

function makeRecord(testCase, apiLevel, overrides = {}) {
  const record = {
    id: testCase.id,
    apiLevel,
    sha: SHA_A,
    apkSha: APK_A
  };
  for (const check of testCase.checks) record[check.key] = check.equals;
  return Object.assign(record, overrides);
}

function allRecords(cases, apiLevels = API_LEVELS, overridesById = {}) {
  const records = [];
  for (const apiLevel of apiLevels) {
    for (const testCase of cases) {
      const specific = typeof overridesById[testCase.id] === 'function'
        ? overridesById[testCase.id](apiLevel)
        : (overridesById[testCase.id] || {});
      records.push(makeRecord(testCase, apiLevel, { ...(overridesById['*'] || {}), ...specific }));
    }
  }
  return records;
}

function build(module, cases, records, options = {}) {
  return module.buildAckSafWalMatrix({
    records,
    expectedSha: SHA_A,
    expectedApkSha: APK_A,
    ...options
  });
}

function cell(report, caseId, apiLevel) {
  return report.cells.find((entry) => entry.caseId === caseId && entry.apiLevel === apiLevel);
}

test('Q02 matrix has stable ACK, SAF and WAL cases with explicit states', async () => {
  const module = await load();

  assert.equal(module.SCHEMA_VERSION, 1);
  assert.equal(module.VERSION, 1);
  assert.deepEqual([...module.OUTCOMES], ['PASS', 'FAIL', 'NOT_TESTED']);
  assert.deepEqual([...module.REQUIRED_API_LEVELS], API_LEVELS);
  assert.deepEqual([...module.LAYERS], ['ACK', 'SAF', 'WAL']);
  assert.equal(Object.isFrozen(module.CASE_MATRIX), true);
  assert.ok(module.CASE_MATRIX.length >= 12 && module.CASE_MATRIX.length <= 30);

  const ids = module.CASE_MATRIX.map((entry) => entry.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const layer of module.LAYERS) {
    assert.ok(module.CASE_MATRIX.filter((entry) => entry.layer === layer).length >= 3);
  }
  for (const testCase of module.CASE_MATRIX) {
    assert.equal(Object.isFrozen(testCase), true);
    assert.equal(typeof testCase.title, 'string');
    assert.ok(testCase.title.length > 0);
    assert.ok(Array.isArray(testCase.checks) && testCase.checks.length > 0);
    assert.equal(new Set(testCase.checks.map((check) => check.key)).size, testCase.checks.length);
    for (const check of testCase.checks) {
      assert.equal(typeof check.key, 'string');
      assert.ok(Object.prototype.hasOwnProperty.call(check, 'equals'));
    }
  }
});

test('Q02 complete exact-SHA API30/API35 evidence is PASS but never release approval', async () => {
  const module = await load();
  const report = build(module, module.CASE_MATRIX, allRecords(module.CASE_MATRIX));

  assert.equal(report.overall, 'PASS');
  assert.equal(report.ok, true);
  assert.equal(report.releaseApproved, false);
  assert.equal(report.sha.expected, SHA_A);
  assert.equal(report.sha.exact, true);
  assert.deepEqual(report.apiLevels, API_LEVELS);
  assert.equal(report.counts.cells, module.CASE_MATRIX.length * API_LEVELS.length);
  assert.equal(report.counts.pass, report.counts.cells);
  assert.equal(report.counts.fail, 0);
  assert.equal(report.counts.notTested, 0);
  assert.equal(report.counts.missing, 0);
  assert.deepEqual(report.apis.map((entry) => [entry.apiLevel, entry.outcome]), [
    [30, 'PASS'],
    [35, 'PASS']
  ]);
  for (const layer of module.LAYERS) {
    const summary = report.layers.find((entry) => entry.layer === layer);
    assert.equal(summary.outcome, 'PASS');
    assert.equal(summary.counts.cells, module.CASE_MATRIX.filter((entry) => entry.layer === layer).length * API_LEVELS.length);
  }
});

test('Q02 missing evidence is NOT_TESTED and cannot be promoted to PASS', async () => {
  const module = await load();
  const missingId = module.CASE_MATRIX[0].id;
  const records = allRecords(module.CASE_MATRIX)
    .filter((record) => !(record.id === missingId && record.apiLevel === 35));
  const report = build(module, module.CASE_MATRIX, records);
  const missing = cell(report, missingId, 35);

  assert.equal(report.overall, 'NOT_TESTED');
  assert.equal(report.ok, false);
  assert.equal(report.counts.missing, 1);
  assert.equal(report.counts.notTested, 1);
  assert.equal(report.counts.fail, 0);
  assert.equal(missing.outcome, 'NOT_TESTED');
  assert.ok(missing.reasons.includes('missing_evidence'));
});

test('Q02 a native ACK that claims success without byte-verified readback is FAIL', async () => {
  const module = await load();
  const ack = module.CASE_MATRIX.find((entry) => entry.id === 'ACK-01');
  assert.ok(ack);
  assert.ok(ack.checks.some((check) => check.key === 'readbackMatch'));

  const records = allRecords(module.CASE_MATRIX, API_LEVELS, {
    'ACK-01': (apiLevel) => (apiLevel === 35 ? { readbackMatch: false } : {})
  });
  const report = build(module, module.CASE_MATRIX, records);
  const failed = cell(report, 'ACK-01', 35);

  assert.equal(report.overall, 'FAIL');
  assert.equal(report.ok, false);
  assert.equal(report.counts.fail, 1);
  assert.equal(failed.outcome, 'FAIL');
  assert.ok(failed.reasons.includes('check_failed:readbackMatch'));
  assert.equal(failed.checks.find((check) => check.key === 'readbackMatch').outcome, 'FAIL');
});

test('Q02 unsafe ACK acceptance of an invalid packet is FAIL, not PASS', async () => {
  const module = await load();
  const ack = module.CASE_MATRIX.find((entry) => entry.id === 'ACK-02');
  assert.ok(ack);
  assert.ok(ack.checks.some((check) => check.key === 'nativeAck' && check.equals === false));

  const records = allRecords(module.CASE_MATRIX, API_LEVELS, {
    'ACK-02': { nativeAck: true }
  });
  const report = build(module, module.CASE_MATRIX, records);

  assert.equal(report.overall, 'FAIL');
  assert.equal(report.counts.fail, 2);
  for (const apiLevel of API_LEVELS) {
    assert.equal(cell(report, 'ACK-02', apiLevel).outcome, 'FAIL');
  }
});

test('Q02 SAF false success, cancelled picker mutation and WAL unverified rollback are FAIL', async () => {
  const module = await load();
  const records = allRecords(module.CASE_MATRIX, API_LEVELS, {
    'SAF-02': (apiLevel) => (apiLevel === 30 ? { targetUnchanged: false } : {}),
    'SAF-03': (apiLevel) => (apiLevel === 35 ? { receiptStatus: 'saved' } : {}),
    'WAL-02': (apiLevel) => (apiLevel === 30 ? { originalBytesPreserved: false } : {}),
    'WAL-04': (apiLevel) => (apiLevel === 35 ? { recoveryBlocked: false } : {})
  });
  const report = build(module, module.CASE_MATRIX, records);

  assert.equal(report.overall, 'FAIL');
  assert.equal(report.counts.fail, 4);
  assert.equal(cell(report, 'SAF-02', 30).outcome, 'FAIL');
  assert.equal(cell(report, 'SAF-03', 35).outcome, 'FAIL');
  assert.equal(cell(report, 'WAL-02', 30).outcome, 'FAIL');
  assert.equal(cell(report, 'WAL-04', 35).outcome, 'FAIL');
});

test('Q02 missing, malformed or mismatched SHA evidence fails closed to NOT_TESTED', async () => {
  const module = await load();
  const cases = module.CASE_MATRIX;
  const missing = build(module, cases, allRecords(cases, API_LEVELS, { '*': { sha: undefined } }));
  assert.equal(missing.overall, 'NOT_TESTED');
  assert.equal(missing.counts.pass, 0);
  assert.ok(missing.cells.every((entry) => entry.outcome === 'NOT_TESTED'));
  assert.ok(missing.cells.every((entry) => entry.reasons.includes('missing_sha')));

  const mismatched = build(module, cases, allRecords(cases, API_LEVELS, { '*': { sha: SHA_B } }));
  assert.equal(mismatched.overall, 'NOT_TESTED');
  assert.equal(mismatched.counts.pass, 0);
  assert.equal(mismatched.counts.shaMismatch, cases.length * API_LEVELS.length);
  assert.ok(mismatched.cells.every((entry) => entry.reasons.includes('sha_mismatch')));

  const shortened = build(module, cases, allRecords(cases, API_LEVELS, { '*': { sha: 'abc1234' } }));
  assert.equal(shortened.overall, 'NOT_TESTED');
  assert.equal(shortened.counts.pass, 0);
  assert.ok(shortened.cells.every((entry) => entry.reasons.includes('invalid_sha')));
});

test('Q02 transport, ADB, CDP and automation failures stay NOT_TESTED, not app FAIL', async () => {
  const module = await load();
  const records = allRecords(module.CASE_MATRIX, API_LEVELS, {
    'ACK-04': (apiLevel) => (apiLevel === 35
      ? { transportError: true, failureKind: 'adb_offline', detail: 'adb device offline' }
      : {}),
    'SAF-01': (apiLevel) => (apiLevel === 30
      ? { transportFailure: true, failureKind: 'cdp', detail: 'no WebView CDP target' }
      : {})
  });
  const report = build(module, module.CASE_MATRIX, records);

  assert.equal(report.overall, 'NOT_TESTED');
  assert.equal(report.counts.fail, 0);
  assert.equal(cell(report, 'ACK-04', 35).outcome, 'NOT_TESTED');
  assert.equal(cell(report, 'SAF-01', 30).outcome, 'NOT_TESTED');
  assert.ok(report.infrastructure.some((entry) => entry.classification === 'ADB_INFRA'));
  assert.ok(report.infrastructure.some((entry) => entry.classification === 'CDP_INFRA'));
});

test('Q02 absent required observations are NOT_TESTED even when the rest of a case looks healthy', async () => {
  const module = await load();
  const records = allRecords(module.CASE_MATRIX, API_LEVELS, {
    'ACK-01': (apiLevel) => (apiLevel === 30 ? { readbackMatch: undefined } : {})
  });
  const report = build(module, module.CASE_MATRIX, records);
  const partial = cell(report, 'ACK-01', 30);

  assert.equal(report.overall, 'NOT_TESTED');
  assert.equal(partial.outcome, 'NOT_TESTED');
  assert.ok(partial.reasons.includes('missing_checks:readbackMatch'));
  assert.equal(partial.checks.find((check) => check.key === 'readbackMatch').outcome, 'NOT_TESTED');
});

test('Q02 an unrecognized declared outcome is NOT_TESTED instead of being ignored', async () => {
  const module = await load();
  const records = allRecords(module.CASE_MATRIX, API_LEVELS, {
    'WAL-01': (apiLevel) => (apiLevel === 30 ? { status: 'mysterious' } : {})
  });
  const report = build(module, module.CASE_MATRIX, records);
  const unknown = cell(report, 'WAL-01', 30);

  assert.equal(report.overall, 'NOT_TESTED');
  assert.equal(unknown.outcome, 'NOT_TESTED');
  assert.ok(unknown.reasons.includes('invalid_outcome'));
});

test('Q02 duplicate evidence is deduplicated but conflicting duplicates fail closed', async () => {
  const module = await load();
  const repeated = allRecords(module.CASE_MATRIX);
  const original = repeated.find((record) => record.id === 'ACK-01' && record.apiLevel === 30);
  repeated.push({ ...original });
  const repeatedReport = build(module, module.CASE_MATRIX, repeated);
  assert.equal(repeatedReport.overall, 'PASS');
  assert.equal(repeatedReport.counts.duplicates, 1);
  assert.equal(repeatedReport.counts.conflicts, 0);

  repeated.push({ ...original, readbackMatch: false });
  const conflictingReport = build(module, module.CASE_MATRIX, repeated);
  const conflict = cell(conflictingReport, 'ACK-01', 30);
  assert.equal(conflictingReport.overall, 'NOT_TESTED');
  assert.equal(conflictingReport.counts.conflicts, 1);
  assert.equal(conflict.outcome, 'NOT_TESTED');
  assert.ok(conflict.reasons.includes('conflicting_observations'));
});

test('Q02 report is deterministic, read-only and supports a focused API level', async () => {
  const module = await load();
  const records = allRecords(module.CASE_MATRIX, [30]);
  const before = JSON.stringify(records);
  const first = build(module, module.CASE_MATRIX, records, { apiLevels: [30] });
  const second = build(module, module.CASE_MATRIX, records, { apiLevels: [30] });

  assert.equal(JSON.stringify(records), before);
  assert.deepEqual(first, second);
  assert.equal(first.overall, 'PASS');
  assert.deepEqual(first.apiLevels, [30]);
  assert.equal(first.counts.cells, module.CASE_MATRIX.length);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.cells), true);
  assert.equal(module.formatAckSafWalMatrix(first), module.formatAckSafWalMatrix(second));
  assert.deepEqual(module.summarizeAckSafWalMatrix(first), first.summary);
});

test('Q02 malformed and unknown evidence never throws or manufactures PASS', async () => {
  const module = await load();
  const report = build(module, module.CASE_MATRIX, [
    null,
    42,
    'junk',
    { id: 'UNKNOWN-CASE', apiLevel: 30, sha: SHA_A }
  ]);

  assert.equal(report.overall, 'NOT_TESTED');
  assert.equal(report.counts.pass, 0);
  assert.equal(report.counts.cells, module.CASE_MATRIX.length * API_LEVELS.length);
  assert.ok(report.issues.some((issue) => issue.code === 'unknown_case'));
  assert.ok(report.issues.some((issue) => issue.code === 'malformed_record'));
});
