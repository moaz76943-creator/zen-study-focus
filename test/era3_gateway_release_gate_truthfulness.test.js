'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const gate = require('../android/app/src/main/assets/web/js/era3_gateway_release_gate.js');

test('audit does not certify modules without external evidence', () => {
  const audit = gate.auditGatewayIntegrity();
  assert.equal(audit.certified, false);
  assert.equal(audit.totalModules, 5);
  assert.ok(audit.modules.every(m => m.status === 'NOT_VERIFIED'));
});
test('English manifest explicitly states pending verification', () => {
  const manifest = gate.generateReleaseManifest('en');
  assert.match(manifest, /Gateway verification pending/);
  assert.doesNotMatch(manifest, /100% GREEN|Certified|100% Offline Data Fortress v21 Compliance Verified/);
});
test('checklist cannot mark unverified claims as complete', () => {
  const manifest = gate.generateReleaseManifest('en');
  assert.doesNotMatch(manifest, /- \[x\]/);
  assert.match(manifest, /- \[ \].*NOT_VERIFIED/);
});
test('module table uses actual audit status', () => {
  const manifest = gate.generateReleaseManifest('en');
  assert.match(manifest, /\| `NOT_VERIFIED` \|/);
  assert.doesNotMatch(manifest, /\| `100% GREEN` \|/);
});
test('Arabic manifest remains localized and does not claim certification', () => {
  const manifest = gate.generateReleaseManifest('ar');
  assert.match(manifest, /فحص اعتماد البوابة قيد المعالجة/);
  assert.doesNotMatch(manifest, /100% GREEN|المعتمدة/);
});
test('preserves module catalog, locale exclusion and Western digits', () => {
  assert.equal(gate.getGatewayModules().length, 5);
  assert.equal(gate.getQuadPillars().length, 4);
  assert.equal(gate.sanitizeLocale('he-IL'), 'en');
  assert.equal(gate.toWesternDigits(1234), '1234');
});
