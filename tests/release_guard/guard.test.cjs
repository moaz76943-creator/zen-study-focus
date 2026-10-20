'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const guard = require('../../tools/release_guard/guard.cjs');
const sha = 'a'.repeat(40);
const candidate = 'b'.repeat(40);
const safeGradle = 'android { defaultConfig { versionCode 22 } signingConfigs { upload { storeFile file(uploadKeyStorePath) } } buildTypes { release { if (hasUploadSigning) signingConfig signingConfigs.upload } } }';
const approved = () => ({
  checkedSha: sha, requestedSha: sha, approvedSha: sha, candidateSha: candidate,
  ref: 'refs/heads/main', containsCandidate: true,
  media: 'true', device: 'true', backup: 'true', locales: 'true', human: 'true',
  hasUploadCredentials: true, gradle: safeGradle
});
test('valid SHA-bound integrated, signed, audited release passes', () => {
  assert.deepEqual(guard.evaluate(approved()), { allowed: true, reasons: [] });
});
test('stale or unmerged source cannot publish even if other checks pass', () => {
  assert.match(guard.evaluate({...approved(), containsCandidate: false}).reasons.join(' '), /candidate.*ancestor/i);
  assert.match(guard.evaluate({...approved(), requestedSha: 'c'.repeat(40)}).reasons.join(' '), /requested SHA/i);
  assert.match(guard.evaluate({...approved(), approvedSha: 'd'.repeat(40)}).reasons.join(' '), /approved SHA/i);
  assert.match(guard.evaluate({...approved(), checkedSha: 'HEAD'}).reasons.join(' '), /SHA/i);
});
test('missing human/device/media/backup/locale approvals fail closed independently', () => {
  for (const key of ['media','device','backup','locales','human']) {
    const outcome=guard.evaluate({...approved(), [key]: 'false'});
    assert.equal(outcome.allowed,false,key);
    assert.match(outcome.reasons.join(' '),new RegExp(key,'i'));
  }
});
test('never publish from an untrusted branch or without upload credentials', () => {
  assert.equal(guard.evaluate({...approved(), ref:'refs/heads/feature'}).allowed,false);
  assert.equal(guard.evaluate({...approved(), hasUploadCredentials:false}).allowed,false);
});
test('current main debug-signed v21 cannot produce a production release', () => {
  const original='android { defaultConfig { versionCode 21 } buildTypes { release { signingConfig signingConfigs.debug } } }';
  const r=guard.evaluate({...approved(),gradle:original});
  assert.equal(r.allowed,false);
  assert.match(r.reasons.join(' '),/debug signing|upload signing|versionCode/i);
});
test('misconfigured release, nonincremented version, or malformed code fail closed', () => {
  for (const gradle of [safeGradle.replace('22','21'),safeGradle.replace('22','garbage'),safeGradle.replace('signingConfigs.upload','signingConfigs.debug')]) {
    assert.equal(guard.evaluate({...approved(), gradle}).allowed,false);
  }
});
test('never accept candidate or approval SHA missing or malformed', () => {
  assert.equal(guard.evaluate({...approved(),candidateSha:'latest'}).allowed,false);
  assert.equal(guard.evaluate({...approved(), approvedSha:''}).allowed,false);
});
