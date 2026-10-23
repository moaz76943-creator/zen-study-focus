'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const receipt = JSON.parse(fs.readFileSync(path.join(__dirname, '../artifacts/evidence/cycle_175_receipt.json'), 'utf8'));
const REQUIRED_GATES = ['full_source_cycle', 'android_e2e', 'saf_v21', 'analytics_functional', 'media_licensing', 'localization_20', 'manual_release_approval'];
function canClaimProductionReady(record, now = Date.now(), independentlyVerified = false) {
  if (!record || typeof record !== 'object') return false;
  if (!/^[a-f0-9]{40}$/.test(record.source_sha || '')) return false;
  const t = Date.parse(record.timestamp);
  if (!Number.isFinite(t) || t > now) return false;
  if (!record.evidence || !REQUIRED_GATES.every(g => {
    const e = record.evidence[g];
    return e && e.status === 'PASS' && e.source_sha === record.source_sha && typeof e.run_url === 'string' && e.run_url.startsWith('https://github.com/');
  })) return false;
  return independentlyVerified === true && record.manual_release_approval === true;
}

test('cycle 175 cannot claim production readiness without independent exact-SHA gates', () => {
  assert.equal(receipt.status, 'NOT_VERIFIED');
  assert.equal(receipt.release_state, 'NOT_APPROVED');
  assert.notEqual(receipt.all_tests_passed_percentage, '100%');
  assert.equal(canClaimProductionReady(receipt), false);
});

test('cycle 175 does not use a future-dated verification timestamp', () => {
  if (receipt.timestamp !== null) {
    assert.ok(Number.isFinite(Date.parse(receipt.timestamp)));
    assert.ok(Date.parse(receipt.timestamp) <= Date.now());
  }
});

test('original unverified claims are retained as provenance, not certification', () => {
  assert.equal(receipt.prior_unverified_claims?.release_state, 'PRODUCTION_READY_CERTIFIED');
  assert.equal(receipt.prior_unverified_claims?.timestamp, '2026-10-24T19:30:00Z');
});

test('no SHA, stale SHA, future timestamp or missing gates can approve a release', () => {
  const head = 'a'.repeat(40);
  const evidence = Object.fromEntries(REQUIRED_GATES.map(g => [g, {status:'PASS',source_sha:head,run_url:'https://github.com/example/run'}]));
  const valid = {source_sha:head,timestamp:'2026-10-22T00:00:00Z',evidence,manual_release_approval:true};
  // A receipt with self-reported links is never sufficient by itself.
  assert.equal(canClaimProductionReady(valid, Date.parse('2026-10-23T00:00:00Z')), false);
  assert.equal(canClaimProductionReady(valid, Date.parse('2026-10-23T00:00:00Z'), true), true);
  assert.equal(canClaimProductionReady({...valid,source_sha:undefined}), false);
  assert.equal(canClaimProductionReady({...valid,source_sha:'b'.repeat(40)}), false);
  assert.equal(canClaimProductionReady({...valid,timestamp:'2026-10-24T00:00:00Z'}, Date.parse('2026-10-23T00:00:00Z')), false);
  assert.equal(canClaimProductionReady({...valid,evidence:{...evidence,android_e2e:undefined}}), false);
  assert.equal(canClaimProductionReady({...valid,manual_release_approval:false}), false);
});
