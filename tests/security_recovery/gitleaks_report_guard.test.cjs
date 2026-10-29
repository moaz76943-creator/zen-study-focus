'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {parseAndAuditGitleaksReport} = require('../../tools/security/gitleaks_report_guard.cjs');

function report(contents, exitCode) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'df-security-report-'));
  try {
    const filename = path.join(directory, 'report.json');
    fs.writeFileSync(filename, contents, {mode: 0o600});
    return parseAndAuditGitleaksReport(filename, exitCode);
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
}

test('scanner findings exit with an empty array cannot certify a clean scan', () => {
  const result = report('[]', 1);
  assert.equal(result.clean, false);
  assert.equal(result.status, 'BLOCKED_SCANNER_ERROR');
});

test('empty or whitespace-only reports are invalid evidence', () => {
  for (const contents of ['', ' \n\t']) {
    const result = report(contents, 0);
    assert.equal(result.clean, false);
    assert.equal(result.status, 'BLOCKED_MALFORMED_REPORT');
  }
});

test('malformed report diagnostics never contain parser snippets', () => {
  for (const contents of ['SYNTHETIC_REPORT_CONTENT', '[{"Secret":"SYNTHETIC_REPORT_CONTENT"}, invalid]']) {
    const result = report(contents, 1);
    assert.equal(result.status, 'BLOCKED_MALFORMED_REPORT');
    assert.equal(result.reason, 'Malformed JSON in Gitleaks report');
  }
});

test('invalid finding rows are blocked without exceptions or clean results', () => {
  for (const contents of ['[null]', '["synthetic"]', '[[]]', '[42]']) {
    const result = report(contents, 1);
    assert.equal(result.status, 'BLOCKED_MALFORMED_REPORT');
    assert.equal(result.clean, false);
  }
});

test('only an explicit empty array with successful scanner exit is clean', () => {
  assert.equal(report('[]', 0).status, 'PASS');
  const result = report('[{"RuleID":"generic-api-key","File":"synthetic.env","StartLine":1,"Secret":"synthetic-private-value"}]', 0);
  assert.equal(result.status, 'FAIL');
  assert.equal(result.clean, false);
  assert.equal(JSON.stringify(result).includes('synthetic-private-value'), false);
});
