'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const MODULE = '../../tools/critical_room7/gitleaks_codeql_classifier.mjs';
const SOURCE = path.join(__dirname, MODULE);
const SENTINEL = 'SYNTHETIC_SECRET_DO_NOT_LEAK_9f3c';

test('Q03 Gitleaks keeps verified and unverified findings and never auto-false-positives', async () => {
  const { parseGitleaksJSON, CLASSIFICATIONS, STATUS } = await import(MODULE);

  assert.deepEqual(Object.values(CLASSIFICATIONS).sort(), ['TOOL_FAILURE', 'UNVERIFIED', 'VERIFIED']);
  assert.equal(STATUS.FINDINGS, 'FINDINGS');

  const report = parseGitleaksJSON([
    {
      RuleID: 'aws-access-token',
      File: 'src/config.js',
      StartLine: 12,
      EndLine: 13,
      Secret: SENTINEL,
      Match: SENTINEL,
      Verified: true
    },
    {
      RuleID: 'generic-api-key',
      File: 'src/other.env',
      StartLine: 3,
      Secret: SENTINEL,
      Match: SENTINEL,
      Verified: false,
      FalsePositive: true,
      Suppressed: true
    }
  ], { exitCode: 1 });

  assert.equal(report.status, 'FINDINGS');
  assert.equal(report.classification, 'VERIFIED');
  assert.equal(report.findingsCount, 2);
  assert.deepEqual(report.counts, { verified: 1, unverified: 1, toolFailure: 0 });
  assert.equal(report.findings[0].classification, 'VERIFIED');
  assert.equal(report.findings[0].verified, true);
  assert.equal(report.findings[0].secret, '[REDACTED_SECRET]');
  assert.equal(report.findings[1].classification, 'UNVERIFIED');
  assert.equal(report.findings[1].verified, false);
  assert.equal(report.falsePositiveAutoApplied, false);
  assert.equal(report.releaseApproved, false);
  assert.ok(!JSON.stringify(report).includes(SENTINEL));

  const stringy = parseGitleaksJSON([
    { RuleID: 'generic-api-key', Secret: SENTINEL, Verified: 'true' }
  ], { exitCode: 1 });
  assert.equal(stringy.findings[0].classification, 'UNVERIFIED');
  assert.equal(stringy.counts.verified, 0);
});

test('Q03 Gitleaks hostile metadata cannot leak secrets and paths are fingerprinted', async () => {
  const { parseGitleaksJSON } = await import(MODULE);

  const report = parseGitleaksJSON([{
    RuleID: SENTINEL,
    File: 'src/' + SENTINEL + '.js',
    StartLine: 5,
    EndLine: '7',
    Commit: SENTINEL,
    Description: SENTINEL,
    Match: SENTINEL,
    Secret: SENTINEL,
    Author: SENTINEL,
    Email: SENTINEL,
    Message: SENTINEL,
    Fingerprint: SENTINEL,
    Tags: [SENTINEL]
  }], { exitCode: 1 });

  const finding = report.findings[0];
  assert.equal(finding.ruleId, 'unknown');
  assert.match(finding.pathSha256_16, /^[a-f0-9]{16}$/);
  assert.equal(finding.startLine, 5);
  assert.equal(finding.endLine, 0);
  assert.equal(finding.commit, '');
  assert.ok(!JSON.stringify(report).includes(SENTINEL));
});

test('Q03 Gitleaks malformed, hostile or failed scans are TOOL_FAILURE', async () => {
  const { parseGitleaksJSON } = await import(MODULE);

  const cases = [
    ['', {}],
    ['not json ' + SENTINEL, {}],
    [JSON.stringify({ Secret: SENTINEL }), {}],
    [JSON.stringify([null]), { exitCode: 1 }],
    [JSON.stringify([{ Secret: SENTINEL }]), { exitCode: 2 }],
    ['[]', { exitCode: 1 }],
    [null, {}]
  ];

  for (const [input, options] of cases) {
    const report = parseGitleaksJSON(input, options);
    assert.equal(report.status, 'TOOL_FAILURE');
    assert.equal(report.classification, 'TOOL_FAILURE');
    assert.equal(report.toolFailure, true);
    assert.equal(report.findingsCount, 0);
    assert.deepEqual(report.findings, []);
    assert.equal(report.counts.toolFailure, 1);
    assert.equal(typeof report.reason, 'string');
    assert.ok(!JSON.stringify(report).includes(SENTINEL));
  }
});

test('Q03 Gitleaks CLEAN requires empty findings and successful scanner exit', async () => {
  const { parseGitleaksJSON } = await import(MODULE);

  const report = parseGitleaksJSON('[]', { exitCode: 0 });

  assert.equal(report.status, 'CLEAN');
  assert.equal(report.classification, null);
  assert.equal(report.clean, true);
  assert.equal(report.ok, true);
  assert.equal(report.findingsCount, 0);
  assert.deepEqual(report.counts, { verified: 0, unverified: 0, toolFailure: 0 });
  assert.equal(report.releaseApproved, false);
  assert.equal(report.falsePositiveAutoApplied, false);
});

test('Q03 CodeQL findings are redacted and default to UNVERIFIED', async () => {
  const { parseCodeQLJSON } = await import(MODULE);

  const report = parseCodeQLJSON({
    version: '2.1.0',
    runs: [{
      tool: { driver: { name: 'CodeQL' } },
      results: [{
        ruleId: 'js/sql-injection',
        message: { text: SENTINEL },
        locations: [{
          physicalLocation: {
            artifactLocation: { uri: 'src/' + SENTINEL + '.js' },
            region: { startLine: 42 }
          }
        }],
        suppressions: [{ kind: 'inSource' }],
        baselineState: 'unchanged'
      }]
    }]
  });

  assert.equal(report.status, 'FINDINGS');
  assert.equal(report.classification, 'UNVERIFIED');
  assert.equal(report.findingsCount, 1);
  assert.deepEqual(report.counts, { verified: 0, unverified: 1, toolFailure: 0 });

  const finding = report.findings[0];
  assert.equal(finding.ruleId, 'js/sql-injection');
  assert.equal(finding.classification, 'UNVERIFIED');
  assert.equal(finding.verified, false);
  assert.equal(finding.startLine, 42);
  assert.match(finding.pathSha256_16, /^[a-f0-9]{16}$/);
  assert.equal(report.falsePositiveAutoApplied, false);
  assert.ok(!JSON.stringify(report).includes(SENTINEL));
});

test('Q03 CodeQL ruleIndex resolution is safe and unsafe identifiers stay bounded', async () => {
  const { parseCodeQLJSON } = await import(MODULE);

  const report = parseCodeQLJSON({
    version: '2.1.0',
    runs: [{
      tool: { driver: { name: 'CodeQL', rules: [{ id: 'js/sql-injection' }] } },
      results: [
        { ruleIndex: 0, message: { text: SENTINEL } },
        { ruleId: SENTINEL, message: { text: SENTINEL } },
        { ruleId: 'js/unsafe.rule', message: { text: SENTINEL } }
      ]
    }]
  });

  assert.equal(report.findingsCount, 3);
  assert.deepEqual(report.findings.map((finding) => finding.ruleId), [
    'js/sql-injection',
    'unknown',
    'unknown'
  ]);
  assert.ok(!JSON.stringify(report).includes(SENTINEL));

  for (const result of [
    { ruleIndex: 1 },
    { ruleIndex: true },
    { ruleIndex: -1 },
    { ruleIndex: 0, ruleId: 'js/code-injection' }
  ]) {
    const failed = parseCodeQLJSON({
      version: '2.1.0',
      runs: [{
        tool: { driver: { name: 'CodeQL', rules: [{ id: 'js/sql-injection' }] } },
        results: [result]
      }]
    });
    assert.equal(failed.status, 'TOOL_FAILURE');
    assert.equal(failed.reason, 'INVALID_CODEQL_SARIF');
  }
});

test('Q03 CodeQL malformed or non-CodeQL SARIF is TOOL_FAILURE', async () => {
  const { parseCodeQLJSON } = await import(MODULE);

  const inputs = [
    null,
    'invalid ' + SENTINEL,
    {},
    { version: '2.0.0', runs: [{ tool: { driver: { name: 'CodeQL' } }, results: [] }] },
    { version: '2.1.0', runs: [] },
    { version: '2.1.0', runs: [{ tool: { driver: { name: 'NotCodeQL' } }, results: [] }] },
    { version: '2.1.0', runs: [{ tool: { driver: { name: 'CodeQL' } } }] },
    { version: '2.1.0', runs: [{ tool: { driver: { name: 'CodeQL' } }, results: [null] }] }
  ];

  for (const input of inputs) {
    const report = parseCodeQLJSON(input);
    assert.equal(report.status, 'TOOL_FAILURE');
    assert.equal(report.classification, 'TOOL_FAILURE');
    assert.equal(report.findingsCount, 0);
    assert.ok(!JSON.stringify(report).includes(SENTINEL));
  }
});

test('Q03 CodeQL empty valid SARIF is CLEAN but not release approval', async () => {
  const { parseCodeQLJSON } = await import(MODULE);

  const report = parseCodeQLJSON({
    version: '2.1.0',
    runs: [{ tool: { driver: { name: 'CodeQL' } }, results: [] }]
  });

  assert.equal(report.status, 'CLEAN');
  assert.equal(report.classification, null);
  assert.equal(report.clean, true);
  assert.equal(report.findingsCount, 0);
  assert.equal(report.releaseApproved, false);
});

test('Q03 parsers are offline, deterministic, non-mutating and frozen', async () => {
  const { parseGitleaksJSON, parseCodeQLJSON } = await import(MODULE);
  const source = fs.readFileSync(SOURCE, 'utf8');

  for (const forbidden of [
    "from 'node:fs'",
    'from "node:fs"',
    "from 'node:http'",
    "from 'node:https'",
    "from 'node:net'",
    "from 'node:child_process'",
    'require(',
    'fetch(',
    'XMLHttpRequest',
    'localStorage',
    'writeFile',
    'zen_fortress'
  ]) {
    assert.ok(!source.includes(forbidden), 'parser must not contain ' + forbidden);
  }

  const rows = [{
    RuleID: 'generic-api-key',
    File: 'a.env',
    StartLine: 1,
    Secret: SENTINEL,
    Verified: false,
    FalsePositive: true
  }];
  const before = JSON.stringify(rows);
  const first = parseGitleaksJSON(rows, { exitCode: 1 });
  const second = parseGitleaksJSON(rows, { exitCode: 1 });

  assert.equal(JSON.stringify(rows), before);
  assert.deepEqual(first, second);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.findings), true);
  assert.equal(Object.isFrozen(first.findings[0]), true);
  assert.equal(first.releaseApproved, false);
  assert.equal(first.falsePositiveAutoApplied, false);

  const sarifInput = {
    version: '2.1.0',
    runs: [{ tool: { driver: { name: 'CodeQL' } }, results: [{ ruleId: 'js/sql-injection' }] }]
  };
  const beforeSarif = JSON.stringify(sarifInput);
  const a = parseCodeQLJSON(sarifInput);
  const b = parseCodeQLJSON(sarifInput);

  assert.equal(JSON.stringify(sarifInput), beforeSarif);
  assert.deepEqual(a, b);
  assert.equal(Object.isFrozen(a), true);
  assert.equal(a.releaseApproved, false);
});
