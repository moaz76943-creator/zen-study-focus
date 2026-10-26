'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateEvidence } = require('../../tools/daily_maintenance/evidence_integrity_guard.cjs');

const sha = '0123456789abcdef';
const run = (overrides = {}) => validateEvidence({ sha, assertionsCount: 10, failuresCount: 0, skippedCount: 0, ...overrides }, sha);

test('accepts successful measured evidence and preserves public status/verifiedAssertions', () => {
  assert.deepEqual(run(), {status: 'PASS', valid: true, sha, verifiedAssertions: 10});
  assert.deepEqual(run({assertionsCount: 3, skippedCount: 2}), {status: 'PASS', valid: true, sha, verifiedAssertions: 3});
});

test('keeps stale SHA and ordinary failures blocked', () => {
  assert.equal(validateEvidence({sha:'older',assertionsCount:2,failuresCount:0,skippedCount:0},sha).status,'STALE_SHA_REJECTED');
  assert.equal(run({failuresCount: 1}).status, 'FAIL');
  assert.equal(run({skippedCount: 10}).status, 'ALL_SKIPPED_REJECTED');
  assert.equal(run({assertionsCount: 0}).status, 'ZERO_ASSERTIONS_REJECTED');
});

test('rejects invalid non-finite or fractional evidence for all counters', () => {
  for (const field of ['assertionsCount','failuresCount','skippedCount']) {
    for (const bad of [Infinity,-Infinity,NaN,'Infinity','NaN',-1,0.5,1.5,Number.MAX_SAFE_INTEGER+1,'',null,true]) {
      const actual = run({[field]: bad});
      assert.equal(actual.valid, false, `${field}=${String(bad)} must not pass`);
      if (field!=='assertionsCount' || bad!==0) assert.equal(actual.status,'BLOCKED_MALFORMED',`${field}=${String(bad)} is malformed`);
    }
  }
});

test('missing fields and inconsistent counters must fail closed', () => {
  for (const field of ['assertionsCount','failuresCount','skippedCount']) {
    const packet={sha,assertionsCount:4,failuresCount:0,skippedCount:0};
    delete packet[field];
    assert.equal(validateEvidence(packet,sha).status,'BLOCKED_MALFORMED');
  }
  assert.equal(run({assertionsCount:3, failuresCount:4}).status,'BLOCKED_MALFORMED');
  assert.equal(run({assertionsCount:3, skippedCount:4}).status,'BLOCKED_MALFORMED');
});

test('rejects array‑shaped evidence even when it carries the correct properties', () => {
  // Create an array and attach the required properties
  const arrayEvidence = [];
  arrayEvidence.sha = sha;
  arrayEvidence.assertionsCount = 5;
  arrayEvidence.failuresCount = 0;
  arrayEvidence.skippedCount = 0;

  const result = validateEvidence(arrayEvidence, sha);
  // The guard should treat this as malformed rather than PASS
  assert.equal(result.status, 'BLOCKED_MALFORMED');
  assert.equal(result.valid, false);
});
