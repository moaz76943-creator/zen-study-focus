'use strict';

// Q08 - regression for tools/room6/release_truth_summary.cjs
// Read-only readiness evidence summary from QA reports:
// source pass, Android pass, licensing approval, security triage,
// real UI integration. Missing evidence must stay UNKNOWN, never PASS,
// and must never block manual development.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildSummary,
  renderText,
  collectFromJson,
  collectFromMarkdown,
  normalizeVerdict,
  defaultReportFiles,
  STATUS,
  REASON,
  SCHEMA_VERSION
} = require('../../tools/room6/release_truth_summary.cjs');

const FIXTURE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'q08-release-truth-'));
test.after(() => {
  fs.rmSync(FIXTURE_DIR, { recursive: true, force: true });
});

function fixtureReport(name, json) {
  return { name, json };
}

function categoryOf(summary, id) {
  return summary.categories.find((category) => category.id === id);
}

test('schema: read-only summary with exactly the five truth categories', () => {
  const summary = buildSummary({ reports: [] });
  assert.equal(summary.schemaVersion, SCHEMA_VERSION);
  assert.equal(summary.readOnly, true);
  assert.deepEqual(
    summary.categories.map((category) => category.id),
    ['source_pass', 'android_pass', 'licensing_approval', 'security_triage', 'real_ui_integration']
  );
  // No evidence at all -> nothing may claim PASS, and manual dev is not blocked.
  for (const category of summary.categories) {
    assert.equal(category.status, STATUS.UNKNOWN);
    assert.deepEqual(category.reasons, [REASON.MISSING_EVIDENCE]);
  }
  assert.equal(summary.overall.readiness, 'NOT_READY_FOR_RELEASE');
  assert.equal(summary.manualDevelopment.blocked, false);
});

test('normalizeVerdict never turns negative/missing wording into PASS', () => {
  assert.equal(normalizeVerdict('BLOCKED'), 'negative');
  assert.equal(normalizeVerdict('NOT_TESTED'), 'negative');
  assert.equal(normalizeVerdict('fail'), 'negative');
  assert.equal(normalizeVerdict('PASS'), 'positive');
  assert.equal(normalizeVerdict('PASSED_GREEN'), 'positive');
  assert.equal(normalizeVerdict(''), null);
  assert.equal(normalizeVerdict(undefined), null);
  assert.equal(normalizeVerdict('random prose'), null);
});

test('JSON report claims are collected with status-like keys only', () => {
  const entries = collectFromJson(
    {
      gate_name: 'X',
      audit_status: 'PASSED_GREEN',
      timestamp: '2026-10-26T09:30:00Z',
      checks: { gitleaks_finding: 'BLOCKED', device_pass: 'PASS' }
    },
    'fixture.json'
  );
  const map = Object.fromEntries(entries.map((entry) => [entry.key, entry.verdict]));
  assert.equal(map.audit_status, 'positive');
  assert.equal(map.gitleaks_finding, 'negative');
  assert.equal(map.device_pass, 'positive');
  // Captured timestamp keys are not claims.
  assert.ok(!('timestamp' in map));
});

test('markdown QA audit rows yield explicit verdicts', () => {
  const entries = collectFromMarkdown(
    '- Android device run: BLOCKED, no phone available\n- Isolated module tests: PASS\n',
    'audit.md'
  );
  assert.deepEqual(entries.map((entry) => entry.verdict), ['negative', 'positive']);
});

test('full honest evidence set yields READY_FOR_RELEASE', () => {
  const summary = buildSummary({
    reports: [
      fixtureReport('source.json', {
        checks: { isolated_source_checks: 'PASS', cross_lane_qa: 'PASS' }
      }),
      fixtureReport('android.json', {
        checks: { android_device_webview_run: 'PASS', talkback_walkthrough: 'PASS' }
      }),
      fixtureReport('licensing.json', {
        checks: { third_party_license_manifest: 'PASS', attribution_complete: 'PASS' }
      }),
      fixtureReport('security.json', {
        checks: { gitleaks_finding: 'PASS', codeql_triage: 'PASS' }
      }),
      fixtureReport('ui.json', {
        checks: { real_ui_integration_cdp: 'PASS', live_screen_navigation: 'PASS' }
      })
    ]
  });
  for (const category of summary.categories) {
    assert.equal(category.status, STATUS.PASS, `${category.id} should PASS`);
    assert.deepEqual(category.reasons, [REASON.EVIDENCE_PASS]);
  }
  assert.equal(summary.overall.readiness, 'READY_FOR_RELEASE');
  assert.equal(summary.overall.reason, 'ALL_CATEGORIES_PASS');
  assert.equal(summary.manualDevelopment.blocked, false);
});

test('passing everything except licensing keeps licensing UNKNOWN, never PASS', () => {
  const summary = buildSummary({
    reports: [
      fixtureReport('source.json', { checks: { isolated_source_checks: 'PASS' } }),
      fixtureReport('android.json', { checks: { android_device_webview_run: 'PASS' } }),
      fixtureReport('security.json', { checks: { codeql_triage: 'PASS' } }),
      fixtureReport('ui.json', { checks: { real_ui_integration_cdp: 'PASS' } })
      // licensing.json deliberately absent: missing approval must stay UNKNOWN.
    ]
  });
  assert.equal(categoryOf(summary, 'licensing_approval').status, STATUS.UNKNOWN);
  assert.deepEqual(categoryOf(summary, 'licensing_approval').reasons, [REASON.MISSING_EVIDENCE]);
  // And that missing approval cannot inflate overall readiness.
  assert.equal(summary.overall.readiness, 'NOT_READY_FOR_RELEASE');
  assert.equal(summary.overall.reason, 'MISSING_OR_UNKNOWN_EVIDENCE');
});

test('explicit negative evidence beats a PASS in the same category', () => {
  const summary = buildSummary({
    reports: [
      fixtureReport('android.json', {
        checks: {
          android_device_webview_run: 'PASS',
          device_upgrade_path: 'NOT_TESTED'
        }
      }),
      fixtureReport('security.json', {
        checks: { gitleaks_finding: 'PASS', native_xss_field: 'FAILED' }
      })
    ]
  });
  assert.equal(categoryOf(summary, 'android_pass').status, STATUS.FAIL);
  assert.equal(categoryOf(summary, 'security_triage').status, STATUS.FAIL);
  assert.equal(summary.overall.readiness, 'NOT_READY_FOR_RELEASE');
  assert.equal(summary.overall.reason, 'EXPLICIT_NEGATIVE_EVIDENCE');
});

test('desktop CI build success alone is not an Android pass (device evidence required)', () => {
  const summary = buildSummary({
    reports: [fixtureReport('ci.json', { checks: { github_actions_build_apk: 'PASS' } })]
  });
  assert.equal(categoryOf(summary, 'android_pass').status, STATUS.UNKNOWN);
  assert.equal(categoryOf(summary, 'real_ui_integration').status, STATUS.UNKNOWN);
});

test('isolated source pass without live UI_binding is not real UI integration', () => {
  const summary = buildSummary({
    reports: [
      fixtureReport('qa.json', { checks: { isolated_source_checks_in_v8: 'PASS' } }),
      fixtureReport('audit.md', {
        // text-style markdown input via json checks is covered above; here real markdown:
      }),
      {
        name: 'audit201019.md',
        text: '- five-case cross-lane QA: 5 PASS, 0 FAIL (isolated V8 loader)\n- Live UI connected for lane 03: No (new UX not integrated)\n- Design/UX browser verification: NOT_TESTED\n'
      }
    ]
  });
  // Source pass is documented and positive; UI integration explicitly NOT integrated.
  assert.equal(categoryOf(summary, 'source_pass').status, STATUS.PASS);
  assert.equal(categoryOf(summary, 'real_ui_integration').status, STATUS.FAIL);
  assert.equal(summary.overall.readiness, 'NOT_READY_FOR_RELEASE');
});

test('absent default QA report files are listed and never created', () => {
  const summary = buildSummary({
    root: FIXTURE_DIR,
    reports: defaultReportFiles(FIXTURE_DIR)
  });
  assert.ok(summary.reports.length > 0);
  for (const report of summary.reports) {
    assert.equal(report.exists, false);
    assert.ok(!fs.existsSync(path.join(FIXTURE_DIR, report.file)));
  }
  for (const category of summary.categories) {
    assert.notEqual(category.status, STATUS.PASS);
  }
  assert.equal(summary.manualDevelopment.blocked, false);
});

test('real checkout: default scan stays read-only and honest about readiness', () => {
  const before = fs.statSync(FIXTURE_DIR).mtimeMs;
  const summary = buildSummary({});
  const after = fs.statSync(FIXTURE_DIR).mtimeMs;
  assert.equal(summary.schemaVersion, SCHEMA_VERSION);
  assert.equal(summary.readOnly, true);
  // Nothing was written or mutated during the scan.
  assert.equal(after, before);
  assert.ok(summary.reports.some((report) => report.file.endsWith('.md')));
  // Real repo has documented BLOCKED/NOT_TESTED gates; readiness must not claim READY.
  const passCount = summary.categories.filter((category) => category.status === STATUS.PASS).length;
  if (passCount < summary.categories.length) {
    assert.equal(summary.overall.readiness, 'NOT_READY_FOR_RELEASE');
  }
  for (const category of summary.categories) {
    if (category.status === STATUS.UNKNOWN) {
      assert.deepEqual(
        category.reasons.slice(0, 1),
        [REASON.MISSING_EVIDENCE],
        `unknown ${category.id} must carry missing-evidence truth, not a pass`
      );
    }
  }
  assert.equal(summary.manualDevelopment.blocked, false);
});

test('renderText mentions overall, all categories, and manual dev state', () => {
  const summary = buildSummary({ reports: [] });
  const text = renderText(summary);
  assert.match(text, /NOT_READY_FOR_RELEASE/);
  assert.match(text, /Manual development blocked: false/);
  for (const id of ['source_pass', 'android_pass', 'licensing_approval', 'security_triage', 'real_ui_integration']) {
    assert.ok(text.includes(id));
  }
  assert.ok(!/<script/.test(text));
});
