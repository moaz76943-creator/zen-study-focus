'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const script = path.join(root, 'tools/security/track13_gitleaks_report.py');
const sha = 'a'.repeat(40);
function run(report, status = 0, commitSha = sha) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'df-track13-'));
  const reportPath = path.join(dir, 'private.json');
  if (report !== null) fs.writeFileSync(reportPath, typeof report === 'string' ? report : JSON.stringify(report), { mode: 0o600 });
  try {
    const result = spawnSync('python3', [script, '--report', reportPath, '--sha', commitSha, '--scan-exit', String(status)], { encoding: 'utf8' });
    return { ...result, output: JSON.parse(result.stdout) };
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
test('clean JSON array with clean scanner exit returns PASS on exact source', () => {
  const r = run([]);
  assert.equal(r.status, 0);
  assert.deepEqual([r.output.status, r.output.findings, r.output.sha], ['PASS', 0, sha]);
});
test('real-looking synthetic detection is FAIL and never exposes matched value or raw path', () => {
  const sentinel = 'SENSITIVE-SYNTHETIC-DO-NOT-PRINT-987';
  const r = run([{ RuleID: 'generic-api-key', File: 'private/' + sentinel + '.env', StartLine: 17,
    Secret: sentinel, Match: sentinel, Description: sentinel, Commit: 'b'.repeat(40) }], 1);
  assert.equal(r.status, 1);
  assert.equal(r.output.status, 'FAIL');
  assert.equal(r.output.findings, 1);
  assert.equal(r.output.evidence[0].rule, 'generic-api-key');
  assert.match(r.output.evidence[0].path_sha256_16, /^[a-f0-9]{16}$/);
  assert.match(r.output.evidence[0].commit_sha256_16, /^[a-f0-9]{16}$/);
  assert.ok(!(r.stdout + r.stderr).includes(sentinel));
  assert.ok(!(r.stdout + r.stderr).includes('private/'));
});
test('missing report blocks, even when scanner claims clean or detected', () => {
  for (const code of [0, 1, 2]) {
    const r = run(null, code);
    assert.equal(r.status, 1);
    assert.equal(r.output.status, 'BLOCKED');
    assert.equal(r.output.reason, 'REPORT_UNAVAILABLE');
  }
});
test('malformed, wrong shape and corrupted item reports block', () => {
  for (const report of ['{bad-json', { unexpected: true }, [null], ['literal']]) {
    const r = run(report, 1);
    assert.equal(r.status, 1);
    assert.equal(r.output.status, 'BLOCKED');
    assert.equal(r.output.reason, 'REPORT_INVALID');
  }
});
test('operational scanner errors and contradictory scanner results are BLOCKED', () => {
  for (const [report, code] of [[[], 1], [[], 2], [[{ RuleID: 'generic-api-key', File: 'safe-path' }], 0]]) {
    const r = run(report, code);
    assert.equal(r.status, 1);
    assert.equal(r.output.status, 'BLOCKED');
  }
});
test('bad SHA is never reflected into output', () => {
  const secret = 'VERY-PRIVATE-STRING';
  const r = run([], 0, secret);
  assert.equal(r.status, 1);
  assert.equal(r.output.status, 'BLOCKED');
  assert.ok(!(r.stdout + r.stderr).includes(secret));
});
test('untrusted finding fields are never printed, even if they resemble structured fields', () => {
  const sentinel = 'SUPERPRIVATE-DO-NOT-LEAK';
  const r = run([{ RuleID: sentinel, File: sentinel, StartLine: sentinel, Commit: sentinel,
    Secret: sentinel, Match: sentinel, Description: sentinel, Entropy: sentinel }], 1);
  assert.equal(r.status, 1);
  assert.equal(r.output.status, 'FAIL');
  assert.ok(!(r.stdout + r.stderr).includes(sentinel));
  assert.equal(r.output.evidence[0].rule, 'unknown');
});
test('summarizes rule counts across all private Gitleaks findings, beyond bounded evidence', () => {
  const sentinel='SYNTHETIC-CONFIDENTIAL-FINDING';
  const findings=Array.from({length:35},(_,i)=>({RuleID:i%2===0?'generic-api-key':sentinel,File:'private/'+sentinel,Secret:sentinel}));
  const r=run(findings,1);
  assert.equal(r.status,1);
  assert.equal(r.output.status,'FAIL');
  assert.equal(r.output.findings,35);
  assert.deepEqual(r.output.rule_counts,{'generic-api-key':18,unknown:17});
  assert.equal(r.output.evidence.length,25);
  assert.ok(!(r.stdout+r.stderr).includes(sentinel));
});
test('workflow scans exact source, history and tree; does not upload raw findings or permit bypass', () => {
  const wf = fs.readFileSync(path.join(root, '.github/workflows/track13_security_exact_sha.yml'), 'utf8');
  assert.match(wf, /pull_request:/);
  assert.match(wf, /persist-credentials: false/);
  assert.match(wf, /fetch-depth: 0/);
  assert.match(wf, /git rev-parse HEAD/);
  assert.match(wf, /gitleaks" dir --no-banner/);
  assert.match(wf, /gitleaks" git --no-banner/);
  assert.match(wf, /track13_gitleaks_report\.py/);
  assert.doesNotMatch(wf, /upload-artifact|continue-on-error|\bsecrets\.|\.gitleaks\.toml/);
});
