'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const MODULE = '../../tools/critical_room7/android_api30_35_evidence_parser.mjs';
const SOURCE = path.join(__dirname, MODULE);

const HEAD_SHA = '3bacd9f0bb0389a013be9014cb19a74d2b189d24';
const OTHER_SHA = 'c92b4c378a3b20a936f7d2caecd3e911cf7a8692';
const APK_SHA = '1ea9d9a06b7f79a2f1d5b65d3abefa59c34bd1986e19678da7c83e92a57f42b6';

const ACTUAL_JOB_LOG_WITHOUT_DEVICE = [
  '## Blocked',
  '- Cannot run the on-device CDP harness (`tests/track05_timer/live_android_cdp.cjs`) - no emulator/adb; network denied.',
  '- `tests/track05_timer/live_android_cdp.cjs` - on-device E2E (branch commit; encodes intended relaunch/cancel semantics; unrunnable here).',
  '- No Android-device CSV readback was claimed; the SAF readback gate remains an on-device gate (issue #109 unchanged in status).',
  '- Cannot run the on-device CDP harness (`tests/track05_timer/live_android_cdp.cjs`) - no emulator/adb; network denied.'
].join('\n');

const ACTUAL_PASSING_NODE_LINES = [
  'legacy 7-day "verified sessions" excludes interrupted, rest and demo rows like the v21 ledger (32.931307ms)',
  'tests 1',
  'suites 0',
  'pass 1',
  'fail 0',
  'No Android-device CSV readback was claimed; the SAF readback gate remains an on-device gate (issue #109 unchanged in status).'
].join('\n');

function jsonLine(value) {
  return JSON.stringify(value);
}

function passCase(apiLevel, sha = HEAD_SHA, name = 'startup_smoke') {
  return jsonLine({
    name,
    status: 'PASS',
    detail: 'Observed Android outcome',
    apiLevel,
    sha,
    builtApkSha256: APK_SHA,
    installedApkSha256: APK_SHA
  });
}

test('Q01 actual blocked job log is NOT_TESTED infrastructure, never Android PASS', async () => {
  const { parseAndroidEvidenceLog } = await import(MODULE);

  const report = parseAndroidEvidenceLog(ACTUAL_JOB_LOG_WITHOUT_DEVICE, {
    expectedSha: HEAD_SHA
  });

  assert.equal(report.overall, 'NOT_TESTED');
  assert.equal(report.ok, false);
  assert.equal(report.exactSha, false);
  assert.equal(report.releaseApproved, false);
  assert.equal(report.counts.appDefect, 0);
  assert.ok(report.infrastructure.length >= 1);
  assert.ok(report.infrastructure.some((event) => event.classification === 'ADB_INFRA'));
  assert.ok(report.reasons.includes('missing_sha'));
});

test('Q01 Node PASS output without device evidence is not accepted as Android evidence', async () => {
  const { parseAndroidEvidenceLog } = await import(MODULE);

  const report = parseAndroidEvidenceLog(ACTUAL_PASSING_NODE_LINES, {
    expectedSha: HEAD_SHA
  });

  assert.equal(report.overall, 'NOT_TESTED');
  assert.equal(report.counts.pass, 0);
  assert.equal(report.counts.observations, 0);
  assert.equal(report.exactSha, false);
});

test('Q01 ADB, CDP and UiAutomator transport failures stay infra, not APP_DEFECT', async () => {
  const { parseAndroidEvidenceLog } = await import(MODULE);

  const log = [
    jsonLine({
      name: 'preflight',
      status: 'NOT_TESTED',
      detail: 'TRANSPORT: ADB command failed or timed out',
      apiLevel: 30,
      sha: HEAD_SHA
    }),
    jsonLine({
      name: 'ready',
      status: 'NOT_TESTED',
      detail: 'TRANSPORT: no Android asset WebView CDP target',
      apiLevel: 35,
      sha: HEAD_SHA
    }),
    jsonLine({
      name: 'native-dialog',
      status: 'NOT_TESTED',
      detail: 'TRANSPORT: branded native confirmation not observable',
      apiLevel: 35,
      sha: HEAD_SHA
    })
  ].join('\n');

  const report = parseAndroidEvidenceLog(log, { expectedSha: HEAD_SHA });
  const byName = Object.fromEntries(report.observations.map((entry) => [entry.id, entry]));

  assert.equal(report.overall, 'NOT_TESTED');
  assert.equal(report.counts.appDefect, 0);
  assert.equal(report.counts.adbInfra, 1);
  assert.equal(report.counts.cdpInfra, 1);
  assert.equal(report.counts.uiAutomatorInfra, 1);
  assert.equal(byName.preflight.classification, 'ADB_INFRA');
  assert.equal(byName.preflight.outcome, 'NOT_TESTED');
  assert.equal(byName.ready.classification, 'CDP_INFRA');
  assert.equal(byName.ready.outcome, 'NOT_TESTED');
  assert.equal(byName['native-dialog'].classification, 'UIAUTOMATOR_INFRA');
  assert.equal(byName['native-dialog'].outcome, 'NOT_TESTED');
});

test('Q01 raw transport FAIL is reclassified as NOT_TESTED infrastructure', async () => {
  const { parseAndroidEvidenceLog } = await import(MODULE);

  const log = [
    jsonLine({
      name: 'install',
      status: 'FAIL',
      detail: 'APK install failed or timed out',
      apiLevel: 30,
      sha: HEAD_SHA
    }),
    jsonLine({
      name: 'uiautomator-dump',
      status: 'FAIL',
      detail: 'uiautomator dump could not observe the native dialog',
      apiLevel: 35,
      sha: HEAD_SHA
    })
  ].join('\n');

  const report = parseAndroidEvidenceLog(log, { expectedSha: HEAD_SHA });

  assert.equal(report.overall, 'NOT_TESTED');
  assert.equal(report.counts.appDefect, 0);
  assert.equal(report.counts.fail, 0);
  assert.equal(report.counts.adbInfra, 1);
  assert.equal(report.counts.uiAutomatorInfra, 1);
  for (const observation of report.observations) {
    assert.equal(observation.outcome, 'NOT_TESTED');
  }
});

test('Q01 an explicit application failure on the exact SHA is FAIL and APP_DEFECT', async () => {
  const { parseAndroidEvidenceLog } = await import(MODULE);

  const log = [
    passCase(30),
    jsonLine({
      name: 'start-pause-resume',
      status: 'FAIL',
      detail: 'AssertionError [ERR_ASSERTION]: expected the timer to resume',
      apiLevel: 35,
      sha: HEAD_SHA
    })
  ].join('\n');

  const report = parseAndroidEvidenceLog(log, { expectedSha: HEAD_SHA });
  const failed = report.observations.find((entry) => entry.id === 'start-pause-resume');

  assert.equal(report.overall, 'FAIL');
  assert.equal(report.ok, false);
  assert.equal(report.counts.fail, 1);
  assert.equal(report.counts.appDefect, 1);
  assert.equal(failed.classification, 'APP_DEFECT');
  assert.equal(failed.outcome, 'FAIL');
});

test('Q01 PASS requires an exact SHA; missing or mismatched evidence degrades to NOT_TESTED', async () => {
  const { parseAndroidEvidenceLog } = await import(MODULE);

  const missing = parseAndroidEvidenceLog([passCase(30, null), passCase(35, null)].join('\n'), {
    expectedSha: HEAD_SHA
  });
  assert.equal(missing.overall, 'NOT_TESTED');
  assert.equal(missing.counts.pass, 0);
  for (const observation of missing.observations) {
    assert.equal(observation.outcome, 'NOT_TESTED');
    assert.equal(observation.reason, 'missing_sha');
  }

  const mismatched = parseAndroidEvidenceLog([passCase(30, OTHER_SHA), passCase(35, OTHER_SHA)].join('\n'), {
    expectedSha: HEAD_SHA
  });
  assert.equal(mismatched.overall, 'NOT_TESTED');
  assert.equal(mismatched.counts.pass, 0);
  assert.ok(mismatched.reasons.includes('sha_mismatch'));
  for (const observation of mismatched.observations) {
    assert.equal(observation.outcome, 'NOT_TESTED');
    assert.equal(observation.reason, 'sha_mismatch');
  }
});

test('Q01 complete API30 and API35 passes on one exact SHA are PASS without release approval', async () => {
  const { parseAndroidEvidenceLog } = await import(MODULE);

  const log = [
    passCase(30, HEAD_SHA, 'startup_restart'),
    passCase(35, HEAD_SHA, 'startup_restart')
  ].join('\n');

  const report = parseAndroidEvidenceLog(log, { expectedSha: HEAD_SHA });

  assert.equal(report.overall, 'PASS');
  assert.equal(report.ok, true);
  assert.equal(report.exactSha, true);
  assert.equal(report.expectedSha, HEAD_SHA);
  assert.equal(report.releaseApproved, false);
  assert.equal(report.counts.pass, 2);
  assert.equal(report.counts.fail, 0);
  assert.equal(report.counts.notTested, 0);
  assert.deepEqual(report.apiLevels.map((entry) => [entry.apiLevel, entry.outcome]), [
    [30, 'PASS'],
    [35, 'PASS']
  ]);
});

test('Q01 a missing API level keeps the overall verdict NOT_TESTED', async () => {
  const { parseAndroidEvidenceLog } = await import(MODULE);

  const report = parseAndroidEvidenceLog(passCase(30), { expectedSha: HEAD_SHA });
  const api35 = report.apiLevels.find((entry) => entry.apiLevel === 35);

  assert.equal(report.overall, 'NOT_TESTED');
  assert.equal(api35.outcome, 'NOT_TESTED');
  assert.ok(api35.reasons.includes('no_observations'));
  assert.ok(report.reasons.includes('api35:no_observations'));
});

test('Q01 structured job report inherits headSha and keeps nested case outcomes', async () => {
  const { parseAndroidEvidenceLog } = await import(MODULE);

  const reportJson = jsonLine({
    headSha: HEAD_SHA,
    source: 'actual disposable Android emulator + CDP + ADB',
    apiLevel: 35,
    cases: [
      { name: 'preflight', status: 'PASS', detail: 'webview ready' },
      { name: 'startup_restart', status: 'PASS', detail: 'pid stable' }
    ],
    summary: { pass: 2, fail: 0, notTested: 0 },
    releaseApproved: false
  });

  const report = parseAndroidEvidenceLog(reportJson, {
    expectedSha: HEAD_SHA,
    apiLevels: [35]
  });

  assert.equal(report.overall, 'PASS');
  assert.equal(report.observations.length, 2);
  assert.equal(report.expectedSha, HEAD_SHA);
  assert.equal(report.observedShas[0], HEAD_SHA);
});

test('Q01 short or missing expected SHA can never promote a passing log to PASS', async () => {
  const { normalizeSha, isExactSha, parseAndroidEvidenceLog } = await import(MODULE);

  assert.equal(normalizeSha(' ' + HEAD_SHA.toUpperCase() + ' '), HEAD_SHA);
  assert.equal(normalizeSha('3bacd9f'), null);
  assert.equal(normalizeSha(null), null);
  assert.equal(isExactSha(HEAD_SHA), true);
  assert.equal(isExactSha('3bacd9f'), false);

  const shortExpected = parseAndroidEvidenceLog([passCase(30), passCase(35)].join('\n'), {
    expectedSha: '3bacd9f'
  });
  assert.equal(shortExpected.overall, 'NOT_TESTED');
  assert.ok(shortExpected.reasons.includes('invalid_expected_sha'));

  const noExpectedOrObserved = parseAndroidEvidenceLog([passCase(30, null), passCase(35, null)].join('\n'));
  assert.equal(noExpectedOrObserved.overall, 'NOT_TESTED');
  assert.equal(noExpectedOrObserved.exactSha, false);
});

test('Q01 failure classifier names the infrastructure family and never invents APP_DEFECT', async () => {
  const { classifyFailure, CLASSIFICATIONS } = await import(MODULE);

  assert.deepEqual(Object.values(CLASSIFICATIONS).sort(), [
    'ADB_INFRA',
    'APP_DEFECT',
    'CDP_INFRA',
    'NOT_TESTED',
    'UIAUTOMATOR_INFRA'
  ]);

  assert.equal(classifyFailure('TRANSPORT: ADB command failed or timed out').classification, 'ADB_INFRA');
  assert.equal(classifyFailure('QA INFRA BLOCKER: no connected emulator in adb devices').classification, 'ADB_INFRA');
  assert.equal(classifyFailure('TRANSPORT: no Android asset WebView CDP target').classification, 'CDP_INFRA');
  assert.equal(classifyFailure('TRANSPORT: Runtime.evaluate timeout').classification, 'CDP_INFRA');
  assert.equal(classifyFailure('TRANSPORT: branded native confirmation not observable').classification, 'UIAUTOMATOR_INFRA');
  assert.equal(classifyFailure('uiautomator dump failed').classification, 'UIAUTOMATOR_INFRA');
  assert.equal(classifyFailure('DEPENDENCY_NOT_TESTED: no active focus session').classification, 'NOT_TESTED');
  assert.equal(classifyFailure('unrelated harness message'), null);

  const app = classifyFailure('AssertionError: expected timer to resume');
  assert.equal(app, null);
});

test('Q01 malformed input is deterministic NOT_TESTED without throwing', async () => {
  const { parseAndroidEvidenceLog } = await import(MODULE);

  for (const input of [null, undefined, 42, [], {}, '']) {
    const report = parseAndroidEvidenceLog(input, { expectedSha: HEAD_SHA });
    assert.equal(report.overall, 'NOT_TESTED');
    assert.equal(report.ok, false);
    assert.equal(report.releaseApproved, false);
    assert.equal(report.counts.appDefect, 0);
  }

  const withBadJson = parseAndroidEvidenceLog('{not json}\nQA INFRA BLOCKER: adb devices timed out', {
    expectedSha: HEAD_SHA
  });
  assert.equal(withBadJson.overall, 'NOT_TESTED');
  assert.ok(withBadJson.infrastructure.some((event) => event.classification === 'ADB_INFRA'));
});

test('Q01 parser is pure, offline, deterministic and does not rewrite v21 data', async () => {
  const { parseAndroidEvidenceLog } = await import(MODULE);
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
    'zen_fortress_cfg_v21',
    'writeFile'
  ]) {
    assert.ok(!source.includes(forbidden), 'parser must not contain ' + forbidden);
  }

  const log = [passCase(30), passCase(35)].join('\n');
  const first = parseAndroidEvidenceLog(log, { expectedSha: HEAD_SHA });
  const second = parseAndroidEvidenceLog(log, { expectedSha: HEAD_SHA });

  assert.deepEqual(first, second);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.apiLevels), true);
  assert.equal(first.releaseApproved, false);
});
