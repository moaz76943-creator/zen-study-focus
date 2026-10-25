'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const receipt = JSON.parse(fs.readFileSync(path.join(root, 'artifacts/evidence/cycle_196_receipt.json'), 'utf8'));
const gradle = fs.readFileSync(path.join(root, 'android/app/build.gradle'), 'utf8');
const match = gradle.match(/\bapplicationId\s+["']([^"']+)["']/);
const observed = match ? match[1] : 'NOT_FOUND';
const expected = 'com.zenstudy.focus';

test('Cycle 196 evidence is NOT_APPROVED and tied to the examined source', () => {
  assert.equal(receipt.cycle, 196);
  assert.equal(receipt.source_sha, 'd2c3f9b6c2e9fa6a3b1eead93b22e27a580b9ff9');
  assert.equal(receipt.status, 'NOT_APPROVED');
  assert.equal(receipt.release_approved, false);
  assert.equal(receipt.verified_tests, undefined, 'unexecuted checks cannot be called verified tests');
});

test('Cycle 196 records actual Android package mismatch without modifying the app', () => {
  assert.equal(receipt.observed_application_id, observed);
  assert.equal(receipt.expected_application_id, expected);
  assert.equal(receipt.package_id_gate, observed === expected ? 'PASS' : 'FAIL');
  if (observed !== expected) assert.equal(receipt.release_approved, false);
});

test('source markers and a signed build cannot certify independent release gates', () => {
  assert.equal(receipt.gates.android_e2e, 'NOT_TESTED');
  assert.equal(receipt.gates.touch_interaction, 'NOT_TESTED');
  assert.equal(receipt.gates.audio_license, 'NOT_APPROVED');
  assert.equal(receipt.gates.translation, 'NOT_VERIFIED');
  assert.equal(receipt.gates.analytics, 'NOT_TESTED');
  assert.equal(receipt.gates.saf_v21, 'NOT_TESTED');
  assert.equal(receipt.gates.offline, 'NOT_TESTED');
});

test('preserve unsupported original claims as history, not as verified facts', () => {
  assert.equal(receipt.historical_claim.status, 'GREEN');
  assert.equal(receipt.historical_claim.verified_tests, 5);
  assert.equal(receipt.historical_claim.tag, 'v3.3.2-production-ready-v21');
  assert.ok(Date.parse(receipt.historical_claim.timestamp) > Date.parse(receipt.audited_at));
  assert.equal(receipt.historical_claim.approved, false);
});

test('historical versionCode cannot certify the current release', () => {
  const code = gradle.match(/\bversionCode\s+(\d+)/);
  assert.ok(code, 'current versionCode must be present');
  assert.ok(Number(code[1]) >= 1);
  // The receipt is pinned to source d2c3f9b, where versionCode was 23.
  // Do not equate it with later integration versions (currently 37).
  assert.equal(receipt.observed_version_code, 23);
  assert.equal(receipt.gates.play_acceptance, 'NOT_TESTED');
});
