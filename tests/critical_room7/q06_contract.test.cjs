'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const MODULE = '../../tools/critical_room7/notes_touch_accessibility_matrix.mjs';
const SOURCE = path.resolve(__dirname, MODULE);
const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);
const APK_A = 'c'.repeat(64);
const WIDTHS = [320, 360, 393, 430];

async function load() {
  return import(MODULE);
}

function makeRecord(testCase, width, overrides = {}) {
  const record = {
    caseId: testCase.id,
    width,
    device: 'Pixel 6 API 35 real device',
    sha: SHA_A,
    apkSha: APK_A
  };
  for (const check of testCase.checks) {
    record[check.key] = check.atLeast === undefined ? check.equals : check.atLeast;
  }
  return Object.assign(record, overrides);
}

function allRecords(cases, widths = WIDTHS, overridesById = {}) {
  const records = [];
  for (const width of widths) {
    for (const testCase of cases) {
      const specific = typeof overridesById[testCase.id] === 'function'
        ? overridesById[testCase.id](width)
        : (overridesById[testCase.id] || {});
      records.push(makeRecord(testCase, width, { ...(overridesById['*'] || {}), ...specific }));
    }
  }
  return records;
}

function build(module, records, options = {}) {
  return module.buildNotesTouchAccessibilityMatrix({
    records,
    expectedSha: SHA_A,
    expectedApkSha: APK_A,
    ...options
  });
}

function cell(report, caseId, width) {
  return report.cells.find((entry) => entry.caseId === caseId && entry.width === width);
}

test('Q06 exposes a frozen Notes/Tasks matrix for all four widths and scenarios', async () => {
  const module = await load();

  assert.equal(module.SCHEMA_VERSION, 1);
  assert.deepEqual([...module.OUTCOMES], ['PASS', 'FAIL', 'NOT_TESTED']);
  assert.deepEqual([...module.REQUIRED_WIDTHS], WIDTHS);
  assert.deepEqual([...module.SURFACES], ['notes', 'tasks']);
  assert.deepEqual([...module.KINDS], [
    'touch',
    'talkback',
    'force-stop-reopen',
    'talkback-force-stop-reopen'
  ]);
  assert.equal(Object.isFrozen(module.CASE_MATRIX), true);
  assert.equal(module.CASE_MATRIX.length, module.SURFACES.length * module.KINDS.length);

  const ids = module.CASE_MATRIX.map((entry) => entry.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const surface of module.SURFACES) {
    const cases = module.CASE_MATRIX.filter((entry) => entry.surface === surface);
    assert.deepEqual(cases.map((entry) => entry.kind).sort(), [...module.KINDS].sort());
  }
  for (const testCase of module.CASE_MATRIX) {
    assert.equal(Object.isFrozen(testCase), true);
    assert.equal(typeof testCase.title, 'string');
    assert.ok(testCase.title.length > 0);
    assert.ok(Array.isArray(testCase.checks) && testCase.checks.length > 0);
    assert.equal(new Set(testCase.checks.map((check) => check.key)).size, testCase.checks.length);
    for (const check of testCase.checks) {
      assert.equal(typeof check.key, 'string');
      const hasEquals = Object.prototype.hasOwnProperty.call(check, 'equals');
      const hasMinimum = Number.isFinite(check.atLeast);
      assert.equal(hasEquals !== hasMinimum, true, check.key);
    }
  }

  const source = fs.readFileSync(SOURCE, 'utf8');
  assert.match(source, /^export\s+/m);
  assert.doesNotMatch(source, /https?:\/\//);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /\bchild_process\b/);
  assert.doesNotMatch(source, /\bwriteFile|\bappendFile|\bunlink|\brmSync/);
});

test('Q06 complete exact-build evidence is PASS without claiming Android release approval', async () => {
  const module = await load();
  const report = build(module, allRecords(module.CASE_MATRIX));

  assert.equal(report.overall, 'PASS');
  assert.equal(report.ok, true);
  assert.equal(report.androidPass, false);
  assert.equal(report.releaseApproved, false);
  assert.deepEqual(report.widths, WIDTHS);
  assert.equal(report.sha.expected, SHA_A);
  assert.equal(report.sha.exact, true);
  assert.equal(report.sha.apkExact, true);
  assert.equal(report.counts.cells, module.CASE_MATRIX.length * WIDTHS.length);
  assert.equal(report.counts.pass, report.counts.cells);
  assert.equal(report.counts.fail, 0);
  assert.equal(report.counts.notTested, 0);
  assert.equal(report.counts.missing, 0);

  for (const surface of module.SURFACES) {
    const summary = report.surfaces.find((entry) => entry.surface === surface);
    assert.equal(summary.outcome, 'PASS');
    assert.equal(summary.counts.cells, module.KINDS.length * WIDTHS.length);
  }
  for (const entry of report.cells) {
    assert.equal(entry.outcome, 'PASS', `${entry.caseId}@${entry.width}`);
    assert.ok(WIDTHS.includes(entry.width));
    assert.ok(entry.checks.every((check) => check.outcome === 'PASS'));
  }
});

test('Q06 absent evidence or an absent required observation is NOT_TESTED', async () => {
  const module = await load();

  const missingRecord = allRecords(module.CASE_MATRIX)
    .filter((record) => !(record.caseId === 'NOTES-TOUCH' && record.width === 320));
  const missingReport = build(module, missingRecord);
  const missing = cell(missingReport, 'NOTES-TOUCH', 320);

  assert.equal(missingReport.overall, 'NOT_TESTED');
  assert.equal(missingReport.counts.pass, missingReport.counts.cells - 1);
  assert.equal(missingReport.counts.missing, 1);
  assert.equal(missingReport.counts.notTested, 1);
  assert.equal(missingReport.counts.fail, 0);
  assert.equal(missing.outcome, 'NOT_TESTED');
  assert.ok(missing.reasons.includes('missing_evidence'));

  const partialReport = build(module, allRecords(module.CASE_MATRIX, WIDTHS, {
    'NOTES-TOUCH': (width) => (width === 360 ? { savePersisted: undefined } : {})
  }));
  const partial = cell(partialReport, 'NOTES-TOUCH', 360);

  assert.equal(partialReport.overall, 'NOT_TESTED');
  assert.equal(partial.outcome, 'NOT_TESTED');
  assert.ok(partial.reasons.includes('missing_checks:savePersisted'));
  assert.equal(
    partial.checks.find((check) => check.key === 'savePersisted').outcome,
    'NOT_TESTED'
  );
});

test('Q06 flags a 320px Tasks touch target below 48dp as FAIL, not PASS', async () => {
  const module = await load();
  const report = build(module, allRecords(module.CASE_MATRIX, WIDTHS, {
    'TASKS-TOUCH': (width) => (width === 320 ? { minTouchTargetDp: 36 } : {})
  }));

  const failed = cell(report, 'TASKS-TOUCH', 320);
  assert.equal(report.overall, 'FAIL');
  assert.equal(report.ok, false);
  assert.equal(report.counts.fail, 1);
  assert.equal(report.counts.pass, report.counts.cells - 1);
  assert.equal(failed.outcome, 'FAIL');
  assert.ok(failed.reasons.includes('check_failed:minTouchTargetDp'));
  assert.equal(
    failed.checks.find((check) => check.key === 'minTouchTargetDp').outcome,
    'FAIL'
  );
  for (const width of [360, 393, 430]) {
    assert.equal(cell(report, 'TASKS-TOUCH', width).outcome, 'PASS');
  }
});

test('Q06 TalkBack and force-stop failures are app FAIL while transport failure is NOT_TESTED', async () => {
  const module = await load();
  const report = build(module, allRecords(module.CASE_MATRIX, WIDTHS, {
    'NOTES-TALKBACK': (width) => (width === 360 ? { accessibleNameNonEmpty: false } : {}),
    'TASKS-REOPEN': (width) => (width === 393 ? { recordPresentAfterReopen: false } : {}),
    'NOTES-TOUCH': (width) => (width === 430
      ? { transportError: true, failureKind: 'adb_offline', detail: 'adb device offline' }
      : {})
  }));

  assert.equal(report.overall, 'FAIL');
  assert.equal(report.counts.fail, 2);
  assert.equal(report.counts.notTested, 1);
  assert.equal(cell(report, 'NOTES-TALKBACK', 360).outcome, 'FAIL');
  assert.equal(cell(report, 'TASKS-REOPEN', 393).outcome, 'FAIL');
  assert.equal(cell(report, 'NOTES-TOUCH', 430).outcome, 'NOT_TESTED');
  assert.ok(report.infrastructure.some((entry) => entry.classification === 'ADB_INFRA'));
});

test('Q06 SHA, APK, device, width and malformed evidence fail closed to NOT_TESTED', async () => {
  const module = await load();
  const cases = module.CASE_MATRIX;

  const missingSha = build(module, allRecords(cases, WIDTHS, { '*': { sha: undefined } }));
  assert.equal(missingSha.overall, 'NOT_TESTED');
  assert.equal(missingSha.counts.pass, 0);
  assert.ok(missingSha.cells.every((entry) => entry.reasons.includes('missing_sha')));

  const mismatched = build(module, allRecords(cases, WIDTHS, { '*': { sha: SHA_B } }));
  assert.equal(mismatched.overall, 'NOT_TESTED');
  assert.equal(mismatched.counts.pass, 0);
  assert.equal(mismatched.counts.shaMismatch, cases.length * WIDTHS.length);

  const missingApk = build(module, allRecords(cases, WIDTHS, { '*': { apkSha: undefined } }));
  assert.equal(missingApk.overall, 'NOT_TESTED');
  assert.ok(missingApk.cells.every((entry) => entry.reasons.includes('missing_apk_sha')));

  const missingDevice = build(module, allRecords(cases, WIDTHS, { '*': { device: '' } }));
  assert.equal(missingDevice.overall, 'NOT_TESTED');
  assert.ok(missingDevice.cells.every((entry) => entry.reasons.includes('missing_device')));

  const badWidth = build(module, allRecords(cases, [375]));
  assert.equal(badWidth.overall, 'NOT_TESTED');
  assert.equal(badWidth.counts.pass, 0);
  assert.equal(badWidth.counts.missing, cases.length * WIDTHS.length);
  assert.ok(badWidth.issues.some((issue) => issue.code === 'invalid_width'));

  const malformed = build(module, [
    null,
    42,
    'junk',
    { caseId: 'UNKNOWN-CASE', width: 320, device: 'Pixel', sha: SHA_A, apkSha: APK_A }
  ]);
  assert.equal(malformed.overall, 'NOT_TESTED');
  assert.equal(malformed.counts.pass, 0);
  assert.ok(malformed.issues.some((issue) => issue.code === 'malformed_record'));
  assert.ok(malformed.issues.some((issue) => issue.code === 'unknown_case'));
});

test('Q06 duplicate evidence is deduplicated, conflicts fail closed, and output is deterministic', async () => {
  const module = await load();
  const records = allRecords(module.CASE_MATRIX);
  const original = records.find((record) => record.caseId === 'NOTES-TOUCH' && record.width === 320);
  records.push({ ...original });
  const before = JSON.stringify(records);

  const first = build(module, records);
  const second = build(module, records);

  assert.equal(JSON.stringify(records), before);
  assert.equal(first.overall, 'PASS');
  assert.equal(first.counts.duplicates, 1);
  assert.equal(first.counts.conflicts, 0);
  assert.deepEqual(first, second);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.cells), true);
  assert.equal(Object.isFrozen(first.cells[0]), true);
  assert.deepEqual(module.summarizeNotesTouchAccessibilityMatrix(first), first.summary);
  assert.equal(
    module.formatNotesTouchAccessibilityMatrix(first),
    module.formatNotesTouchAccessibilityMatrix(second)
  );

  const conflictedRecords = [...records, { ...original, minTouchTargetDp: 36 }];
  const conflicted = build(module, conflictedRecords);
  const conflict = cell(conflicted, 'NOTES-TOUCH', 320);

  assert.equal(conflicted.overall, 'NOT_TESTED');
  assert.equal(conflicted.counts.conflicts, 1);
  assert.equal(conflict.outcome, 'NOT_TESTED');
  assert.ok(conflict.reasons.includes('conflicting_observations'));
});
