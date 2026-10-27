'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  SCHEMA_VERSION,
  STATUS_PASS,
  STATUS_FAIL,
  STATUS_NOT_TESTED,
  TRANSPORT_KINDS,
  classifyResult,
  classifyTransportEvent,
  transportReason,
  shaStatus,
  apkIdentityStatus,
  mapCheck,
  mapAndroidEvidence
} = require('../../tools/room6/android_evidence_mapper.cjs');

const EXACT_SHA = 'c92b4c378a3b20a936f7d2caecd3e911cf7a8692';
const APK_SHA256_A = '1ea9d9a06b7f79a2f1d5b65d3abefa59c34bd1986e19678da7c83e92a57f42b6';
const APK_SHA256_B = '4d0f7c7a9e51b6e5d2d6c8b1a7e0f3c5d9b2a8e1f4c7d0b3a6e9f2c5d8b1a4e7';

const PR_PATHS = [
  'android/app/src/main/java/com/zenstudy/focus/MainActivity.kt',
  'android/app/src/main/assets/web/app.js',
  'android/app/src/main/assets/web/index.html'
];

function api30PassedReport() {
  return {
    run: 'run40434768869',
    workflow: 'df_room04_csv.yml',
    event: 'pull_request',
    prPathScope: PR_PATHS,
    devices: [
      {
        device: 'API30',
        avd: 'room6_api30_water',
        sha: EXACT_SHA,
        builtApkSha256: APK_SHA256_A,
        installedApkSha256: APK_SHA256_A,
        checks: [
          { id: 'touch_320', result: 'pass' },
          { id: 'touch_360', result: 'pass' },
          { id: 'touch_393', result: 'pass' },
          { id: 'touch_430', result: 'pass' }
        ]
      },
      {
        device: 'API35',
        avd: 'room6_api35',
        sha: EXACT_SHA,
        builtApkSha256: APK_SHA256_A,
        installedApkSha256: APK_SHA256_A,
        checks: [
          { id: 'startup_smoke', result: 'pass' }
        ]
      }
    ]
  };
}

test('Q07 android_evidence_mapper', (t) => {
  t.test('maps a fully verified API30 and API35 pass report to PASS', () => {
    const summary = mapAndroidEvidence(api30PassedReport(), { sha: EXACT_SHA });
    assert.equal(summary.schemaVersion, SCHEMA_VERSION);
    assert.equal(summary.overall, STATUS_PASS);
    assert.equal(summary.shaVerified, true);
    assert.equal(summary.apkIdentityVerified, true);
    assert.equal(summary.counts.checks.PASS, 5);
    assert.equal(summary.counts.checks.FAIL, 0);
    assert.equal(summary.counts.checks.NOT_TESTED, 0);
    assert.equal(summary.counts.devices.PASS, 2);
    assert.equal(summary.counts.transport, 0);
    assert.deepEqual(summary.reasons, []);
    const api30 = summary.devices.find((device) => device.device === 'API30');
    assert.equal(api30.present, true);
    assert.equal(api30.status, STATUS_PASS);
    assert.equal(api30.checks.length, 4);
  });

  t.test('covers both API30 and API35 by default and flags a missing device', () => {
    const stripped = api30PassedReport();
    stripped.devices = stripped.devices.filter((device) => device.device === 'API30');
    const summary = mapAndroidEvidence(stripped, { sha: EXACT_SHA });
    assert.equal(summary.devices.length, 2);
    const api35 = summary.devices.find((device) => device.device === 'API35');
    assert.equal(api35.present, false);
    assert.equal(api35.status, STATUS_NOT_TESTED);
    assert.equal(api35.reason, 'device_absent');
    assert.equal(summary.overall, STATUS_NOT_TESTED);
    assert.ok(summary.reasons.includes('API35:device_absent'));
  });

  t.test('never fakes a pass when the report SHA does not exactly match', () => {
    const report = api30PassedReport();
    report.devices[0].sha = 'c92b4c378a3b20a936f7d2caecd3e911cf7a8693';
    const summary = mapAndroidEvidence(report, { sha: EXACT_SHA, devices: ['API30'] });
    assert.equal(summary.overall, STATUS_NOT_TESTED);
    assert.equal(summary.shaVerified, false);
    for (const check of summary.devices[0].checks) {
      assert.equal(check.status, STATUS_NOT_TESTED);
      assert.equal(check.reason, 'report_sha_mismatch');
    }
    assert.ok(summary.reasons.includes('API30:report_sha_mismatch'));
  });

  t.test('missing or malformed SHA evidence downgrades passing checks to NOT_TESTED', () => {
    const missing = api30PassedReport();
    delete missing.devices[0].sha;
    const missingSummary = mapAndroidEvidence(missing, { sha: EXACT_SHA, devices: ['API30'] });
    assert.equal(missingSummary.overall, STATUS_NOT_TESTED);
    assert.equal(missingSummary.devices[0].checks[0].reason, 'report_sha_missing');

    const malformed = api30PassedReport();
    malformed.devices[0].sha = 'not-a-sha';
    assert.equal(mapAndroidEvidence(malformed, { sha: EXACT_SHA, devices: ['API30'] }).devices[0].checks[0].reason, 'report_sha_malformed');

    const unsafe = mapAndroidEvidence(api30PassedReport(), { sha: '' });
    assert.equal(unsafe.overall, STATUS_NOT_TESTED);
    assert.ok(unsafe.reasons.some((reason) => reason.endsWith('unsafe_expected_sha')));
  });

  t.test('instruments transport failures separately without turning them into application FAILs', () => {
    const report = api30PassedReport();
    const api35 = report.devices.find((device) => device.device === 'API35');
    api35.checks = [];
    api35.transport = [
      { stage: 'bootstrap', kind: 'emulator lost', message: 'emulator process died during boot' }
    ];
    const summary = mapAndroidEvidence(report, { sha: EXACT_SHA });
    assert.equal(summary.overall, STATUS_NOT_TESTED);
    assert.equal(summary.counts.transport, 1);
    assert.equal(summary.transport[0].device, 'API35');
    assert.equal(summary.transport[0].kind, 'emulator_lost');
    assert.equal(summary.transport[0].stage, 'bootstrap');
    assert.equal(summary.counts.checks.FAIL, 0);
    assert.equal(summary.counts.checks.PASS, 4);
    const mappedApi35 = summary.devices.find((device) => device.device === 'API35');
    assert.equal(mappedApi35.status, STATUS_NOT_TESTED);
    assert.equal(mappedApi35.reason, 'no_check_results');
    assert.ok(summary.reasons.includes('API35:transport:emulator_lost'));
  });

  t.test('records a failed-ACK check as NOT_TESTED transport data, not an application FAIL', () => {
    const report = api30PassedReport();
    report.devices[0].checks.push({ id: 'csv_export_ack', result: 'failed-ack' });
    const summary = mapAndroidEvidence(report, { sha: EXACT_SHA, devices: ['API30'] });
    assert.equal(summary.overall, STATUS_NOT_TESTED);
    assert.equal(summary.counts.transport, 1);
    const ack = summary.devices[0].checks.find((check) => check.id === 'csv_export_ack');
    assert.equal(ack.status, STATUS_NOT_TESTED);
    assert.equal(ack.reason, 'transport:failed_ack');
    assert.equal(summary.transport[0].kind, 'failed_ack');
    assert.equal(summary.transport[0].checkId, 'csv_export_ack');
    assert.equal(summary.counts.checks.FAIL, 0);
  });

  t.test('an explicit application failure is reported as FAIL and blocks the merge gate', () => {
    const report = api30PassedReport();
    report.devices[0].checks[1] = { id: 'touch_360', result: 'fail' };
    const summary = mapAndroidEvidence(report, { sha: EXACT_SHA, devices: ['API30'] });
    assert.equal(summary.overall, STATUS_FAIL);
    assert.equal(summary.devices[0].status, STATUS_FAIL);
    assert.equal(summary.counts.checks.FAIL, 1);
    assert.equal(summary.counts.transport, 0);
    assert.ok(summary.reasons.includes('API30:failing_checks'));
  });

  t.test('passing checks are rejected when built and installed APK bytes differ', () => {
    const report = api30PassedReport();
    report.devices[0].installedApkSha256 = APK_SHA256_B;
    const summary = mapAndroidEvidence(report, { sha: EXACT_SHA, devices: ['API30'] });
    assert.equal(summary.overall, STATUS_NOT_TESTED);
    for (const check of summary.devices[0].checks) {
      assert.equal(check.status, STATUS_NOT_TESTED);
      assert.equal(check.reason, 'built_and_installed_apk_differ');
    }
    assert.ok(summary.reasons.includes('API30:apk_identity_not_verified'));
  });

  t.test('missing APK identity evidence is NOT_TESTED, never a pass', () => {
    const report = api30PassedReport();
    delete report.devices[0].builtApkSha256;
    delete report.devices[0].installedApkSha256;
    const summary = mapAndroidEvidence(report, { sha: EXACT_SHA, devices: ['API30'] });
    assert.equal(summary.overall, STATUS_NOT_TESTED);
    assert.equal(summary.devices[0].checks[0].reason, 'apk_identity_not_supplied');
    assert.equal(summary.devices[0].apkIdentityVerified, false);
  });

  t.test('handles malformed reports and device entries without throwing and without claiming a pass', () => {
    for (const report of [null, undefined, 42, 'junk', []]) {
      const summary = mapAndroidEvidence(report, { sha: EXACT_SHA });
      assert.equal(summary.overall, STATUS_NOT_TESTED);
      assert.equal(summary.counts.transport, 0);
      assert.ok(summary.reasons.length > 0);
    }
    const badDevices = mapAndroidEvidence({ devices: 'junk' }, { sha: EXACT_SHA });
    assert.equal(badDevices.overall, STATUS_NOT_TESTED);
    assert.equal(badDevices.devices[0].present, false);

    const badEntry = mapAndroidEvidence(
      { devices: [{ device: 'API30', sha: EXACT_SHA, checks: 'not-a-list' }] },
      { sha: EXACT_SHA, devices: ['API30'] }
    );
    assert.equal(badEntry.overall, STATUS_NOT_TESTED);
    assert.deepEqual(badEntry.devices[0].checks, []);
  });

  t.test('a resolved transport event stays instrumented but does not block PASS', () => {
    const report = api30PassedReport();
    report.transport = [
      { stage: 'bootstrap', kind: 'failed-ack', message: 'initial ack retry', resolved: true }
    ];
    const summary = mapAndroidEvidence(report, { sha: EXACT_SHA, devices: ['API30'] });
    assert.equal(summary.counts.transport, 1);
    assert.equal(summary.transport[0].kind, 'failed_ack');
    assert.equal(summary.overall, STATUS_PASS);
    assert.deepEqual(summary.reasons, []);
  });

  t.test('unresolved top-level transport failures keep the overall verdict at NOT_TESTED', () => {
    const report = api30PassedReport();
    report.transportErrors = [
      { stage: 'install', kind: 'install_timeout', message: 'package install timed out after 600000ms' }
    ];
    const summary = mapAndroidEvidence(report, { sha: EXACT_SHA, devices: ['API30'] });
    assert.equal(summary.overall, STATUS_NOT_TESTED);
    assert.equal(summary.counts.transport, 1);
    assert.equal(summary.transport[0].kind, 'install_failure');
    assert.equal(summary.counts.checks.FAIL, 0);
    assert.equal(summary.devices[0].status, STATUS_PASS);
  });

  t.test('classification helpers', () => {
    assert.equal(classifyResult('pass'), STATUS_PASS);
    assert.equal(classifyResult('Passed'), STATUS_PASS);
    assert.equal(classifyResult('fail'), STATUS_FAIL);
    assert.equal(classifyResult(''), STATUS_NOT_TESTED);
    assert.equal(classifyResult('timeout'), STATUS_NOT_TESTED);
    assert.equal(classifyResult('failed-ack'), STATUS_NOT_TESTED);
    assert.equal(classifyResult('emulator lost'), STATUS_NOT_TESTED);
    assert.equal(classifyResult('mysterious'), STATUS_NOT_TESTED);

    assert.equal(classifyTransportEvent('failed-ACK', ''), 'failed_ack');
    assert.equal(classifyTransportEvent('emulator_lost', ''), 'emulator_lost');
    assert.equal(classifyTransportEvent('command timeout', ''), 'command_timeout');
    assert.equal(classifyTransportEvent('', 'emulator process lost'), 'emulator_lost');
    assert.equal(classifyTransportEvent('', 'adb device offline'), 'adb_offline');
    assert.equal(classifyTransportEvent('', 'APK install failed'), 'install_failure');
    assert.equal(classifyTransportEvent('', 'network socket closed'), 'connectivity');
    assert.equal(classifyTransportEvent('', 'unrelated message'), 'other');

    assert.equal(transportReason({ transportError: true }), 'other');
    assert.equal(transportReason({ message: 'device went offline' }), 'adb_offline');
    assert.equal(transportReason({ result: 'pass' }), null);
    assert.equal(transportReason({}), null);
  });

  t.test('sha and apk identity gates', () => {
    const device = { sha: EXACT_SHA, builtApkSha256: APK_SHA256_A, installedApkSha256: APK_SHA256_A };
    assert.equal(shaStatus(device, EXACT_SHA).verified, true);
    assert.equal(shaStatus(device, '0000000000000000000000000000000000000000').reason, 'unsafe_expected_sha');
    assert.equal(shaStatus({ sha: 'zz' }, EXACT_SHA).reason, 'report_sha_malformed');
    assert.equal(shaStatus({}, EXACT_SHA).reason, 'report_sha_missing');
    assert.equal(apkIdentityStatus(device).verified, true);
    assert.equal(apkIdentityStatus({}).reason, 'apk_identity_not_supplied');
    assert.equal(apkIdentityStatus({ builtApkSha256: APK_SHA256_A, installedApkSha256: APK_SHA256_B }).reason, 'built_and_installed_apk_differ');
  });

  t.test('transport kinds vocabulary is the documented set', () => {
    assert.deepEqual(TRANSPORT_KINDS, [
      'emulator_lost',
      'emulator_bootstrap',
      'failed_ack',
      'adb_offline',
      'command_timeout',
      'install_failure',
      'connectivity',
      'other'
    ]);
  });

  t.test('mapper is pure, offline and deterministic', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', '..', 'tools', 'room6', 'android_evidence_mapper.cjs'),
      'utf8'
    );
    for (const forbidden of ["require('http'", 'require("http"', "require('https'", "require('net'", "require('fs'", "require('child_process'", 'fetch(', 'XMLHttpRequest', 'navigator.']) {
      assert.ok(!source.includes(forbidden), 'module must not touch ' + forbidden);
    }
    const first = mapAndroidEvidence(api30PassedReport(), { sha: EXACT_SHA });
    const second = mapAndroidEvidence(api30PassedReport(), { sha: EXACT_SHA });
    assert.deepEqual(first, second);
    assert.deepEqual(Object.keys(first.devices[0]), Object.keys(mapAndroidEvidence(api30PassedReport(), { sha: EXACT_SHA }).devices[0]));
  });

  t.test('mapCheck unit cases', () => {
    const verified = { shaVerified: true, shaReason: null, apkVerified: true, apkReason: null };
    const passing = mapCheck({ id: 'touch_320', result: 'pass' }, verified);
    assert.equal(passing.id, 'touch_320');
    assert.equal(passing.status, STATUS_PASS);
    assert.equal(passing.reason, null);
    assert.equal(mapCheck({ id: 'x', result: 'fail' }, verified).status, STATUS_FAIL);
    assert.equal(mapCheck({ id: 'x' }, verified).status, STATUS_NOT_TESTED);
    assert.equal(mapCheck({ id: 'x' }, verified).reason, 'missing_result');
    assert.equal(mapCheck({ result: 'nonsense' }, verified).reason, 'unexpected_result_token');
    assert.equal(mapCheck('bad', verified).reason, 'malformed_check_entry');
    const unverified = { shaVerified: false, shaReason: 'report_sha_missing', apkVerified: true, apkReason: null };
    const claimed = mapCheck({ id: 'claim', result: 'pass' }, unverified);
    assert.equal(claimed.status, STATUS_NOT_TESTED);
    assert.equal(claimed.reason, 'report_sha_missing');
  });
});
